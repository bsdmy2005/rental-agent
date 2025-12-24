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
  console.log(`[Bill Period] ==========================================`)
  console.log(`[Bill Period] Starting period extraction inference...`)
  console.log(`[Bill Period] Input data:`)
  console.log(`[Bill Period]   - Invoice data present: ${!!invoiceData}`)
  console.log(`[Bill Period]   - Payment data present: ${!!paymentData}`)
  console.log(`[Bill Period]   - File name: ${fileName || "(none)"}`)

  // Method 1: Try to extract from period field (most common)
  console.log(`[Bill Period] ------------------------------------------`)
  console.log(`[Bill Period] Method 1: Checking period field...`)
  const period = invoiceData?.period || paymentData?.period
  console.log(`[Bill Period]   Period field value: "${period}" (type: ${typeof period})`)
  console.log(`[Bill Period]   Source: ${invoiceData?.period ? "invoice data" : paymentData?.period ? "payment data" : "none"}`)
  
  if (period && typeof period === "string" && period.trim() !== "") {
    console.log(`[Bill Period]   ✓ Valid period string found, attempting to parse...`)
    const parsed = parsePeriodString(period)
    if (parsed) {
      console.log(`[Bill Period]   ✓ SUCCESS: Parsed period from period field: ${parsed.billingYear}-${parsed.billingMonth}`)
      console.log(`[Bill Period] ==========================================`)
      return parsed
    } else {
      console.log(`[Bill Period]   ✗ FAILED: Could not parse period string format: "${period}"`)
    }
  } else {
    console.log(`[Bill Period]   ✗ SKIPPED: No valid period field found`)
    console.log(`[Bill Period]     - Invoice period: ${invoiceData?.period || "(none)"}`)
    console.log(`[Bill Period]     - Payment period: ${paymentData?.period || "(none)"}`)
  }

  // Method 2: Try to extract from dueDate in payment data
  console.log(`[Bill Period] ------------------------------------------`)
  console.log(`[Bill Period] Method 2: Checking dueDate in payment data...`)
  if (paymentData?.landlordPayableItems && paymentData.landlordPayableItems.length > 0) {
    console.log(`[Bill Period]   Found ${paymentData.landlordPayableItems.length} payable item(s)`)
    for (let i = 0; i < paymentData.landlordPayableItems.length; i++) {
      const item = paymentData.landlordPayableItems[i]
      if (item.dueDate) {
        console.log(`[Bill Period]   Item ${i + 1} dueDate: "${item.dueDate}"`)
        const parsed = parseDateString(item.dueDate)
        if (parsed) {
          console.log(`[Bill Period]   ✓ SUCCESS: Parsed period from dueDate: ${parsed.billingYear}-${parsed.billingMonth}`)
          console.log(`[Bill Period] ==========================================`)
          return parsed
        } else {
          console.log(`[Bill Period]   ✗ FAILED: Could not parse dueDate: "${item.dueDate}"`)
        }
      } else {
        console.log(`[Bill Period]   Item ${i + 1}: No dueDate field`)
      }
    }
    console.log(`[Bill Period]   ✗ No valid dueDate found in payment items`)
  } else {
    console.log(`[Bill Period]   ✗ SKIPPED: No payment data or no payable items found`)
  }

  // Method 3: Try to extract from periodStart/periodEnd in invoice data
  console.log(`[Bill Period] ------------------------------------------`)
  console.log(`[Bill Period] Method 3: Checking periodStart/periodEnd in invoice data...`)
  if (invoiceData?.tenantChargeableItems && invoiceData.tenantChargeableItems.length > 0) {
    console.log(`[Bill Period]   Found ${invoiceData.tenantChargeableItems.length} chargeable item(s)`)
    for (let i = 0; i < invoiceData.tenantChargeableItems.length; i++) {
      const item = invoiceData.tenantChargeableItems[i]
      if (item.periodStart) {
        console.log(`[Bill Period]   Item ${i + 1} periodStart: "${item.periodStart}"`)
        const parsed = parseDateString(item.periodStart)
        if (parsed) {
          console.log(`[Bill Period]   ✓ SUCCESS: Parsed period from periodStart: ${parsed.billingYear}-${parsed.billingMonth}`)
          console.log(`[Bill Period] ==========================================`)
          return parsed
        } else {
          console.log(`[Bill Period]   ✗ FAILED: Could not parse periodStart: "${item.periodStart}"`)
        }
      }
      if (item.periodEnd) {
        console.log(`[Bill Period]   Item ${i + 1} periodEnd: "${item.periodEnd}"`)
        const parsed = parseDateString(item.periodEnd)
        if (parsed) {
          console.log(`[Bill Period]   ✓ SUCCESS: Parsed period from periodEnd: ${parsed.billingYear}-${parsed.billingMonth}`)
          console.log(`[Bill Period] ==========================================`)
          return parsed
        } else {
          console.log(`[Bill Period]   ✗ FAILED: Could not parse periodEnd: "${item.periodEnd}"`)
        }
      }
      if (!item.periodStart && !item.periodEnd) {
        console.log(`[Bill Period]   Item ${i + 1}: No periodStart or periodEnd fields`)
      }
    }
    console.log(`[Bill Period]   ✗ No valid periodStart/periodEnd found in invoice items`)
  } else {
    console.log(`[Bill Period]   ✗ SKIPPED: No invoice data or no chargeable items found`)
  }

  // Method 4: Try to extract from filename patterns
  console.log(`[Bill Period] ------------------------------------------`)
  console.log(`[Bill Period] Method 4: Checking filename patterns...`)
  if (fileName) {
    console.log(`[Bill Period]   File name: "${fileName}"`)
    const parsed = parseFileName(fileName)
    if (parsed) {
      console.log(`[Bill Period]   ✓ SUCCESS: Parsed period from filename: ${parsed.billingYear}-${parsed.billingMonth}`)
      console.log(`[Bill Period] ==========================================`)
      return parsed
    } else {
      console.log(`[Bill Period]   ✗ FAILED: No date pattern found in filename`)
    }
  } else {
    console.log(`[Bill Period]   ✗ SKIPPED: No filename provided`)
  }

  console.log(`[Bill Period] ------------------------------------------`)
  console.log(`[Bill Period] ✗ ALL METHODS FAILED: Could not extract period from any source`)
  console.log(`[Bill Period]   Period can be set manually later`)
  console.log(`[Bill Period] ==========================================`)
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
  console.log(`[Bill Period]     Parsing period string: "${trimmed}"`)

  // Try "March 2025" or "Mar 2025" format
  console.log(`[Bill Period]     Pattern 1: Checking month name format (e.g., "March 2025", "Mar 2025")...`)
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
          console.log(`[Bill Period]       ✓ Matched: Found month "${monthNames[i]}" and year "${year}"`)
          return { billingYear: year, billingMonth: i + 1 }
        } else {
          console.log(`[Bill Period]       ✗ Year out of range: ${year}`)
        }
      }
    }
  }
  console.log(`[Bill Period]       ✗ No month name pattern found`)

  // Try "2025-03" or "2025/03" format
  console.log(`[Bill Period]     Pattern 2: Checking YYYY-MM or YYYY/MM format (e.g., "2025-03", "2025/03")...`)
  const yyyyMmMatch = trimmed.match(/(20\d{2})[-/](\d{1,2})/)
  if (yyyyMmMatch) {
    const year = parseInt(yyyyMmMatch[1], 10)
    const month = parseInt(yyyyMmMatch[2], 10)
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      console.log(`[Bill Period]       ✓ Matched: Year ${year}, Month ${month}`)
      return { billingYear: year, billingMonth: month }
    } else {
      console.log(`[Bill Period]       ✗ Invalid values: year=${year}, month=${month}`)
    }
  } else {
    console.log(`[Bill Period]       ✗ Pattern not found`)
  }

  // Try "03/2025" or "03-2025" format
  console.log(`[Bill Period]     Pattern 3: Checking MM/YYYY or MM-YYYY format (e.g., "03/2025", "03-2025")...`)
  const mmYyyyMatch = trimmed.match(/(\d{1,2})[-/](20\d{2})/)
  if (mmYyyyMatch) {
    const month = parseInt(mmYyyyMatch[1], 10)
    const year = parseInt(mmYyyyMatch[2], 10)
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      console.log(`[Bill Period]       ✓ Matched: Year ${year}, Month ${month}`)
      return { billingYear: year, billingMonth: month }
    } else {
      console.log(`[Bill Period]       ✗ Invalid values: year=${year}, month=${month}`)
    }
  } else {
    console.log(`[Bill Period]       ✗ Pattern not found`)
  }

  // Try "202503" format (YYYYMM)
  console.log(`[Bill Period]     Pattern 4: Checking YYYYMM format (e.g., "202503")...`)
  const yyyymmMatch = trimmed.match(/(20\d{2})(\d{2})/)
  if (yyyymmMatch) {
    const year = parseInt(yyyymmMatch[1], 10)
    const month = parseInt(yyyymmMatch[2], 10)
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      console.log(`[Bill Period]       ✓ Matched: Year ${year}, Month ${month}`)
      return { billingYear: year, billingMonth: month }
    } else {
      console.log(`[Bill Period]       ✗ Invalid values: year=${year}, month=${month}`)
    }
  } else {
    console.log(`[Bill Period]       ✗ Pattern not found`)
  }

  console.log(`[Bill Period]     ✗ All period string patterns failed`)
  return null
}

