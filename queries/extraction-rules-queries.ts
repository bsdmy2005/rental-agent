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
  const rules = await db
    .select()
    .from(extractionRulesTable)
    .where(eq(extractionRulesTable.userProfileId, userProfileId))

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

