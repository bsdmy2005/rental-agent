import { extractRfqCode } from "./rfq-code-generator"

export interface ParsedQuoteSubmission {
  rfqCode: string
  amount: string | null
  description: string | null
  completionDate: Date | null
}

/**
 * Extract amount from text
 * Looks for patterns like: R 1500, R1,500.00, ZAR 1500, 1500 R, etc.
 */
function extractAmount(text: string): string | null {
  // Remove commas and spaces for easier parsing
  const cleaned = text.replace(/,/g, "")

  // Pattern 1: R followed by number (R 1500, R1500, R1,500.00)
  const pattern1 = /R\s*(\d+(?:\.\d{2})?)/i
  const match1 = cleaned.match(pattern1)
  if (match1) {
    return match1[1]
  }

  // Pattern 2: ZAR followed by number
  const pattern2 = /ZAR\s*(\d+(?:\.\d{2})?)/i
  const match2 = cleaned.match(pattern2)
  if (match2) {
    return match2[1]
  }

  // Pattern 3: Number followed by R (1500 R)
  const pattern3 = /(\d+(?:\.\d{2})?)\s*R/i
  const match3 = cleaned.match(pattern3)
  if (match3) {
    return match3[1]
  }

  // Pattern 4: Just a number that looks like currency (4+ digits or has decimal)
  const pattern4 = /(\d{4,}(?:\.\d{2})?)/i
  const match4 = cleaned.match(pattern4)
  if (match4) {
    return match4[1]
  }

  return null
}

/**
 * Extract description from text
 * Usually comes after the amount or RFQ code
 */
function extractDescription(text: string, amountMatch: string | null): string | null {
  let cleaned = text

  // Remove RFQ code
  cleaned = cleaned.replace(/RFQ-[A-Z0-9]{6}/i, "").trim()

  // Remove amount if found
  if (amountMatch) {
    cleaned = cleaned.replace(new RegExp(`R\\s*${amountMatch.replace(".", "\\.")}`, "i"), "").trim()
    cleaned = cleaned.replace(new RegExp(`ZAR\\s*${amountMatch.replace(".", "\\.")}`, "i"), "").trim()
    cleaned = cleaned.replace(new RegExp(`${amountMatch.replace(".", "\\.")}\\s*R`, "i"), "").trim()
  }

  // Remove common keywords
  cleaned = cleaned
    .replace(/amount:?/i, "")
    .replace(/description:?/i, "")
    .replace(/completion\s*date:?/i, "")
    .replace(/date:?/i, "")
    .trim()

  // Look for description patterns
  const descriptionPatterns = [
    /description:\s*(.+?)(?:\n|completion|date|$)/i,
    /desc:\s*(.+?)(?:\n|completion|date|$)/i,
    /work:\s*(.+?)(?:\n|completion|date|$)/i
  ]

  for (const pattern of descriptionPatterns) {
    const match = cleaned.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  // If no pattern found, take everything after amount/RFQ code as description
  if (cleaned.length > 10) {
    // Remove date patterns that might be at the end
    cleaned = cleaned.replace(/\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/i, "").trim()
    cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2}/, "").trim()

    if (cleaned.length > 0) {
      return cleaned
    }
  }

  return null
}

/**
 * Extract completion date from text
 * Handles formats like: 2025-03-15, 15 March 2025, 15/03/2025, etc.
 */
function extractCompletionDate(text: string): Date | null {
  // Pattern 1: ISO date (2025-03-15)
  const isoPattern = /(\d{4}-\d{2}-\d{2})/
  const isoMatch = text.match(isoPattern)
  if (isoMatch) {
    const date = new Date(isoMatch[1])
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY
  const slashPattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/
  const slashMatch = text.match(slashPattern)
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10)
    const month = parseInt(slashMatch[2], 10) - 1 // Month is 0-indexed
    const year = parseInt(slashMatch[3], 10)
    const date = new Date(year, month, day)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  // Pattern 3: DD Month YYYY (15 March 2025)
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ]
  const monthPattern = new RegExp(
    `(\\d{1,2})\\s+(${monthNames.join("|")})\\w*\\s+(\\d{4})`,
    "i"
  )
  const monthMatch = text.match(monthPattern)
  if (monthMatch) {
    const day = parseInt(monthMatch[1], 10)
    const monthIndex = monthNames.findIndex((m) =>
      monthMatch[2].toLowerCase().startsWith(m)
    )
    const year = parseInt(monthMatch[3], 10)
    if (monthIndex !== -1) {
      const date = new Date(year, monthIndex, day)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }

  return null
}

/**
 * Parse WhatsApp message for quote submission
 */
export function parseQuoteSubmission(messageText: string): ParsedQuoteSubmission | null {
  if (!messageText || typeof messageText !== "string") {
    return null
  }

  // Extract RFQ code (required)
  const rfqCode = extractRfqCode(messageText)
  if (!rfqCode) {
    return null
  }

  // Extract amount
  const amount = extractAmount(messageText)

  // Extract description
  const description = extractDescription(messageText, amount)

  // Extract completion date
  const completionDate = extractCompletionDate(messageText)

  return {
    rfqCode,
    amount,
    description,
    completionDate
  }
}

