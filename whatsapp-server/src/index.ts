import express from "express"
import cors from "cors"
import { env, validateEnv } from "./config/env.js"
import { createLogger } from "./utils/logger.js"
import { apiKeyAuth } from "./middleware/auth.js"
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js"
import routes from "./routes/index.js"
import { lightRouter as healthLightRouter, deepRouter as healthDeepRouter } from "./routes/health.js"
import { ConnectionManager } from "./baileys/connection-manager.js"

const logger = createLogger("server")

// Validate environment variables
try {
  validateEnv()
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error))
  logger.error({ err }, "Environment validation failed")
  console.error(err.message)
  process.exit(1)
}

const app = express()

// CORS configuration
app.use(
  cors({
    origin: env.nextjsAppUrl,
    credentials: true
  })
)

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req, res, next) => {
  const start = Date.now()
  res.on("finish", () => {
    const duration = Date.now() - start
    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`
      },
      "Request completed"
    )
  })
  next()
})

// Lightweight health check (no auth required) - must be before apiKeyAuth middleware
app.use("/health", healthLightRouter)

// API key authentication for all other routes
app.use(apiKeyAuth)

// Deep health check (requires auth) - must be after apiKeyAuth middleware
app.use("/health/deep", healthDeepRouter)

// API routes
app.use(routes)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down...")

  const manager = ConnectionManager.getInstance()

  // Update all sessions to disconnected in database before closing
  try {
    await manager.updateAllSessionsToDisconnected()
  } catch (error) {
    logger.error({ error }, "Failed to update session statuses during shutdown")
  }

  await manager.close()
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)

// Start server
app.listen(env.port, async () => {
  logger.info({ port: env.port }, "WhatsApp Baileys Server started")
  logger.info({ nextjsAppUrl: env.nextjsAppUrl }, "CORS configured for")

  // Auto-connect primary sessions after server starts
  try {
    const manager = ConnectionManager.getInstance()
    const result = await manager.autoConnectPrimarySessions()
    logger.info(
      { attempted: result.attempted, connected: result.connected, failed: result.failed.length },
      "Auto-connect complete"
    )
  } catch (error) {
    logger.error({ error }, "Auto-connect failed")
  }
})
