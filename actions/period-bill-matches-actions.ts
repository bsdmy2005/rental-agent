"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { 
  billsTable, 
  periodBillMatchesTable, 
  billingPeriodsTable,
  billTemplatesTable,
  type SelectBill, 
  type SelectPeriodBillMatch 
} from "@/db/schema"
import { ActionState } from "@/types"
import { matchBillToPeriod, unmatchBill, manuallyMatchBillToPeriod, unmatchBillFromPeriod } from "@/lib/period-bill-matcher"
import { getBillsByPropertyIdQuery } from "@/queries/bills-queries"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getExtractionRuleByIdQuery } from "@/queries/extraction-rules-queries"
import { eq, inArray, and } from "drizzle-orm"

/**
 * Manually match a bill to a period
 */
export async function matchBillToPeriodManuallyAction(
  billId: string,
  periodId: string
): Promise<ActionState<SelectPeriodBillMatch>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const userProfile = await getUserProfileByClerkIdQuery(userId)
    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // Verify bill exists
    const bill = await db.query.bills.findFirst({
      where: eq(billsTable.id, billId)
    })

    if (!bill) {
      return { isSuccess: false, message: "Bill not found" }
    }

    // Verify period exists
    const period = await db.query.billingPeriods.findFirst({
      where: eq(billingPeriodsTable.id, periodId)
    })

    if (!period) {
      return { isSuccess: false, message: "Period not found" }
    }

    // Validate and manually match (allows multiple matches per bill)
    const matchResult = await manuallyMatchBillToPeriod(billId, periodId, userProfile.id)
    
    if (!matchResult.success) {
      return {
        isSuccess: false,
        message: matchResult.reason || "Cannot match bill to this period. Bill template does not match period template dependencies."
      }
    }

    // Get the created match (specific to this period)
    const match = await db.query.periodBillMatches.findFirst({
      where: and(
        eq(periodBillMatchesTable.billId, billId),
        eq(periodBillMatchesTable.periodId, periodId)
      )
    })

    if (!match) {
      // If already matched, return existing match
      if (matchResult.reason === "Already matched") {
        const existingMatch = await db.query.periodBillMatches.findFirst({
          where: and(
            eq(periodBillMatchesTable.billId, billId),
            eq(periodBillMatchesTable.periodId, periodId)
          )
        })
        if (existingMatch) {
          return {
            isSuccess: true,
            message: "Bill is already matched to this period",
            data: existingMatch
          }
        }
      }
      return { isSuccess: false, message: "Failed to create match" }
    }

    return {
      isSuccess: true,
      message: "Bill matched to period successfully",
      data: match
    }
  } catch (error) {
    console.error("Error matching bill to period:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to match bill to period"
    }
  }
}

/**
 * Unmatch a bill from a specific period
 */
export async function unmatchBillFromPeriodAction(
  billId: string,
  periodId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Check if bill is matched to this specific period
    const match = await db.query.periodBillMatches.findFirst({
      where: and(
        eq(periodBillMatchesTable.billId, billId),
        eq(periodBillMatchesTable.periodId, periodId)
      )
    })

    if (!match) {
      return { isSuccess: false, message: "Bill is not matched to this period" }
    }

    const { unmatchBillFromPeriod } = await import("@/lib/period-bill-matcher")
    await unmatchBillFromPeriod(billId, periodId)

    return {
      isSuccess: true,
      message: "Bill unmatched from period successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error unmatching bill:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to unmatch bill"
    }
  }
}

/**
 * Get all bills for a property with matched status
 * Returns all bills with information about whether they're matched to any periods
 */
