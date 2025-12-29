import type { Request, Response, NextFunction } from "express"
import { createLogger } from "../utils/logger.js"

const logger = createLogger("error-handler")

export interface ApiError extends Error {
  statusCode?: number
  code?: string
  output?: {
    statusCode?: number
    payload?: {
      message?: string
    }
  }
  isBoom?: boolean
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Boom errors (used by Baileys)
  let statusCode = 500
  let message = "Internal server error"

  if (err.isBoom && err.output) {
    statusCode = err.output.statusCode || 500
    message = err.output.payload?.message || err.message || "Internal server error"
  } else {
    statusCode = err.statusCode || 500
    message = err.message || "Internal server error"
  }

  logger.error({ err, path: req.path, method: req.method }, "Request error")

  res.status(statusCode).json({
    error: message,
    code: err.code,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  })
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "Not found",
    path: req.path
  })
}
