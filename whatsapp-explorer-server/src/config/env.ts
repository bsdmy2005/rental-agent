import dotenv from "dotenv"

// Load .env file and override any existing environment variables
// This ensures .env file takes precedence over system environment variables
dotenv.config({ override: true })

export const env = {
  // Server
  port: parseInt(process.env.WHATSAPP_EXPLORER_SERVER_PORT || "3002", 10),
  apiKey: process.env.WHATSAPP_EXPLORER_SERVER_API_KEY || "",

  // Database
  databaseUrl: process.env.DATABASE_URL || "",

  // Next.js App
  nextjsAppUrl: process.env.NEXTJS_APP_URL || "http://localhost:3000",

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4",

  // Logging
  logLevel: process.env.LOG_LEVEL || "info", // Set to "debug" for even more detailed logging

  // Baileys Configuration
  baileysTimeoutMs: parseInt(process.env.BAILEYS_TIMEOUT_MS || "90000", 10), // 90 seconds default
  messageRetryAttempts: parseInt(process.env.MESSAGE_RETRY_ATTEMPTS || "3", 10),
  messageRetryDelayMs: parseInt(process.env.MESSAGE_RETRY_DELAY_MS || "1000", 10),

  // Phone Number Configuration
  phoneCountryCode: process.env.PHONE_COUNTRY_CODE || "27", // Default: South Africa (27)

  // Service Type Configuration
  serviceType: "explorer", // Always "explorer" for this server

  // Feature flags
  isDevelopment: process.env.NODE_ENV !== "production"
}

export function validateEnv(): void {
  const required = ["WHATSAPP_EXPLORER_SERVER_API_KEY", "DATABASE_URL"]
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }
}

