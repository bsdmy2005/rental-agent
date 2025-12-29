import type { WASocket, WAMessage } from "@whiskeysockets/baileys"
import { Pool } from "pg"
import { createLogger } from "../utils/logger.js"
import type { StoredMessage } from "./types.js"
import { AiResponder } from "../services/ai-responder.js"
import { env } from "../config/env.js"
import { normalizePhoneNumber } from "../utils/phone-number.js"

const logger = createLogger("message-handler")

export class MessageHandler {
  private pool: Pool
  private aiResponder: AiResponder

  constructor(pool: Pool) {
    this.pool = pool
    this.aiResponder = new AiResponder()
  }

  async sendTextMessage(
    sessionId: string,
    socket: WASocket,
    recipient: string,
    content: string,
    retryAttempts: number = env.messageRetryAttempts,
    retryDelayMs: number = env.messageRetryDelayMs
  ): Promise<{ messageId: string; timestamp: Date }> {
    const startTime = Date.now()
    
    let normalizedRecipient: string
    let jid: string
    
    if (recipient.includes("@")) {
      jid = recipient
      normalizedRecipient = recipient.split("@")[0]
    } else {
      try {
        normalizedRecipient = normalizePhoneNumber(recipient, env.phoneCountryCode)
        jid = `${normalizedRecipient}@s.whatsapp.net`
        logger.debug(
          {
            sessionId,
            originalRecipient: recipient,
            normalizedRecipient,
            jid,
            countryCode: env.phoneCountryCode,
            wasNormalized: recipient !== normalizedRecipient
          },
          "Phone number normalized"
        )
      } catch (error) {
        logger.error(
          {
            error,
            sessionId,
            recipient,
            errorMessage: error instanceof Error ? error.message : String(error)
          },
          "Failed to normalize phone number"
        )
        throw error
      }
    }

    logger.info(
      {
        sessionId,
        originalRecipient: recipient,
        normalizedRecipient,
        recipient: jid,
        contentLength: content.length,
        contentPreview: content.length > 100 ? content.substring(0, 100) + "..." : content,
        retryAttempts,
        socketUser: socket.user?.id,
        socketAuthenticated: !!socket.user
      },
      "OUTGOING MESSAGE SEND - Starting send attempt"
    )

    let lastError: unknown

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        logger.debug(
          {
            sessionId,
            recipient: jid,
            attempt,
            maxAttempts: retryAttempts,
            socketUser: socket.user?.id,
            socketAuthenticated: !!socket.user
          },
          `Send attempt ${attempt}/${retryAttempts} - Verifying socket authentication`
        )

        if (!socket.user) {
          const error = new Error("Socket is not authenticated")
          logger.error(
            {
              sessionId,
              recipient: jid,
              attempt,
              socketUser: socket.user,
              socketExists: !!socket
            },
            "Socket authentication check FAILED - cannot send message"
          )
          throw error
        }

        logger.debug({ sessionId, recipient: jid, attempt }, `Send attempt ${attempt}/${retryAttempts} - Calling socket.sendMessage`)
        const sendStartTime = Date.now()
        const result = await socket.sendMessage(jid, { text: content })
        const sendDuration = Date.now() - sendStartTime

        logger.info(
          {
            sessionId,
            recipient: jid,
            attempt,
            sendDuration,
            resultMessageId: result?.key?.id,
            resultKey: result?.key
          },
          `Send attempt ${attempt}/${retryAttempts} - socket.sendMessage completed successfully`
        )

        const timestamp = new Date()
        const messageId = result?.key?.id || `sent-${Date.now()}`

        logger.debug({ sessionId, recipient: jid, messageId }, "Storing sent message in database")
        try {
          await this.storeMessage(sessionId, {
            messageId,
            remoteJid: jid,
            fromMe: true,
            messageType: "text",
            content,
            timestamp
          })
          logger.debug({ sessionId, recipient: jid, messageId }, "Sent message stored in database")
        } catch (storeError) {
          logger.error(
            {
              error: storeError,
              sessionId,
              recipient: jid,
              messageId,
              errorMessage: storeError instanceof Error ? storeError.message : String(storeError)
            },
            "Failed to store sent message in database (message was sent successfully)"
          )
        }

        const totalDuration = Date.now() - startTime
        logger.info(
          {
            sessionId,
            recipient: jid,
            messageId,
            attempt,
            totalDuration,
            sendDuration,
            success: true
          },
          "MESSAGE SENT SUCCESSFULLY"
        )

        return {
          messageId,
          timestamp
        }
      } catch (error) {
        lastError = error
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined

        const isTimeout = errorMessage.includes("Timed Out") ||
                         errorMessage.includes("timeout") ||
                         (error as any)?.output?.statusCode === 408

        const isSyncError = errorStack?.includes("getUSyncDevices") ||
                           errorStack?.includes("executeUSyncQuery") ||
                           errorMessage.includes("usync")

        const errorDetails = {
          error,
          sessionId,
          recipient: jid,
          errorMessage,
          errorType: error?.constructor?.name,
          errorStack,
          attempt,
          maxAttempts: retryAttempts,
          isTimeout,
          isSyncError,
          socketUser: socket.user?.id,
          socketAuthenticated: !!socket.user,
          duration: Date.now() - startTime
        }

        logger.warn(
          errorDetails,
          `Send attempt ${attempt}/${retryAttempts} FAILED${isSyncError ? " (device sync timeout)" : ""}`
        )

        if (attempt < retryAttempts && isTimeout) {
          const baseDelay = retryDelayMs * Math.pow(2, attempt - 1)
          const delay = isSyncError ? baseDelay * 2 : baseDelay

          logger.info(
            {
              sessionId,
              recipient: jid,
              delay,
              nextAttempt: attempt + 1,
              isSyncError,
              reason: isSyncError
                ? "Device sync timeout - will retry with extended backoff"
                : "Timeout error - will retry with exponential backoff"
            },
            `Retrying message send after ${delay}ms delay`
          )

          if (isSyncError && attempt >= 2) {
            try {
              logger.debug({ sessionId }, "Attempting to refresh connection with presence update")
              await socket.sendPresenceUpdate("available")
              await new Promise(resolve => setTimeout(resolve, 1000))
            } catch (presenceError) {
              logger.warn(
                {
                  sessionId,
                  error: presenceError instanceof Error ? presenceError.message : String(presenceError)
                },
                "Failed to send presence update during retry"
              )
            }
          }

          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        if (!isTimeout || attempt === retryAttempts) {
          const totalDuration = Date.now() - startTime
          logger.error(
            {
              ...errorDetails,
              totalDuration,
              finalAttempt: attempt === retryAttempts,
              reason: !isTimeout ? "Non-timeout error, not retrying" : "All retry attempts exhausted"
            },
            "MESSAGE SEND FAILED - All attempts exhausted or non-retryable error"
          )
          throw error
        }
      }
    }

