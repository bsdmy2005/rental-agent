import { Router, Request, Response } from "express"
import sessionsRouter from "./sessions.js"
import messagesRouter from "./messages.js"

const router = Router()

// Health check
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "whatsapp-baileys-server"
  })
})

// Session routes
router.use("/sessions", sessionsRouter)

// Message routes (mounted under sessions for consistency)
router.use("/sessions", messagesRouter)

// Note: AI routes removed - AI functionality is only available in the explorer server

export default router
