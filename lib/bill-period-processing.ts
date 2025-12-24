"use server"

import { db } from "@/db"
import { billsTable, type SelectBill } from "@/db/schema"
import { eq } from "drizzle-orm"
import { inferBillingPeriod } from "./bill-period"
import { matchBillToPeriod } from "./period-bill-matcher"
import type { InvoiceExtractionData, PaymentExtractionData } from "./pdf-processing"

/**
 * Process bill period extraction and auto-matching
 * 
 * This function:
 * 1. Always attempts period inference if not already set (uses all extraction methods)
 * 2. Updates bill with period if extracted
 * 3. Auto-matches to ALL compatible periods (both invoice and payable if both match)
 * 
 * @param billId - The bill ID to process
 * @param invoiceData - Invoice extraction data (optional, for period inference)
 * @param paymentData - Payment extraction data (optional, for period inference)
 * @param fileName - File name (optional, for period inference from filename)
 * @returns Status object with period extraction and matching results
 */
export async function processBillPeriod(
  billId: string,
  invoiceData: InvoiceExtractionData | null,
  paymentData: PaymentExtractionData | null,
  fileName?: string
): Promise<{
  periodSet: boolean
  matched: boolean
  matchedPeriods: Array<{ periodId: string; periodType: "invoice" | "payable"; matchId: string }>
}> {
  console.log(`[Bill Period Processing] Starting period processing for bill ${billId}`)

  // Get the bill
  const bill = await db.query.bills.findFirst({
    where: eq(billsTable.id, billId)
  })

  if (!bill) {
    console.error(`[Bill Period Processing] ✗ Bill ${billId} not found`)
    throw new Error(`Bill ${billId} not found`)
  }

  let periodSet = false
  let matched = false
  const matchedPeriods: Array<{ periodId: string; periodType: "invoice" | "payable"; matchId: string }> = []

  // Step 1: Always attempt period inference if not already set
  if (!bill.billingYear || !bill.billingMonth) {
    console.log(`[Bill Period Processing] ------------------------------------------`)
    console.log(`[Bill Period Processing] STEP 1: Period Extraction`)
    console.log(`[Bill Period Processing] Bill ${billId} has no billing period, attempting inference...`)
    console.log(`[Bill Period Processing] Input data summary:`)
    console.log(`[Bill Period Processing]   - Invoice data present: ${!!invoiceData}`)
    if (invoiceData) {
      console.log(`[Bill Period Processing]     * Period field: ${invoiceData.period || "(none)"}`)
      console.log(`[Bill Period Processing]     * Chargeable items: ${invoiceData.tenantChargeableItems?.length || 0}`)
    }
    console.log(`[Bill Period Processing]   - Payment data present: ${!!paymentData}`)
    if (paymentData) {
      console.log(`[Bill Period Processing]     * Period field: ${paymentData.period || "(none)"}`)
      console.log(`[Bill Period Processing]     * Payable items: ${paymentData.landlordPayableItems?.length || 0}`)
    }
    console.log(`[Bill Period Processing]   - File name: ${fileName || "(none)"}`)
    console.log(`[Bill Period Processing] ------------------------------------------`)

    const inferredPeriod = inferBillingPeriod(
      invoiceData || null,
      paymentData || null,
      fileName
    )

    if (inferredPeriod) {
      console.log(`[Bill Period Processing] ------------------------------------------`)
      console.log(
        `[Bill Period Processing] ✓ SUCCESS: Successfully inferred billing period: ${inferredPeriod.billingYear}-${inferredPeriod.billingMonth}`
      )

      // Update bill with inferred period
      await db
        .update(billsTable)
        .set({
          billingYear: inferredPeriod.billingYear,
          billingMonth: inferredPeriod.billingMonth
        })
        .where(eq(billsTable.id, billId))

      periodSet = true
      console.log(
        `[Bill Period Processing] ✓ Updated bill ${billId} with billing period: ${inferredPeriod.billingYear}-${inferredPeriod.billingMonth}`
      )
      console.log(`[Bill Period Processing] ------------------------------------------`)
    } else {
      console.log(`[Bill Period Processing] ------------------------------------------`)
      console.log(
        `[Bill Period Processing] ⚠ FAILED: Could not infer billing period from any extraction method.`
      )
      console.log(`[Bill Period Processing]   Bill can be manually matched later.`)
      console.log(`[Bill Period Processing] ------------------------------------------`)
    }
  } else {
    periodSet = true
    console.log(`[Bill Period Processing] ------------------------------------------`)
    console.log(
      `[Bill Period Processing] SKIP: Bill ${billId} already has billing period: ${bill.billingYear}-${bill.billingMonth}`
    )
    console.log(`[Bill Period Processing]   No extraction needed.`)
    console.log(`[Bill Period Processing] ------------------------------------------`)
  }

  // Step 2: Auto-match to periods if period is set
  // Get updated bill to ensure we have the latest period
  const updatedBill = await db.query.bills.findFirst({
    where: eq(billsTable.id, billId)
  })

  if (!updatedBill) {
    console.error(`[Bill Period Processing] ✗ Failed to retrieve updated bill ${billId}`)
    throw new Error(`Failed to retrieve updated bill ${billId}`)
  }

  // Step 2: Auto-match to periods if period is set
  console.log(`[Bill Period Processing] ------------------------------------------`)
  console.log(`[Bill Period Processing] STEP 2: Period Matching`)
  
  // REQUIRE billTemplateId before attempting matching
  if (!updatedBill.billTemplateId) {
    console.log(`[Bill Period Processing] ------------------------------------------`)
    console.log(`[Bill Period Processing] ⚠ SKIP: Bill ${billId} has no template ID. Period matching requires template linking first.`)
    console.log(`[Bill Period Processing]   Template linking must happen before period matching.`)
    console.log(`[Bill Period Processing]   Bill can be manually matched later after template is linked.`)
    console.log(`[Bill Period Processing] ------------------------------------------`)
    return {
      periodSet,
      matched: false,
      matchedPeriods: []
    }
  }
  
  if (updatedBill.billingYear && updatedBill.billingMonth) {
    console.log(
      `[Bill Period Processing] Bill ${billId} has period ${updatedBill.billingYear}-${updatedBill.billingMonth}, attempting auto-match...`
    )
    console.log(`[Bill Period Processing]   Property ID: ${updatedBill.propertyId}`)
    console.log(`[Bill Period Processing]   Bill type: ${updatedBill.billType}`)
    console.log(`[Bill Period Processing]   Bill template ID: ${updatedBill.billTemplateId}`)
    
    try {
      const matches = await matchBillToPeriod(updatedBill, "automatic")

      if (matches.length > 0) {
        matched = true
        matchedPeriods.push(...matches)
        console.log(`[Bill Period Processing] ------------------------------------------`)
        console.log(
          `[Bill Period Processing] ✓ SUCCESS: Matched bill ${billId} to ${matches.length} period(s):`
        )
        matches.forEach((m, idx) => {
          console.log(`[Bill Period Processing]   ${idx + 1}. ${m.periodType} period: ${m.periodId} (match ID: ${m.matchId})`)
        })
        console.log(`[Bill Period Processing] ------------------------------------------`)
      } else {
        console.log(`[Bill Period Processing] ------------------------------------------`)
        console.log(
          `[Bill Period Processing] ⚠ NO MATCHES: No matching periods found for bill ${billId}.`
        )
        console.log(`[Bill Period Processing]   Possible reasons:`)
        console.log(`[Bill Period Processing]     - No billing periods exist for ${updatedBill.billingYear}-${updatedBill.billingMonth}`)
        console.log(`[Bill Period Processing]     - Bill template doesn't match period template dependencies`)
        console.log(`[Bill Period Processing]   Bill can be manually matched later.`)
        console.log(`[Bill Period Processing] ------------------------------------------`)
      }
    } catch (matchError) {
      // Log error but don't fail - matching is optional
      console.log(`[Bill Period Processing] ------------------------------------------`)
      console.error(
        `[Bill Period Processing] ✗ ERROR: Failed to auto-match bill ${billId} to periods:`,
        matchError
      )
      if (matchError instanceof Error) {
        console.error(`[Bill Period Processing]   Error message: ${matchError.message}`)
        console.error(`[Bill Period Processing]   Stack: ${matchError.stack}`)
      }
      console.log(`[Bill Period Processing] ------------------------------------------`)
    }
  } else {
    console.log(
      `[Bill Period Processing] SKIP: Bill ${billId} has no billing period, cannot auto-match.`
    )
    console.log(`[Bill Period Processing]   Period must be set manually first.`)
    console.log(`[Bill Period Processing] ------------------------------------------`)
  }

  console.log(`[Bill Period Processing] Completed processing for bill ${billId}:`, {
    periodSet,
    matched,
    matchedCount: matchedPeriods.length
  })

  return {
    periodSet,
    matched,
    matchedPeriods
  }
}

