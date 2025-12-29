import { Router, Request, Response, NextFunction } from "express"
import { ConnectionManager } from "../baileys/connection-manager.js"
import { createLogger } from "../utils/logger.js"

const logger = createLogger("routes/sessions")
const router = Router()

// Get session status
router.get("/:sessionId/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params
    const manager = ConnectionManager.getInstance()
    const status = await manager.getSessionStatus(sessionId)

    res.json({
      sessionId,
      ...status
    })
  } catch (error) {
    next(error)
  }
})

// Connect session
router.post("/:sessionId/connect", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params
    const manager = ConnectionManager.getInstance()

    logger.info({ sessionId }, "Connect request received")
    // Explorer server accepts all sessions (no filtering)
    await manager.connect(sessionId)

    res.json({
      success: true,
      message: "Connection initiated. Check status for QR code.",
      sessionId
    })
  } catch (error) {
    next(error)
  }
})

// Disconnect session
router.post("/:sessionId/disconnect", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params
    const manager = ConnectionManager.getInstance()

    logger.info({ sessionId }, "Disconnect request received")
    await manager.disconnect(sessionId)

    res.json({
      success: true,
      message: "Disconnected",
      sessionId
    })
  } catch (error) {
    next(error)
  }
})

// Logout session (clears auth state)
router.post("/:sessionId/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params
    const manager = ConnectionManager.getInstance()

    logger.info({ sessionId }, "Logout request received")
    await manager.logout(sessionId)

    res.json({
      success: true,
      message: "Logged out and auth state cleared",
      sessionId
    })
  } catch (error) {
    next(error)
  }
})

export default router