/**
 * Parse date string (ISO format, or common date formats)
 * Returns the year and month from the date
 */
function parseDateString(dateStr: string): { billingYear: number; billingMonth: number } | null {
  console.log(`[Bill Period]     Parsing date string: "${dateStr}"`)
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      console.log(`[Bill Period]       ✗ Invalid date: cannot parse`)
      return null
    }

    const year = date.getFullYear()
    const month = date.getMonth() + 1 // getMonth() returns 0-11

    console.log(`[Bill Period]       Parsed date: ${year}-${month.toString().padStart(2, "0")}`)

    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      console.log(`[Bill Period]       ✓ Valid date range: Year ${year}, Month ${month}`)
      return { billingYear: year, billingMonth: month }
    } else {
      console.log(`[Bill Period]       ✗ Date out of valid range: year=${year}, month=${month}`)
    }
  } catch (error) {
    console.log(`[Bill Period]       ✗ Error parsing date: ${error instanceof Error ? error.message : String(error)}`)
  }

  return null
}

/**
 * Parse filename for date patterns
 * Examples: "bill_2025_03.pdf", "statement-2025-03.pdf", "invoice_202503.pdf"
 */
function parseFileName(fileName: string): { billingYear: number; billingMonth: number } | null {
  console.log(`[Bill Period]     Parsing filename: "${fileName}"`)
  
  // Try "2025_03" or "2025-03" pattern
  console.log(`[Bill Period]       Pattern 1: Checking YYYY_MM or YYYY-MM format (e.g., "bill_2025_03.pdf", "statement-2025-03.pdf")...`)
  const yyyyMmMatch = fileName.match(/(20\d{2})[-_](\d{1,2})/)
  if (yyyyMmMatch) {
    const year = parseInt(yyyyMmMatch[1], 10)
    const month = parseInt(yyyyMmMatch[2], 10)
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      console.log(`[Bill Period]         ✓ Matched: Year ${year}, Month ${month}`)
      return { billingYear: year, billingMonth: month }
    } else {
      console.log(`[Bill Period]         ✗ Invalid values: year=${year}, month=${month}`)
    }
  } else {
    console.log(`[Bill Period]         ✗ Pattern not found`)
  }

  // Try "202503" pattern (YYYYMM)
  console.log(`[Bill Period]       Pattern 2: Checking YYYYMM format (e.g., "invoice_202503.pdf")...`)
  const yyyymmMatch = fileName.match(/(20\d{2})(\d{2})/)
  if (yyyymmMatch) {
    const year = parseInt(yyyymmMatch[1], 10)
    const month = parseInt(yyyymmMatch[2], 10)
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) {
      console.log(`[Bill Period]         ✓ Matched: Year ${year}, Month ${month}`)
      return { billingYear: year, billingMonth: month }
    } else {
      console.log(`[Bill Period]         ✗ Invalid values: year=${year}, month=${month}`)
    }
  } else {
    console.log(`[Bill Period]         ✗ Pattern not found`)
  }

  console.log(`[Bill Period]       ✗ All filename patterns failed`)
  return null
}

