import { Router, Request, Response, NextFunction } from "express"
import { ConnectionManager } from "../baileys/connection-manager.js"
import { createLogger } from "../utils/logger.js"

const logger = createLogger("routes/messages")
const router = Router()

// Get messages
router.get("/:sessionId/messages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    const manager = ConnectionManager.getInstance()
    const messageHandler = manager.getMessageHandler()
    const messages = await messageHandler.getMessages(sessionId, limit, offset)

    res.json({
      sessionId,
      messages,
      pagination: {
        limit,
        offset,
        count: messages.length
      }
    })
  } catch (error) {
    next(error)
  }
})

// Send message
router.post("/:sessionId/messages", async (req: Request, res: Response, next: NextFunction) => {
  const requestStartTime = Date.now()
  
  try {
    const { sessionId } = req.params
    const { recipient, content } = req.body

    logger.info(
      {
        sessionId,
        recipient,
        contentLength: content?.length,
        contentPreview: content ? (content.length > 100 ? content.substring(0, 100) + "..." : content) : null,
        requestId: req.headers["x-request-id"] || "unknown",
        userAgent: req.headers["user-agent"]
      },
      "API REQUEST RECEIVED - Send message request from external app"
    )

    if (!recipient) {
      logger.warn({ sessionId, recipient, reason: "recipient missing" }, "Send message request validation FAILED")
      res.status(400).json({ error: "Recipient is required" })
      return
    }

    if (!content) {
      logger.warn({ sessionId, recipient, reason: "content missing" }, "Send message request validation FAILED")
      res.status(400).json({ error: "Content is required" })
      return
    }

    const manager = ConnectionManager.getInstance()

    // Check if connected
    logger.debug({ sessionId, recipient }, "Checking session connection status")
    const status = await manager.getSessionStatus(sessionId)
    
    logger.debug(
      {
        sessionId,
        recipient,
        connectionStatus: status.connectionStatus,
        phoneNumber: status.phoneNumber,
        hasLastError: !!status.lastError
      },
      "Session connection status retrieved"
    )

    if (status.connectionStatus !== "connected") {
      logger.warn(
        {
          sessionId,
          recipient,
          connectionStatus: status.connectionStatus,
          phoneNumber: status.phoneNumber
        },
        "Send message request FAILED - Session not connected"
      )
      res.status(400).json({
        error: "Not connected",
        connectionStatus: status.connectionStatus
      })
      return
    }

    logger.info(
      {
        sessionId,
        recipient,
        contentLength: content.length,
        connectionStatus: status.connectionStatus,
        phoneNumber: status.phoneNumber
      },
      "Send message request validated - forwarding to ConnectionManager"
    )

    const sendStartTime = Date.now()
    const result = await manager.sendMessage(sessionId, recipient, content)
    const sendDuration = Date.now() - sendStartTime
    const totalDuration = Date.now() - requestStartTime

    logger.info(
      {
        sessionId,
        recipient,
        messageId: result.messageId,
        timestamp: result.timestamp.toISOString(),
        sendDuration,
        totalDuration,
        success: true
      },
      "API REQUEST COMPLETED - Message sent successfully"
    )

    res.json({
      success: true,
      messageId: result.messageId,
      timestamp: result.timestamp,
      recipient,
      content
    })
  } catch (error) {
    const totalDuration = Date.now() - requestStartTime
    logger.error(
      {
        error,
        sessionId: req.params.sessionId,
        recipient: req.body?.recipient,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        totalDuration,
        success: false
      },
      "API REQUEST FAILED - Error sending message"
    )
    next(error)
  }
})

export default router
