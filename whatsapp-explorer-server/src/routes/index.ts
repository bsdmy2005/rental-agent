import { Router, Request, Response } from "express"
import sessionsRouter from "./sessions.js"
import messagesRouter from "./messages.js"
import aiRouter from "./ai.js"

const router = Router()

// Health check
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "whatsapp-explorer-server"
  })
})

// Session routes
router.use("/sessions", sessionsRouter)

// Message routes (mounted under sessions for consistency)
router.use("/sessions", messagesRouter)

// AI routes (mounted under sessions for consistency)
router.use("/sessions", aiRouter)

export default router
