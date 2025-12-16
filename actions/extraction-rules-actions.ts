"use server"

import { db } from "@/db"
import {
  extractionRulesTable,
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

export async function deleteExtractionRuleAction(ruleId: string): Promise<ActionState<void>> {
  try {
    await db.delete(extractionRulesTable).where(eq(extractionRulesTable.id, ruleId))

    return {
      isSuccess: true,
      message: "Extraction rule deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting extraction rule:", error)
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

