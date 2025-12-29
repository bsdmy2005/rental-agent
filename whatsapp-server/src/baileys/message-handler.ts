import type { WASocket, WAMessage } from "@whiskeysockets/baileys"
import { Pool } from "pg"
import { createLogger } from "../utils/logger.js"
import type { StoredMessage } from "./types.js"
import { env } from "../config/env.js"
import { normalizePhoneNumber } from "../utils/phone-number.js"
import { downloadAndUploadMedia } from "../services/media-downloader.js"

const logger = createLogger("message-handler")

export class MessageHandler {
  private pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
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
    
    // Normalize phone number and format JID
    let normalizedRecipient: string
    let jid: string
    
    if (recipient.includes("@")) {
      // Already a JID, use as-is
      jid = recipient
      normalizedRecipient = recipient.split("@")[0]
    } else {
      // Normalize phone number (handles +, 0 prefix, etc.)
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

        // Verify socket is still authenticated before attempting to send
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

        // Store sent message
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
          // Don't throw - message was sent successfully, storage failure is secondary
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

        // Enhanced timeout detection
        const isTimeout = errorMessage.includes("Timed Out") ||
                         errorMessage.includes("timeout") ||
                         (error as any)?.output?.statusCode === 408

        // Detect specific Baileys sync issues
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

        // Don't retry on the last attempt
        if (attempt < retryAttempts && isTimeout) {
          // Exponential backoff with increased delay for sync errors
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

          // For sync errors on 2nd+ attempt, try sending a presence update to reconnect
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

        // If it's not a timeout or it's the last attempt, throw the error
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

    // This should never be reached, but TypeScript needs it
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
        // Log full message structure for debugging unknown message types
        fullMessageKeys: Object.keys(msg).filter(k => k !== "message" && k !== "key")
      },
      "INCOMING MESSAGE RECEIVED - Starting processing"
    )

    if (!remoteJid) {
      logger.warn({ sessionId, messageId, msg: JSON.stringify(msg) }, "Message has no remoteJid - skipping processing")
      return
    }

    try {
      // Extract message content
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

      // Store incoming message
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
        throw storeError // Re-throw to mark as failed
      }

      // Handle media attachments (images, videos, etc.)
      let mediaUrls: Array<{ url: string; type: string; fileName: string }> = []
      const hasMedia = messageType !== "text" && messageType !== "conversation"
      
      logger.debug(
        {
          sessionId,
          messageId,
          remoteJid,
          messageType,
          hasMedia,
          willProcessMedia: hasMedia
        },
        "Step 3a: Checking for media attachments"
      )
      
      if (hasMedia) {
        logger.info({ sessionId, messageId, remoteJid, messageType }, "Step 3a: Processing media attachment")
        try {
          const uploadedMedia = await downloadAndUploadMedia(socket, msg, sessionId)
          if (uploadedMedia) {
            mediaUrls = [{
              url: uploadedMedia.url,
              type: uploadedMedia.type,
              fileName: uploadedMedia.fileName
            }]
            logger.info(
              {
                sessionId,
                messageId,
                remoteJid,
                mediaUrl: uploadedMedia.url,
                fileName: uploadedMedia.fileName,
                fileType: uploadedMedia.type
              },
              "Media downloaded and uploaded successfully"
            )
          } else {
            logger.warn(
              {
                sessionId,
                messageId,
                remoteJid,
                messageType
              },
              "Media download/upload returned null"
            )
          }
        } catch (mediaError) {
          logger.error(
            {
              error: mediaError,
              sessionId,
              messageId,
              remoteJid,
              messageType,
              errorMessage: mediaError instanceof Error ? mediaError.message : String(mediaError)
            },
            "Failed to process media attachment"
          )
          // Continue processing even if media fails
        }
      }

      // Process through conversation state machine (replaces incident-only handling)
      logger.debug({ sessionId, messageId, remoteJid }, "Step 3: Processing through conversation state machine")
      const conversationHandled = await this.processConversation(
        sessionId,
        remoteJid,
        content || "",
        socket,
        hasMedia,
        mediaUrls
      )

