"use server"

import { db } from "@/db"
import {
  extractionRulesTable,
  billingSchedulesTable,
  type InsertExtractionRule,
  type SelectExtractionRule
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function createExtractionRuleAction(
  rule: InsertExtractionRule
): Promise<ActionState<SelectExtractionRule>> {
  try {
    const [newRule] = await db.insert(extractionRulesTable).values(rule).returning()

    if (!newRule) {
      return { isSuccess: false, message: "Failed to create extraction rule" }
    }

    return {
      isSuccess: true,
      message: "Extraction rule created successfully",
      data: newRule
    }
  } catch (error) {
    console.error("Error creating extraction rule:", error)
    return { isSuccess: false, message: "Failed to create extraction rule" }
  }
}

export async function updateExtractionRuleAction(
  ruleId: string,
  data: Partial<InsertExtractionRule>
): Promise<ActionState<SelectExtractionRule>> {
  try {
    const [updatedRule] = await db
      .update(extractionRulesTable)
      .set(data)
      .where(eq(extractionRulesTable.id, ruleId))
      .returning()

    if (!updatedRule) {
      return { isSuccess: false, message: "Extraction rule not found" }
    }

    return {
      isSuccess: true,
      message: "Extraction rule updated successfully",
      data: updatedRule
    }
  } catch (error) {
    console.error("Error updating extraction rule:", error)
    return { isSuccess: false, message: "Failed to update extraction rule" }
  }
}

export async function checkRuleReferencedAction(ruleId: string): Promise<ActionState<boolean>> {
  try {
    // Check if rule is referenced by any billing schedules
    const schedules = await db.query.billingSchedules.findMany({
      where: eq(billingSchedulesTable.extractionRuleId, ruleId),
      columns: { id: true, isActive: true }
    })

    const isReferenced = schedules.length > 0
    const activeSchedules = schedules.filter((s) => s.isActive).length

    return {
      isSuccess: true,
      message: isReferenced
        ? `This rule is referenced by ${schedules.length} billing schedule${schedules.length !== 1 ? "s" : ""} (${activeSchedules} active)`
        : "Rule is not referenced",
      data: isReferenced
    }
  } catch (error) {
    console.error("Error checking rule references:", error)
    return { isSuccess: false, message: "Failed to check rule references", data: false }
  }
}

export async function deleteExtractionRuleAction(ruleId: string): Promise<ActionState<void>> {
  try {
    // First check if rule is referenced by billing schedules
    const referenceCheck = await checkRuleReferencedAction(ruleId)
    
    if (referenceCheck.isSuccess && referenceCheck.data) {
      return {
        isSuccess: false,
        message: "Cannot delete this rule because it is referenced by one or more billing schedules. Please remove or update the billing schedules first."
      }
    }

    await db.delete(extractionRulesTable).where(eq(extractionRulesTable.id, ruleId))

    return {
      isSuccess: true,
      message: "Extraction rule deleted successfully",
      data: undefined
    }
  } catch (error: any) {
    console.error("Error deleting extraction rule:", error)
    
    // Check if it's a foreign key constraint error
    if (error?.code === "23503" || error?.cause?.code === "23503") {
      return {
        isSuccess: false,
        message: "Cannot delete this rule because it is referenced by one or more billing schedules. Please remove or update the billing schedules first."
      }
    }
    
    return { isSuccess: false, message: "Failed to delete extraction rule" }
  }
}

export async function activateExtractionRuleAction(
  ruleId: string
): Promise<ActionState<SelectExtractionRule>> {
  try {
    const [updatedRule] = await db
      .update(extractionRulesTable)
      .set({ isActive: true })
      .where(eq(extractionRulesTable.id, ruleId))
      .returning()

    if (!updatedRule) {
      return { isSuccess: false, message: "Extraction rule not found" }
    }

    return {
      isSuccess: true,
      message: "Extraction rule activated successfully",
      data: updatedRule
    }
  } catch (error) {
    console.error("Error activating extraction rule:", error)
    return { isSuccess: false, message: "Failed to activate extraction rule" }
  }
}

export async function deactivateExtractionRuleAction(
  ruleId: string
): Promise<ActionState<SelectExtractionRule>> {
  try {
    const [updatedRule] = await db
      .update(extractionRulesTable)
      .set({ isActive: false })
      .where(eq(extractionRulesTable.id, ruleId))
      .returning()

    if (!updatedRule) {
      return { isSuccess: false, message: "Extraction rule not found" }
    }

    return {
      isSuccess: true,
      message: "Extraction rule deactivated successfully",
      data: updatedRule
    }
  } catch (error) {
    console.error("Error deactivating extraction rule:", error)
    return { isSuccess: false, message: "Failed to deactivate extraction rule" }
  }
}

