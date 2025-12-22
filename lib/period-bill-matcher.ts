"use server"

import { type SelectBill, billsTable, billingPeriodsTable } from "@/db/schema"
import { findBillingPeriodByYearMonthQuery } from "@/queries/billing-periods-queries"
import { db } from "@/db"
import { periodBillMatchesTable, type InsertPeriodBillMatch } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import { canBillMatchToPeriod } from "./period-bill-matcher-validation"

/**
 * Find matching period for a bill based on billingYear/billingMonth
 * Enhanced to consider bill type when matching:
 * - Municipality bills typically go to invoice periods (tenant pays)
 * - Utility/Levy bills typically go to payable periods (landlord pays)
 */
export async function findMatchingPeriod(
  bill: SelectBill
): Promise<{ periodId: string; periodType: "invoice" | "payable" } | null> {
  if (!bill.billingYear || !bill.billingMonth) {
    console.log(`[Period Matcher] Bill ${bill.id} has no billingYear/billingMonth, cannot match`)
    return null
  }

  // Determine preferred period type based on bill type
  // Municipality bills are typically tenant expenses (invoice periods)
  // Utility/Levy bills are typically landlord expenses (payable periods)
  const preferredPeriodType: "invoice" | "payable" | null = 
    bill.billType === "municipality" ? "invoice" :
    bill.billType === "levy" || bill.billType === "utility" ? "payable" :
    null

  // Try preferred period type first if we have a preference
  if (preferredPeriodType) {
    const preferredPeriod = await findBillingPeriodByYearMonthQuery(
      bill.propertyId,
      bill.billingYear,
      bill.billingMonth,
      preferredPeriodType
    )

    if (preferredPeriod) {
      // Validate that bill can match to this period based on template dependencies
      const validation = await canBillMatchToPeriod(bill, preferredPeriod)
      if (validation.canMatch) {
        console.log(
          `[Period Matcher] Found ${preferredPeriodType} period ${preferredPeriod.id} for bill ${bill.id} (${bill.billingYear}-${bill.billingMonth}, type: ${bill.billType})`
        )
        return { periodId: preferredPeriod.id, periodType: preferredPeriodType }
      } else {
        console.log(
          `[Period Matcher] Period ${preferredPeriod.id} found but bill template doesn't match: ${validation.reason}`
        )
      }
    }
  }

  // Fallback: Try invoice period first (if not already tried)
  if (preferredPeriodType !== "invoice") {
    const invoicePeriod = await findBillingPeriodByYearMonthQuery(
      bill.propertyId,
      bill.billingYear,
      bill.billingMonth,
      "invoice"
    )

    if (invoicePeriod) {
      // Validate that bill can match to this period based on template dependencies
      const validation = await canBillMatchToPeriod(bill, invoicePeriod)
      if (validation.canMatch) {
        console.log(
          `[Period Matcher] Found invoice period ${invoicePeriod.id} for bill ${bill.id} (${bill.billingYear}-${bill.billingMonth})`
        )
        return { periodId: invoicePeriod.id, periodType: "invoice" }
      } else {
        console.log(
          `[Period Matcher] Invoice period ${invoicePeriod.id} found but bill template doesn't match: ${validation.reason}`
        )
      }
    }
  }

  // Fallback: Try payable period (if not already tried)
  if (preferredPeriodType !== "payable") {
    const payablePeriod = await findBillingPeriodByYearMonthQuery(
      bill.propertyId,
      bill.billingYear,
      bill.billingMonth,
      "payable"
    )

    if (payablePeriod) {
      // Validate that bill can match to this period based on template dependencies
      const validation = await canBillMatchToPeriod(bill, payablePeriod)
      if (validation.canMatch) {
        console.log(
          `[Period Matcher] Found payable period ${payablePeriod.id} for bill ${bill.id} (${bill.billingYear}-${bill.billingMonth})`
        )
        return { periodId: payablePeriod.id, periodType: "payable" }
      } else {
        console.log(
          `[Period Matcher] Payable period ${payablePeriod.id} found but bill template doesn't match: ${validation.reason}`
        )
      }
    }
  }

  console.log(
    `[Period Matcher] No matching period found for bill ${bill.id} (${bill.billingYear}-${bill.billingMonth}, property ${bill.propertyId}, type: ${bill.billType})`
  )
  return null
}

/**
 * Check if bill is already matched to a specific period
 */
export async function isBillMatchedToPeriod(billId: string, periodId: string): Promise<boolean> {
  const existingMatch = await db.query.periodBillMatches.findFirst({
    where: and(
      eq(periodBillMatchesTable.billId, billId),
      eq(periodBillMatchesTable.periodId, periodId)
    )
  })

  return !!existingMatch
}