export async function getAllBillsWithMatchedStatusAction(
  propertyId: string
): Promise<ActionState<Array<SelectBill & { 
  extractedPeriod?: { year: number; month: number }
  extractionRuleName?: string | null
  billTemplateName?: string | null
  matchedPeriodCount: number
  matchedPeriodIds: string[]
}>>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get all bills for this property
    const allBills = await getBillsByPropertyIdQuery(propertyId)

    // Get all matched bills (check all matches, not just first)
    const billIdsArray = allBills
      .map((b) => b.id)
      .filter((id): id is string => id !== null)
    
    const allMatches = billIdsArray.length > 0
      ? await db.query.periodBillMatches.findMany({
          where: inArray(periodBillMatchesTable.billId, billIdsArray)
        })
      : []
    
    // Group matches by bill ID
    const matchesByBillId = new Map<string, string[]>()
    for (const match of allMatches) {
      const existing = matchesByBillId.get(match.billId) || []
      existing.push(match.periodId)
      matchesByBillId.set(match.billId, existing)
    }

    // Get all unique bill template IDs
    const billTemplateIds = allBills
      .map((b) => b.billTemplateId)
      .filter((id): id is string => id !== null)
    
    // Fetch all bill templates at once
    const billTemplatesMap = new Map<string, { name: string }>()
    if (billTemplateIds.length > 0) {
      const uniqueTemplateIds = Array.from(new Set(billTemplateIds))
      const billTemplates = await db.query.billTemplates.findMany({
        where: inArray(billTemplatesTable.id, uniqueTemplateIds)
      })
      billTemplates.forEach((template) => {
        billTemplatesMap.set(template.id, { name: template.name })
      })
    }

    // Fetch extraction rule names for all bills
    const billsWithRules = await Promise.all(
      allBills.map(async (bill) => {
        let extractionRuleName: string | null = null
        // Try invoice rule first, then payment rule, then legacy extractionRuleId
        if (bill.invoiceRuleId) {
          const rule = await getExtractionRuleByIdQuery(bill.invoiceRuleId)
          extractionRuleName = rule?.name || null
        } else if (bill.paymentRuleId) {
          const rule = await getExtractionRuleByIdQuery(bill.paymentRuleId)
          extractionRuleName = rule?.name || null
        } else if (bill.extractionRuleId) {
          const rule = await getExtractionRuleByIdQuery(bill.extractionRuleId)
          extractionRuleName = rule?.name || null
        }

        const matchedPeriodIds = matchesByBillId.get(bill.id) || []
        const billTemplate = bill.billTemplateId ? billTemplatesMap.get(bill.billTemplateId) : null

        // Add extracted period info if available
        const result: typeof bill & { 
          extractedPeriod?: { year: number; month: number }
          extractionRuleName?: string | null
          billTemplateName?: string | null
          matchedPeriodCount: number
          matchedPeriodIds: string[]
        } = {
          ...bill,
          extractionRuleName,
          billTemplateName: billTemplate?.name || null,
          matchedPeriodCount: matchedPeriodIds.length,
          matchedPeriodIds
        }
        if (bill.billingYear && bill.billingMonth) {
          result.extractedPeriod = {
            year: bill.billingYear,
            month: bill.billingMonth
          }
        }
        return result
      })
    )

    return {
      isSuccess: true,
      message: "Bills retrieved successfully",
      data: billsWithRules
    }
  } catch (error) {
    console.error("Error getting bills:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get bills"
    }
  }
}

/**
 * Get unmatched bills for a property
 * Includes bills that:
 * - Have no billingYear/billingMonth (period not extracted)
 * - Have billingYear/billingMonth but no matching period exists
 * - Were manually unmatched
 */
export async function getUnmatchedBillsAction(
  propertyId: string
): Promise<ActionState<Array<SelectBill & { extractedPeriod?: { year: number; month: number }; extractionRuleName?: string | null }>>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get all bills for this property
    const allBills = await getBillsByPropertyIdQuery(propertyId)

    // Get all matched bills (check all matches, not just first)
    const billIdsArray = allBills
      .map((b) => b.id)
      .filter((id): id is string => id !== null)
    
    const allMatches = billIdsArray.length > 0
      ? await db.query.periodBillMatches.findMany({
          where: inArray(periodBillMatchesTable.billId, billIdsArray)
        })
      : []
    const matchedBillIdSet = new Set(allMatches.map((m) => m.billId))

    // Filter unmatched bills
    const unmatchedBills = allBills.filter((bill) => !matchedBillIdSet.has(bill.id))

    // Fetch extraction rule names for unmatched bills
    const billsWithRules = await Promise.all(
      unmatchedBills.map(async (bill) => {
        let extractionRuleName: string | null = null
        // Try invoice rule first, then payment rule, then legacy extractionRuleId
        if (bill.invoiceRuleId) {
          const rule = await getExtractionRuleByIdQuery(bill.invoiceRuleId)
          extractionRuleName = rule?.name || null
        } else if (bill.paymentRuleId) {
          const rule = await getExtractionRuleByIdQuery(bill.paymentRuleId)
          extractionRuleName = rule?.name || null
        } else if (bill.extractionRuleId) {
          const rule = await getExtractionRuleByIdQuery(bill.extractionRuleId)
          extractionRuleName = rule?.name || null
        }

        // Add extracted period info if available
        const result: typeof bill & { extractedPeriod?: { year: number; month: number }; extractionRuleName?: string | null } = {
          ...bill,
          extractionRuleName
        }
        if (bill.billingYear && bill.billingMonth) {
          result.extractedPeriod = {
            year: bill.billingYear,
            month: bill.billingMonth
          }
        }
        return result
      })
    )

    return {
      isSuccess: true,
      message: "Unmatched bills retrieved successfully",
      data: billsWithRules
    }
  } catch (error) {
    console.error("Error getting unmatched bills:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get unmatched bills"
    }
  }
}

