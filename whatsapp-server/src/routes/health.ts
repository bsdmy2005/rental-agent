import { Router, Request, Response, NextFunction } from "express"
import { ConnectionManager } from "../baileys/connection-manager.js"
import { Pool } from "pg"
import { env } from "../config/env.js"
import { createLogger } from "../utils/logger.js"

const logger = createLogger("routes/health")

// Lightweight health router (no auth required)
export const lightRouter = Router()

// Deep health router (requires auth - should be mounted after auth middleware)
export const deepRouter = Router()

// Track server start time for uptime calculation
const serverStartTime = Date.now()

// Export for uptime calculation in other modules if needed
export function getServerUptime(): number {
  return Math.floor((Date.now() - serverStartTime) / 1000)
}

/**
 * Lightweight health check - no auth required
 * Used for frequent polling (every 30s)
 */
lightRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const manager = ConnectionManager.getInstance()
    const sessions = manager.getAllSessionsStatus()

    const connected = sessions.filter(s => s.connectionStatus === "connected").length
    const connecting = sessions.filter(s => s.connectionStatus === "connecting" || s.connectionStatus === "qr_pending").length
    const disconnected = sessions.filter(s => s.connectionStatus === "disconnected" || s.connectionStatus === "logged_out").length

    // Determine overall status
    let status: "ok" | "degraded" | "error" = "ok"
    if (disconnected > 0 && connected === 0) {
      status = "error"
    } else if (disconnected > 0 || connecting > 0) {
      status = "degraded"
    }

    res.json({
      status,
      timestamp: new Date().toISOString(),
      uptime: getServerUptime(),
      sessions: {
        total: sessions.length,
        connected,
        connecting,
        disconnected
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Deep health check - requires auth
 * Used for less frequent polling (every 5min)
 */
deepRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const pool = new Pool({ connectionString: env.databaseUrl })

  try {
    const manager = ConnectionManager.getInstance()

    // Test database connection
    const dbStart = Date.now()
    let dbConnected = false
    let dbLatency = 0
    try {
      await pool.query("SELECT 1")
      dbConnected = true
      dbLatency = Date.now() - dbStart
    } catch (err) {
      logger.error({ err }, "Database health check failed")
    }

    // Get detailed session info
    const sessions = manager.getAllSessionsStatus()

    // Get last message timestamps from database
    const sessionIds = sessions.map(s => s.sessionId)
    let lastMessageMap = new Map<string, Date | null>()

    if (sessionIds.length > 0) {
      try {
        const result = await pool.query(`
          SELECT session_id, MAX(timestamp) as last_message_at
          FROM whatsapp_explorer_messages
          WHERE session_id = ANY($1)
          GROUP BY session_id
        `, [sessionIds])

        for (const row of result.rows) {
          lastMessageMap.set(row.session_id, row.last_message_at)
        }
      } catch (err) {
        logger.warn({ err }, "Failed to get last message timestamps")
      }
    }

    // Determine overall status
    let status: "ok" | "degraded" | "error" = "ok"
    if (!dbConnected) {
      status = "error"
    } else {
      const disconnected = sessions.filter(s =>
        s.connectionStatus === "disconnected" || s.connectionStatus === "logged_out"
      ).length
      const connected = sessions.filter(s => s.connectionStatus === "connected").length

      if (disconnected > 0 && connected === 0) {
        status = "error"
      } else if (disconnected > 0) {
        status = "degraded"
      }
    }

    res.json({
      status,
      timestamp: new Date().toISOString(),
      uptime: getServerUptime(),
      database: {
        connected: dbConnected,
        latencyMs: dbLatency
      },
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        phoneNumber: s.phoneNumber,
        connectionStatus: s.connectionStatus,
        lastConnectedAt: s.lastConnectedAt,
        lastMessageAt: lastMessageMap.get(s.sessionId) || null,
        socketAlive: s.socketAlive
      }))
    })
  } catch (error) {
    next(error)
  } finally {
    await pool.end()
  }
})
