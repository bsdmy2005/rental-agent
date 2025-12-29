import { Router } from "express"
import sessionsRouter from "./sessions.js"
import messagesRouter from "./messages.js"

const router = Router()

// Note: Health routes are mounted directly in index.ts before auth middleware
// to allow lightweight health checks without authentication

// Session routes
router.use("/sessions", sessionsRouter)

// Message routes (mounted under sessions for consistency)
router.use("/sessions", messagesRouter)

// Note: AI routes removed - AI functionality is only available in the explorer server

export default router