/**
 * Match a bill to multiple periods at once
 */
export async function matchBillToMultiplePeriodsAction(
  billId: string,
  periodIds: string[]
): Promise<ActionState<SelectPeriodBillMatch[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const userProfile = await getUserProfileByClerkIdQuery(userId)
    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // Verify bill exists
    const bill = await db.query.bills.findFirst({
      where: eq(billsTable.id, billId)
    })

    if (!bill) {
      return { isSuccess: false, message: "Bill not found" }
    }

    // Match to each period with validation
    const matches: SelectPeriodBillMatch[] = []
    const errors: string[] = []
    for (const periodId of periodIds) {
      try {
        const result = await manuallyMatchBillToPeriod(billId, periodId, userProfile.id)
        if (result.success) {
          const match = await db.query.periodBillMatches.findFirst({
            where: and(
              eq(periodBillMatchesTable.billId, billId),
              eq(periodBillMatchesTable.periodId, periodId)
            )
          })
          if (match) {
            matches.push(match)
          }
        } else {
          errors.push(`Period ${periodId}: ${result.reason || "Cannot match"}`)
        }
      } catch (error) {
        console.error(`Error matching bill to period ${periodId}:`, error)
        errors.push(`Period ${periodId}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    if (matches.length === 0 && errors.length > 0) {
      return {
        isSuccess: false,
        message: `Cannot match bill to any periods: ${errors.join("; ")}`
      }
    }

    if (errors.length > 0) {
      return {
        isSuccess: true,
        message: `Matched to ${matches.length} period(s). Some periods could not be matched: ${errors.join("; ")}`,
        data: matches
      }
    }

    return {
      isSuccess: true,
      message: `Bill matched to ${matches.length} period(s) successfully`,
      data: matches
    }
  } catch (error) {
    console.error("Error matching bill to multiple periods:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to match bill to periods"
    }
  }
}

/**
 * Check if a bill can be matched to specific periods
 * Returns compatibility status for each period
 */
export async function checkBillPeriodCompatibilityAction(
  billId: string,
  periodIds: string[]
): Promise<ActionState<Map<string, { canMatch: boolean; reason?: string }>>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const bill = await db.query.bills.findFirst({
      where: eq(billsTable.id, billId)
    })

    if (!bill) {
      return { isSuccess: false, message: "Bill not found" }
    }

    const { canBillMatchToPeriod } = await import("@/lib/period-bill-matcher-validation")
    const compatibilityMap = new Map<string, { canMatch: boolean; reason?: string }>()

    for (const periodId of periodIds) {
      const period = await db.query.billingPeriods.findFirst({
        where: eq(billingPeriodsTable.id, periodId)
      })

      if (period) {
        const validation = await canBillMatchToPeriod(bill, period)
        compatibilityMap.set(periodId, validation)
      } else {
        compatibilityMap.set(periodId, { canMatch: false, reason: "Period not found" })
      }
    }

    return {
      isSuccess: true,
      message: "Compatibility checked successfully",
      data: compatibilityMap
    }
  } catch (error) {
    console.error("Error checking bill-period compatibility:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to check compatibility"
    }
  }
}

/**
 * Get bills matched to a specific period
 */
export async function getBillsByPeriodIdAction(
  periodId: string
): Promise<ActionState<SelectBill[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const matches = await db.query.periodBillMatches.findMany({
      where: eq(periodBillMatchesTable.periodId, periodId)
    })

    const billIds = matches.map((m) => m.billId)
    const bills = await Promise.all(
      billIds.map((id) => db.query.bills.findFirst({ where: eq(billsTable.id, id) }))
    )

    const validBills = bills.filter((bill): bill is SelectBill => bill !== null)

    return {
      isSuccess: true,
      message: "Bills retrieved successfully",
      data: validBills
    }
  } catch (error) {
    console.error("Error getting bills by period:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get bills"
    }
  }
}

