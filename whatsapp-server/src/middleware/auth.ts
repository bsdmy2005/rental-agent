import type { Request, Response, NextFunction } from "express"
import { env } from "../config/env.js"
import { createLogger } from "../utils/logger.js"

const logger = createLogger("auth")

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers["x-api-key"] as string | undefined

  if (!apiKey) {
    logger.warn("Request without API key")
    res.status(401).json({ error: "API key required" })
    return
  }

  if (apiKey !== env.apiKey) {
    logger.warn("Invalid API key provided")
    res.status(403).json({ error: "Invalid API key" })
    return
  }

  next()
}