/**
 * Check if bill is matched to any period
 */
export async function isBillMatched(billId: string): Promise<boolean> {
  const existingMatch = await db.query.periodBillMatches.findFirst({
    where: eq(periodBillMatchesTable.billId, billId)
  })

  return !!existingMatch
}

/**
 * Auto-match bill to period based on billingYear/billingMonth
 * Now supports matching to multiple periods (both invoice and payable)
 */
export async function matchBillToPeriod(
  bill: SelectBill,
  matchType: "automatic" | "manual" = "automatic",
  matchedBy?: string
): Promise<{ periodId: string; matchId: string } | null> {
  try {
    // Find matching period
    const match = await findMatchingPeriod(bill)
    if (!match) {
      console.log(`[Period Matcher] No matching period found for bill ${bill.id}`)
      return null
    }

    // Check if already matched to this specific period
    const alreadyMatchedToThisPeriod = await isBillMatchedToPeriod(bill.id, match.periodId)
    if (alreadyMatchedToThisPeriod) {
      console.log(`[Period Matcher] Bill ${bill.id} is already matched to period ${match.periodId}, skipping`)
      return null
    }

    // Create match record
    const matchData: InsertPeriodBillMatch = {
      periodId: match.periodId,
      billId: bill.id,
      matchType,
      matchedBy: matchedBy || null
    }

    const [newMatch] = await db.insert(periodBillMatchesTable).values(matchData).returning()

    if (!newMatch) {
      throw new Error("Failed to create match record")
    }

    console.log(
      `[Period Matcher] ✓ Matched bill ${bill.id} to ${match.periodType} period ${match.periodId} (${matchType})`
    )

    return {
      periodId: match.periodId,
      matchId: newMatch.id
    }
  } catch (error) {
    console.error(`[Period Matcher] Error matching bill ${bill.id}:`, error)
    throw error
  }
}

/**
 * Unmatch bill from a specific period
 */
export async function unmatchBillFromPeriod(billId: string, periodId: string): Promise<void> {
  try {
    await db
      .delete(periodBillMatchesTable)
      .where(
        and(
          eq(periodBillMatchesTable.billId, billId),
          eq(periodBillMatchesTable.periodId, periodId)
        )
      )
    console.log(`[Period Matcher] ✓ Unmatched bill ${billId} from period ${periodId}`)
  } catch (error) {
    console.error(`[Period Matcher] Error unmatching bill ${billId} from period ${periodId}:`, error)
    throw error
  }
}

/**
 * Unmatch bill from all periods (for complete removal)
 */
export async function unmatchBill(billId: string): Promise<void> {
  try {
    await db.delete(periodBillMatchesTable).where(eq(periodBillMatchesTable.billId, billId))
    console.log(`[Period Matcher] ✓ Unmatched bill ${billId} from all periods`)
  } catch (error) {
    console.error(`[Period Matcher] Error unmatching bill ${billId}:`, error)
    throw error
  }
}

/**
 * Manually match bill to a specific period
 * Allows multiple matches - one bill can match multiple periods
 * Validates that bill template matches period template dependencies
 */
export async function manuallyMatchBillToPeriod(
  billId: string,
  periodId: string,
  matchedBy: string
): Promise<{ success: boolean; reason?: string }> {
  try {
    // Get bill and period
    const bill = await db.query.bills.findFirst({
      where: eq(billsTable.id, billId)
    })
    const period = await db.query.billingPeriods.findFirst({
      where: eq(billingPeriodsTable.id, periodId)
    })

    if (!bill) {
      return { success: false, reason: "Bill not found" }
    }
    if (!period) {
      return { success: false, reason: "Period not found" }
    }

    // Validate that bill can match to this period
    const validation = await canBillMatchToPeriod(bill, period)
    if (!validation.canMatch) {
      console.log(`[Period Matcher] Cannot match bill ${billId} to period ${periodId}: ${validation.reason}`)
      return { success: false, reason: validation.reason }
    }

    // Check if already matched to this specific period
    const alreadyMatched = await isBillMatchedToPeriod(billId, periodId)
    if (alreadyMatched) {
      console.log(`[Period Matcher] Bill ${billId} is already matched to period ${periodId}`)
      return { success: true, reason: "Already matched" }
    }

    // Create new match (allows multiple matches per bill)
    const matchData: InsertPeriodBillMatch = {
      periodId,
      billId,
      matchType: "manual",
      matchedBy
    }

    await db.insert(periodBillMatchesTable).values(matchData)

    console.log(`[Period Matcher] ✓ Manually matched bill ${billId} to period ${periodId}`)
    return { success: true }
  } catch (error) {
    console.error(`[Period Matcher] Error manually matching bill:`, error)
    throw error
  }
}

