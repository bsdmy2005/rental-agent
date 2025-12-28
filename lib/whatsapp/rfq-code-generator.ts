import { db } from "@/db"
import { quoteRequestsTable } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Generate a unique 6-character alphanumeric code
 * Format: RFQ-XXXXXX where XXXXXX is alphanumeric (uppercase letters and numbers)
 */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Excluding I, O, 0, 1 for clarity
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `RFQ-${code}`
}

/**
 * Check if a code already exists in the database
 */
async function codeExists(code: string): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(quoteRequestsTable)
    .where(eq(quoteRequestsTable.whatsappCode, code))
    .limit(1)

  return !!existing
}

/**
 * Generate a unique RFQ code
 * Retries up to 10 times if code collision occurs
 * This is a server action - must be async
 */
export async function generateRfqCode(): Promise<string> {
  const maxAttempts = 10
  let attempts = 0

  while (attempts < maxAttempts) {
    const code = generateCode()
    const exists = await codeExists(code)

    if (!exists) {
      return code
    }

    attempts++
  }

  throw new Error(
    `Failed to generate unique RFQ code after ${maxAttempts} attempts. Please try again.`
  )
}

/**
 * Validate RFQ code format
 * Pure utility function - no server action needed
 */
export function validateRfqCodeFormat(code: string): boolean {
  const pattern = /^RFQ-[A-Z0-9]{6}$/
  return pattern.test(code)
}

/**
 * Extract RFQ code from text (handles variations)
 * Pure utility function - no server action needed
 */
export function extractRfqCode(text: string): string | null {
  const pattern = /RFQ-[A-Z0-9]{6}/i
  const match = text.match(pattern)
  return match ? match[0].toUpperCase() : null
}

