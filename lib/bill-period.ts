import type { InvoiceExtractionData, PaymentExtractionData } from "./pdf-processing"

/**
 * Infer billing year and month from extracted data
 * 
 * Attempts to extract billing period from:
 * 1. period field in invoice/payment data (e.g. "March 2025", "2025-03", "03/2025")
 * 2. dueDate field in payment data
 * 3. periodStart/periodEnd in invoice data
 * 4. Filename patterns (e.g. "bill_2025_03.pdf")
 * 
 * Returns { billingYear, billingMonth } or null if inference fails
 */
export function inferBillingPeriod(
  invoiceData: InvoiceExtractionData | null,
  paymentData: PaymentExtractionData | null,
  fileName?: string
): { billingYear: number; billingMonth: number } | null {
  // Try to extract from period field (most common)
  const period = invoiceData?.period || paymentData?.period
  if (period) {
    const parsed = parsePeriodString(period)
    if (parsed) {
      return parsed
    }
  }

  // Try to extract from dueDate in payment data
  if (paymentData?.landlordPayableItems && paymentData.landlordPayableItems.length > 0) {
    for (const item of paymentData.landlordPayableItems) {
      if (item.dueDate) {
        const parsed = parseDateString(item.dueDate)
        if (parsed) {
          return parsed
        }
      }
    }
  }

  // Try to extract from periodStart/periodEnd in invoice data
  if (invoiceData?.tenantChargeableItems && invoiceData.tenantChargeableItems.length > 0) {
    for (const item of invoiceData.tenantChargeableItems) {
      if (item.periodStart) {
        const parsed = parseDateString(item.periodStart)
        if (parsed) {
          return parsed
        }
      }
      if (item.periodEnd) {
        const parsed = parseDateString(item.periodEnd)
        if (parsed) {
          return parsed
        }
      }
    }
  }

  // Try to extract from filename patterns
  if (fileName) {
    const parsed = parseFileName(fileName)
    if (parsed) {
      return parsed
    }
  }

  return null
}

/**
 * Parse period string in various formats:
 * - "March 2025" or "Mar 2025"
 * - "2025-03" or "2025/03"
 * - "03/2025" or "03-2025"
 * - "202503"
 */
function parsePeriodString(period: string): { billingYear: number; billingMonth: number } | null {
  const trimmed = period.trim()

  // Try "March 2025" or "Mar 2025" format
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
  const monthAbbrevs = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

  const lowerPeriod = trimmed.toLowerCase()
  for (let i = 0; i < monthNames.length; i++) {
    if (lowerPeriod.includes(monthNames[i]) || lowerPeriod.includes(monthAbbrevs[i])) {
      const yearMatch = trimmed.match(/\b(20\d{2})\b/)
      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10)
        if (year >= 2020 && year <= 2100) {
          return { billingYear: year, billingMonth: i + 1 }
        }
      }
    }
  }

  // Try "2025-03" or "2025/03" format
  const yyyyMmMatch = trimmed.match(/(20\d{2})[-/](\d{1,2})/)
  if (yyyyMmMatch) {
    const year = parseInt(yyyyMmMatch[1], 10)
    const month = parseInt(yyyyMmMatch[2], 10)
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      return { billingYear: year, billingMonth: month }
    }
  }

  // Try "03/2025" or "03-2025" format
  const mmYyyyMatch = trimmed.match(/(\d{1,2})[-/](20\d{2})/)
  if (mmYyyyMatch) {
    const month = parseInt(mmYyyyMatch[1], 10)
    const year = parseInt(mmYyyyMatch[2], 10)
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      return { billingYear: year, billingMonth: month }
    }
  }

  // Try "202503" format (YYYYMM)
  const yyyymmMatch = trimmed.match(/(20\d{2})(\d{2})/)
  if (yyyymmMatch) {
    const year = parseInt(yyyymmMatch[1], 10)
    const month = parseInt(yyyymmMatch[2], 10)
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      return { billingYear: year, billingMonth: month }
    }
  }

  return null
}

/**
 * Parse date string (ISO format, or common date formats)
 * Returns the year and month from the date
 */
function parseDateString(dateStr: string): { billingYear: number; billingMonth: number } | null {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return null
    }

    const year = date.getFullYear()
    const month = date.getMonth() + 1 // getMonth() returns 0-11

    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      return { billingYear: year, billingMonth: month }
    }
  } catch {
    // Invalid date format
  }

  return null
}

/**
 * Parse filename for date patterns
 * Examples: "bill_2025_03.pdf", "statement-2025-03.pdf", "invoice_202503.pdf"
 */
function parseFileName(fileName: string): { billingYear: number; billingMonth: number } | null {
  // Try "2025_03" or "2025-03" pattern
  const yyyyMmMatch = fileName.match(/(20\d{2})[-_](\d{1,2})/)
  if (yyyyMmMatch) {
    const year = parseInt(yyyyMmMatch[1], 10)
    const month = parseInt(yyyyMmMatch[2], 10)
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      return { billingYear: year, billingMonth: month }
    }
  }

  // Try "202503" pattern (YYYYMM)
  const yyyymmMatch = fileName.match(/(20\d{2})(\d{2})/)
  if (yyyymmMatch) {
    const year = parseInt(yyyymmMatch[1], 10)
    const month = parseInt(yyyymmMatch[2], 10)
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      return { billingYear: year, billingMonth: month }
    }
  }

  return null
}

