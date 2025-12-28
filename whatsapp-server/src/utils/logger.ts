import pino from "pino"
import { env } from "../config/env.js"

export const logger = pino({
  level: env.logLevel,
  transport: env.isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname"
        }
      }
    : undefined
})

export function createLogger(name: string) {
  return logger.child({ name })
}
