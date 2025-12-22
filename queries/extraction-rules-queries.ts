import { db } from "@/db"
import {
  extractionRulesTable,
  type SelectExtractionRule
} from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function getExtractionRuleByIdQuery(
  ruleId: string
): Promise<SelectExtractionRule | null> {
  const [rule] = await db
    .select()
    .from(extractionRulesTable)
    .where(eq(extractionRulesTable.id, ruleId))
    .limit(1)

  return rule || null
}

export async function getExtractionRulesByUserProfileIdQuery(
  userProfileId: string
): Promise<SelectExtractionRule[]> {
  // Note: Rules are now property-specific, but we can still query by userProfileId
  // to get all rules for properties owned by this user
  const rules = await db
    .select()
    .from(extractionRulesTable)
    .where(eq(extractionRulesTable.userProfileId, userProfileId))

  return rules
}

export async function getExtractionRulesByPropertyIdAndBillTypeQuery(
  propertyId: string,
  billType: "municipality" | "levy" | "utility" | "other"
): Promise<SelectExtractionRule[]> {
  const rules = await db
    .select()
    .from(extractionRulesTable)
    .where(
      and(
        eq(extractionRulesTable.propertyId, propertyId),
        eq(extractionRulesTable.billType, billType)
      )
    )

  return rules
}

export async function getExtractionRulesByPropertyIdQuery(
  propertyId: string
): Promise<SelectExtractionRule[]> {
  const rules = await db
    .select()
    .from(extractionRulesTable)
    .where(eq(extractionRulesTable.propertyId, propertyId))

  return rules
}

export async function getActiveExtractionRulesQuery(
  propertyId: string,
  billType: "municipality" | "levy" | "utility" | "other"
): Promise<SelectExtractionRule[]> {
  const rules = await db
    .select()
    .from(extractionRulesTable)
    .where(
      and(
        eq(extractionRulesTable.propertyId, propertyId),
        eq(extractionRulesTable.billType, billType),
        eq(extractionRulesTable.isActive, true)
      )
    )

  return rules
}

/**
 * Check if an extraction rule is referenced by any billing schedules
 */
export async function isRuleReferencedBySchedulesQuery(ruleId: string): Promise<boolean> {
  const { billingSchedulesTable } = await import("@/db/schema")
  const { eq } = await import("drizzle-orm")
  
  const schedules = await db.query.billingSchedules.findMany({
    where: eq(billingSchedulesTable.extractionRuleId, ruleId),
    columns: { id: true }
  })

  return schedules.length > 0
}

/**
 * Batch check which rules are referenced by billing schedules
 * Returns a Set of rule IDs that are referenced
 */
export async function getRulesReferencedBySchedulesQuery(ruleIds: string[]): Promise<Set<string>> {
  if (ruleIds.length === 0) {
    return new Set()
  }

  const { billingSchedulesTable } = await import("@/db/schema")
  const { inArray, isNotNull } = await import("drizzle-orm")
  
  const schedules = await db
    .select({ extractionRuleId: billingSchedulesTable.extractionRuleId })
    .from(billingSchedulesTable)
    .where(
      inArray(billingSchedulesTable.extractionRuleId, ruleIds)
    )

  return new Set(schedules.map((s) => s.extractionRuleId).filter((id): id is string => id !== null))
}