    const totalDuration = Date.now() - startTime
    logger.error(
      {
        sessionId,
        recipient: jid,
        totalDuration,
        lastError: lastError instanceof Error ? lastError.message : String(lastError)
      },
      "MESSAGE SEND FAILED - Unexpected code path"
    )
    throw lastError || new Error("Failed to send message after all retry attempts")
  }

  async handleIncomingMessage(
    sessionId: string,
    msg: WAMessage,
    socket: WASocket
  ): Promise<void> {
    const startTime = Date.now()
    const remoteJid = msg.key.remoteJid
    const messageId = msg.key.id || `recv-${Date.now()}`
    const timestamp = new Date(Number(msg.messageTimestamp) * 1000 || Date.now())

    logger.info(
      {
        sessionId,
        messageId,
        remoteJid,
        participant: msg.key.participant,
        fromMe: msg.key.fromMe,
        timestamp: timestamp.toISOString(),
        messageTimestamp: msg.messageTimestamp,
        hasMessage: !!msg.message,
        messageKeys: msg.message ? Object.keys(msg.message) : [],
        messageStructure: msg.message ? JSON.stringify(Object.keys(msg.message)) : "no message object",
        fullMessageKeys: Object.keys(msg).filter(k => k !== "message" && k !== "key")
      },
      "INCOMING MESSAGE RECEIVED - Starting processing"
    )

    if (!remoteJid) {
      logger.warn({ sessionId, messageId, msg: JSON.stringify(msg) }, "Message has no remoteJid - skipping processing")
      return
    }

    try {
      logger.debug({ sessionId, messageId, remoteJid }, "Step 1: Extracting message content")
      const content = this.extractMessageContent(msg)
      const messageType = this.getMessageType(msg)

      logger.info(
        {
          sessionId,
          messageId,
          remoteJid,
          messageType,
          contentLength: content?.length,
          hasContent: !!content,
          contentPreview: content ? (content.length > 100 ? content.substring(0, 100) + "..." : content) : null
        },
        "Message content extracted successfully"
      )

      logger.debug({ sessionId, messageId, remoteJid }, "Step 2: Storing message in database")
      try {
        await this.storeMessage(sessionId, {
          messageId,
          remoteJid,
          fromMe: false,
          messageType,
          content,
          timestamp
        })
        logger.info(
          {
            sessionId,
            messageId,
            remoteJid,
            messageType,
            stored: true
          },
          "Message stored in database successfully"
        )
      } catch (storeError) {
        logger.error(
          {
            error: storeError,
            sessionId,
            messageId,
            remoteJid,
            errorMessage: storeError instanceof Error ? storeError.message : String(storeError),
            errorStack: storeError instanceof Error ? storeError.stack : undefined
          },
          "FAILED to store message in database"
        )
        throw storeError
      }

      // Explorer server: Only handle AI auto-response (no incident/RFQ integration)
      logger.debug({ sessionId, messageId, remoteJid }, "Step 3: Checking AI auto-response configuration")
      const aiConfig = await this.getAiConfig(sessionId)
      
      logger.debug(
        {
          sessionId,
          messageId,
          remoteJid,
          aiEnabled: aiConfig?.enabled,
          hasAiConfig: !!aiConfig,
          hasContent: !!content
        },
        "AI configuration check completed"
      )

      if (aiConfig?.enabled && content) {
        logger.info(
          {
            sessionId,
            messageId,
            remoteJid,
            aiEnabled: true,
            contentLength: content.length
          },
          "AI auto-response enabled - generating response"
        )

        try {
          const aiStartTime = Date.now()
          const aiResponse = await this.aiResponder.generateResponse(
            content,
            aiConfig.systemPrompt,
            aiConfig.model
          )
          const aiDuration = Date.now() - aiStartTime

          if (aiResponse) {
            logger.info(
              {
                sessionId,
                messageId,
                remoteJid,
                aiResponseLength: aiResponse.length,
                aiDuration,
                aiResponsePreview: aiResponse.length > 100 ? aiResponse.substring(0, 100) + "..." : aiResponse
              },
              "AI response generated successfully - sending response"
            )

            try {
              await this.sendTextMessage(sessionId, socket, remoteJid, aiResponse)
              logger.info(
                {
                  sessionId,
                  messageId,
                  remoteJid,
                  aiResponseSent: true
                },
                "AI response sent successfully"
              )
            } catch (sendError) {
              logger.error(
                {
                  error: sendError,
                  sessionId,
                  messageId,
                  remoteJid,
                  errorMessage: sendError instanceof Error ? sendError.message : String(sendError),
                  errorStack: sendError instanceof Error ? sendError.stack : undefined
                },
                "FAILED to send AI response"
              )
            }
          } else {
            logger.warn(
              {
                sessionId,
                messageId,
                remoteJid,
                aiResponseGenerated: false
              },
              "AI response generation returned null/empty - no response sent"
            )
          }
        } catch (error) {
          logger.error(
            {
              error,
              sessionId,
              messageId,
              remoteJid,
              errorMessage: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined
            },
            "FAILED to generate AI response"
          )
        }
      } else {
        logger.debug(
          {
            sessionId,
            messageId,
            remoteJid,
            reason: !aiConfig?.enabled ? "AI disabled" : !content ? "No content" : "Unknown"
          },
          "AI auto-response skipped"
        )
      }

      const processingDuration = Date.now() - startTime
      logger.info(
        {
          sessionId,
          messageId,
          remoteJid,
          messageType,
          processingDuration,
          success: true
        },
        "MESSAGE PROCESSING COMPLETED SUCCESSFULLY"
      )
    } catch (error) {
      const processingDuration = Date.now() - startTime
      logger.error(
        {
          error,
          sessionId,
          messageId,
          remoteJid,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          processingDuration,
          success: false
        },
        "MESSAGE PROCESSING FAILED"
      )
      throw error
    }
  }

  private extractMessageContent(msg: WAMessage): string | null {
    const message = msg.message
    if (!message) {
      if ((msg as any).messageStubType) {
        logger.debug({ messageStubType: (msg as any).messageStubType }, "Protocol/stub message detected - no content to extract")
        return null
      }
      logger.debug({ messageId: msg.key.id }, "Message object is missing - likely a protocol message or receipt")
      return null
    }

    if (message.conversation) {
      return message.conversation
    }
    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text
    }
    
    if (message.imageMessage?.caption) {
      return `[Image] ${message.imageMessage.caption}`
    }
    if (message.videoMessage?.caption) {
      return `[Video] ${message.videoMessage.caption}`
    }
    if (message.documentMessage?.caption) {
      return `[Document] ${message.documentMessage.caption}`
    }
    
    if (message.imageMessage) {
      return "[Image]"
    }
    if (message.videoMessage) {
      return "[Video]"
    }
    if (message.audioMessage) {
      return "[Audio]"
    }
    if (message.documentMessage) {
      return "[Document]"
    }
    if (message.stickerMessage) {
      return "[Sticker]"
    }
    if (message.contactMessage) {
      return `[Contact: ${message.contactMessage.displayName}]`
    }
    if (message.locationMessage) {
      return `[Location: ${message.locationMessage.degreesLatitude}, ${message.locationMessage.degreesLongitude}]`
    }
    
    logger.debug(
      {
        messageKeys: Object.keys(message),
        messageId: msg.key.id,
        remoteJid: msg.key.remoteJid
      },
      "Message has no extractable content - unknown message type"
    )

    return null
  }

  private getMessageType(msg: WAMessage): string {
    const message = msg.message
    if (!message) return "unknown"

    if (message.conversation || message.extendedTextMessage) return "text"
    if (message.imageMessage) return "image"
    if (message.videoMessage) return "video"
    if (message.audioMessage) return "audio"
    if (message.documentMessage) return "document"
    if (message.stickerMessage) return "sticker"
    if (message.contactMessage) return "contact"
    if (message.locationMessage) return "location"

    return "unknown"
  }

  private async storeMessage(
    sessionId: string,
    message: Omit<StoredMessage, "id" | "sessionId" | "mediaUrl" | "status">
  ): Promise<void> {
    try {
      const result = await this.pool.query(
        `INSERT INTO whatsapp_explorer_messages
         (session_id, message_id, remote_jid, from_me, message_type, content, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sessionId,
          message.messageId,
          message.remoteJid,
          message.fromMe,
          message.messageType,
          message.content,
          message.timestamp
        ]
      )
      logger.debug(
        {
          sessionId,
          messageId: message.messageId,
          remoteJid: message.remoteJid,
          rowCount: result.rowCount
        },
        "Message inserted into database"
      )
    } catch (error) {
      logger.error(
        {
          error,
          sessionId,
          messageId: message.messageId,
          remoteJid: message.remoteJid,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorCode: (error as any)?.code,
          errorDetail: (error as any)?.detail
        },
        "Failed to store message in database"
      )
      throw error
    }
  }

  async getMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<StoredMessage[]> {
    const result = await this.pool.query<StoredMessage>(
      `SELECT id, session_id as "sessionId", message_id as "messageId",
              remote_jid as "remoteJid", from_me as "fromMe",
              message_type as "messageType", content, media_url as "mediaUrl",
              status, timestamp
       FROM whatsapp_explorer_messages
       WHERE session_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [sessionId, limit, offset]
    )
    return result.rows
  }

  async getAiConfig(sessionId: string): Promise<{
    enabled: boolean
    systemPrompt: string
    model: string
  } | null> {
    return this.aiResponder.getConfig(sessionId)
  }

  async updateAiConfig(
    sessionId: string,
    config: {
      enabled: boolean
      systemPrompt: string
      model: string
    }
  ): Promise<void> {
    this.aiResponder.setConfig(sessionId, config)
  }

  getAiResponder(): AiResponder {
    return this.aiResponder
  }
}