      if (conversationHandled) {
        logger.info({ sessionId, messageId, remoteJid }, "Message handled by conversation system")
        return
      }

      // Incident-dispatch server: No AI auto-response functionality
      // Messages are only processed through conversation state machine for incident logging
      logger.debug(
        {
          sessionId,
          messageId,
          remoteJid,
          reason: "Conversation handler did not process message, and AI auto-response is not available on incident-dispatch server"
        },
        "Message processing completed - no further action needed"
      )

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
      // Re-throw to allow caller to handle
      throw error
    }
  }

  private extractMessageContent(msg: WAMessage): string | null {
    const message = msg.message
    if (!message) {
      // Message might be a protocol message, receipt, or other non-content message
      // Check if it's a protocol message that we should ignore
      if ((msg as any).messageStubType) {
        logger.debug({ messageStubType: (msg as any).messageStubType }, "Protocol/stub message detected - no content to extract")
        return null
      }
      // If message object is missing entirely, it's likely not a user message
      logger.debug({ messageId: msg.key.id }, "Message object is missing - likely a protocol message or receipt")
      return null
    }

    // Extract text content
    if (message.conversation) {
      return message.conversation
    }
    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text
    }
    
    // Extract media with captions
    if (message.imageMessage?.caption) {
      return `[Image] ${message.imageMessage.caption}`
    }
    if (message.videoMessage?.caption) {
      return `[Video] ${message.videoMessage.caption}`
    }
    if (message.documentMessage?.caption) {
      return `[Document] ${message.documentMessage.caption}`
    }
    
    // Media without captions
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
    
    // Check for other message types we might have missed
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
      throw error // Re-throw so caller knows storage failed
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

  /**
   * Process message through conversation state machine
   * Replaces the old incident-only detection with a full conversation flow
   * that handles greetings, property identification, incident details, and confirmations
   */
  private async processConversation(
    sessionId: string,
    remoteJid: string,
    content: string,
    socket: WASocket,
    hasMedia: boolean = false,
    mediaUrls: Array<{ url: string; type: string; fileName: string }> = []
  ): Promise<boolean> {
    try {
      // Extract phone number from remoteJid (format: 27...@s.whatsapp.net)
      // Ensure consistent format for decryption
      let phoneNumber = remoteJid.split("@")[0]
      
      // Normalize phone number to ensure consistent format (27... without +)
      // This is critical for decryption and database lookups
      try {
        phoneNumber = normalizePhoneNumber(phoneNumber, env.phoneCountryCode)
      } catch (error) {
        logger.error(
          {
            error,
            sessionId,
            remoteJid,
            originalPhoneNumber: phoneNumber,
            errorMessage: error instanceof Error ? error.message : String(error)
          },
          "Failed to normalize phone number from remoteJid"
        )
        // Continue with original phone number if normalization fails
      }
      
      const nextjsUrl = env.nextjsAppUrl || "http://localhost:3000"
      const apiKey = env.apiKey

      logger.info(
        {
          sessionId,
          remoteJid,
          phoneNumber,
          normalizedPhoneNumber: phoneNumber,
          contentLength: content.length,
          hasMedia,
          mediaCount: mediaUrls.length
        },
        "Processing message through conversation state machine"
      )

      const response = await fetch(`${nextjsUrl}/api/whatsapp/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          phoneNumber,
          messageText: content,
          sessionId,
          hasMedia,
          mediaUrls
        })
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        logger.error(
          {
            sessionId,
            remoteJid,
            phoneNumber,
            status: response.status,
            statusText: response.statusText,
            errorText
          },
          "Failed to call conversation API"
        )
        return false
      }

      const result = await response.json() as {
        success: boolean
        responseMessage?: string
        incidentCreated?: boolean
        incidentId?: string
        referenceNumber?: string
      }

      if (result.success && result.responseMessage) {
        // Ensure remoteJid is in correct format for sending response
        // Format: 27...@s.whatsapp.net
        const responseJid = remoteJid.includes("@") 
          ? remoteJid 
          : `${phoneNumber}@s.whatsapp.net`
        
        await this.sendTextMessage(sessionId, socket, responseJid, result.responseMessage)
        logger.info(
          {
            sessionId,
            remoteJid,
            phoneNumber,
            responseJid,
            incidentCreated: result.incidentCreated,
            incidentId: result.incidentId
          },
          "Conversation response sent"
        )
        return true
      }

      logger.debug(
        {
          sessionId,
          remoteJid,
          phoneNumber,
          resultSuccess: result.success,
          hasResponseMessage: !!result.responseMessage
        },
        "Conversation API returned but no response message to send"
      )
      return false
    } catch (error) {
      logger.error(
        {
          error,
          sessionId,
          remoteJid,
          phoneNumber: remoteJid.split("@")[0],
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        },
        "Error processing conversation"
      )
      return false
    }
  }

  /**
   * Handle incident if message appears to be an incident report
   * @deprecated Use processConversation instead - kept for backwards compatibility
   * Returns true if incident was handled, false otherwise
   */
  private async handleIncidentIfApplicable(
    sessionId: string,
    remoteJid: string,
    content: string | null,
    socket: WASocket
  ): Promise<boolean> {
    if (!content) {
      return false
    }

    try {
      // Extract phone number from remoteJid (format: 27788307321@s.whatsapp.net)
      const phoneNumber = remoteJid.split("@")[0]

      // Check if message looks like an incident report
      // Simple check: contains property code or incident keywords
      const hasPropertyCode = /\bPROP-[A-Z0-9]{6}\b/i.test(content)
      const hasIncidentKeywords = /broken|leak|leaking|damage|issue|problem|repair|fix|maintenance|urgent|emergency/i.test(content)

      if (!hasPropertyCode && !hasIncidentKeywords) {
        return false
      }

      logger.info(
        {
          sessionId,
          remoteJid,
          phoneNumber,
          hasPropertyCode,
          hasIncidentKeywords,
          contentLength: content.length
        },
        "Potential incident report detected - forwarding to Next.js API"
      )

      // Call Next.js API to handle incident
      const nextjsUrl = env.nextjsAppUrl || "http://localhost:3000"
      const apiKey = env.apiKey

      const response = await fetch(`${nextjsUrl}/api/whatsapp/incidents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          messageText: content,
          fromPhoneNumber: phoneNumber,
          sessionId
        })
      })

      if (!response.ok) {
        logger.error(
          {
            sessionId,
            remoteJid,
            status: response.status,
            statusText: response.statusText
          },
          "Failed to call incident API"
        )
        return false
      }

      const result = await response.json() as {
        success: boolean
        shouldRespond?: boolean
        confirmationMessage?: string
        responseMessage?: string
        incidentId?: string
        error?: string
      }

      if (result.success && result.shouldRespond && result.confirmationMessage) {
        // Send confirmation message
        await this.sendTextMessage(sessionId, socket, remoteJid, result.confirmationMessage)
        logger.info(
          {
            sessionId,
            remoteJid,
            incidentId: result.incidentId
          },
          "Incident created and confirmation sent"
        )
        return true
      } else if (result.shouldRespond && result.responseMessage) {
        // Send error/help message
        await this.sendTextMessage(sessionId, socket, remoteJid, result.responseMessage)
        logger.info(
          {
            sessionId,
            remoteJid,
            error: result.error
          },
          "Incident handling failed, sent error message"
        )
        return true
      }

      return false
    } catch (error) {
      logger.error(
        {
          error,
          sessionId,
          remoteJid,
          errorMessage: error instanceof Error ? error.message : String(error)
        },
        "Error handling incident"
      )
      return false
    }
  }

}
