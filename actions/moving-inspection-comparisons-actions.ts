"use server"

import { db } from "@/db"
import {
  movingInspectionComparisonsTable,
  movingInspectionsTable,
  movingInspectionItemsTable,
  type InsertMovingInspectionComparison,
  type SelectMovingInspectionComparison
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, asc, desc } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

export async function compareInspectionsAction(
  movingInInspectionId: string,
  movingOutInspectionId: string
): Promise<ActionState<SelectMovingInspectionComparison[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get both inspections (manual joins to avoid referencedTable error)
    const [movingInInspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, movingInInspectionId))
      .limit(1)

    const [movingOutInspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, movingOutInspectionId))
      .limit(1)

    if (!movingInInspection || !movingOutInspection) {
      return { isSuccess: false, message: "One or both inspections not found" }
    }

    if (movingInInspection.inspectionType !== "moving_in" || movingOutInspection.inspectionType !== "moving_out") {
      return { isSuccess: false, message: "Invalid inspection types for comparison" }
    }

    // Get items for both inspections separately
    const movingInItems = await db
      .select()
      .from(movingInspectionItemsTable)
      .where(eq(movingInspectionItemsTable.inspectionId, movingInInspectionId))
      .orderBy(asc(movingInspectionItemsTable.displayOrder))

    const movingOutItems = await db
      .select()
      .from(movingInspectionItemsTable)
      .where(eq(movingInspectionItemsTable.inspectionId, movingOutInspectionId))
      .orderBy(asc(movingInspectionItemsTable.displayOrder))

    // Delete existing comparisons for this move-out inspection to allow re-comparison
    await db
      .delete(movingInspectionComparisonsTable)
      .where(eq(movingInspectionComparisonsTable.movingOutInspectionId, movingOutInspectionId))

    // Create comparison records for matching items
    const comparisons: InsertMovingInspectionComparison[] = []

    for (const movingInItem of movingInItems) {
      const movingOutItem = movingOutItems.find(
        item => item.name === movingInItem.name && item.categoryId === movingInItem.categoryId
      )

      if (movingOutItem) {
        // Determine condition change based on new 4-state system
        let conditionChange: "improved" | "same" | "deteriorated" | "new_defect" = "same"

        // Define condition severity levels (higher = worse)
        const conditionSeverity: Record<string, number> = {
          good: 0,
          requires_cleaning: 1,
          requires_repair: 2,
          requires_repair_and_cleaning: 3
        }

        const moveInSeverity = conditionSeverity[movingInItem.condition] ?? 0
        const moveOutSeverity = conditionSeverity[movingOutItem.condition] ?? 0

        if (moveInItem.condition === moveOutItem.condition) {
          conditionChange = "same"
        } else if (moveOutSeverity > moveInSeverity) {
          // Condition got worse
          if (moveInItem.condition === "good" && moveOutSeverity > 0) {
          conditionChange = "new_defect"
          } else {
          conditionChange = "deteriorated"
          }
        } else {
          // Condition improved
          conditionChange = "improved"
        }

        comparisons.push({
          movingInInspectionId: movingInInspection.id,
          movingOutInspectionId: movingOutInspection.id,
          itemId: movingOutItem.id,
          conditionChange,
          comparisonNotes: null,
          damageChargeApplicable: conditionChange === "deteriorated" || conditionChange === "new_defect",
          damageChargeAmount: null
        })
      }
    }

    // Insert comparisons
    if (comparisons.length > 0) {
      const insertedComparisons = await db
        .insert(movingInspectionComparisonsTable)
        .values(comparisons)
        .returning()

      return {
        isSuccess: true,
        message: "Inspections compared successfully",
        data: insertedComparisons
      }
    }

    return {
      isSuccess: true,
      message: "No matching items found for comparison",
      data: []
    }
  } catch (error) {
    console.error("Error comparing inspections:", error)
    return { isSuccess: false, message: "Failed to compare inspections" }
  }
}

export async function createComparisonAction(
  comparison: InsertMovingInspectionComparison
): Promise<ActionState<SelectMovingInspectionComparison>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [newComparison] = await db
      .insert(movingInspectionComparisonsTable)
      .values(comparison)
      .returning()

    if (!newComparison) {
      return { isSuccess: false, message: "Failed to create comparison" }
    }

    return {
      isSuccess: true,
      message: "Comparison created successfully",
      data: newComparison
    }
  } catch (error) {
    console.error("Error creating comparison:", error)
    return { isSuccess: false, message: "Failed to create comparison" }
  }
}

export async function updateComparisonAction(
  comparisonId: string,
  data: Partial<InsertMovingInspectionComparison>
): Promise<ActionState<SelectMovingInspectionComparison>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [updatedComparison] = await db
      .update(movingInspectionComparisonsTable)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(movingInspectionComparisonsTable.id, comparisonId))
      .returning()

    if (!updatedComparison) {
      return { isSuccess: false, message: "Comparison not found" }
    }

    return {
      isSuccess: true,
      message: "Comparison updated successfully",
      data: updatedComparison
    }
  } catch (error) {
    console.error("Error updating comparison:", error)
    return { isSuccess: false, message: "Failed to update comparison" }
  }
}

export async function getComparisonReportAction(
  movingOutInspectionId: string
): Promise<ActionState<SelectMovingInspectionComparison[]>> {
  try {
    const comparisons = await db.query.movingInspectionComparisons.findMany({
      where: eq(movingInspectionComparisonsTable.movingOutInspectionId, movingOutInspectionId),
      with: {
        item: {
          with: {
            category: true
          }
        }
      }
    })

    return {
      isSuccess: true,
      message: "Comparison report retrieved successfully",
      data: comparisons as any
    }
  } catch (error) {
    console.error("Error getting comparison report:", error)
    return { isSuccess: false, message: "Failed to get comparison report" }
  }
}

export async function autoCompareInspectionsOnMoveOutCompletionAction(
  movingOutInspectionId: string
): Promise<ActionState<SelectMovingInspectionComparison[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get move-out inspection
    const [movingOutInspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, movingOutInspectionId))
      .limit(1)

    if (!movingOutInspection || movingOutInspection.inspectionType !== "moving_out") {
      return { isSuccess: false, message: "Move-out inspection not found" }
    }

    // Find corresponding move-in inspection
    const movingInInspections = await db
      .select()
      .from(movingInspectionsTable)
      .where(
        and(
          eq(movingInspectionsTable.leaseAgreementId, movingOutInspection.leaseAgreementId),
          eq(movingInspectionsTable.inspectionType, "moving_in")
        )
      )
      .orderBy(desc(movingInspectionsTable.createdAt))
      .limit(1)

    if (movingInInspections.length === 0) {
      return { isSuccess: false, message: "No corresponding move-in inspection found. Move-out inspections must be linked to a move-in inspection." }
    }

    // Use the most recent move-in inspection
    const movingInInspection = movingInInspections[0]

    // Perform comparison
    const comparisonResult = await compareInspectionsAction(
      movingInInspection.id,
      movingOutInspectionId
    )

    if (!comparisonResult.isSuccess) {
      return comparisonResult
    }

    // Auto-send report to tenant
    const { emailMoveOutReportToTenantAction } = await import("@/actions/inspection-email-actions")
    await emailMoveOutReportToTenantAction(movingOutInspectionId)

    return {
      isSuccess: true,
      message: "Comparison completed and report sent to tenant",
      data: comparisonResult.data || []
    }
  } catch (error) {
    console.error("Error auto-comparing inspections:", error)
    return { isSuccess: false, message: "Failed to auto-compare inspections" }
  }
}

/**
 * Manually trigger comparison for a move-out inspection
 * This can be called from the UI to re-run comparison or trigger it manually
 */
export async function manuallyCompareMoveOutInspectionAction(
  movingOutInspectionId: string,
  sendEmailToTenant: boolean = false
): Promise<ActionState<SelectMovingInspectionComparison[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get move-out inspection
    const [movingOutInspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, movingOutInspectionId))
      .limit(1)

    if (!movingOutInspection || movingOutInspection.inspectionType !== "moving_out") {
      return { isSuccess: false, message: "Move-out inspection not found" }
    }

    // Find corresponding move-in inspection
    const movingInInspections = await db
      .select()
      .from(movingInspectionsTable)
      .where(
        and(
          eq(movingInspectionsTable.leaseAgreementId, movingOutInspection.leaseAgreementId),
          eq(movingInspectionsTable.inspectionType, "moving_in")
        )
      )
      .orderBy(desc(movingInspectionsTable.createdAt))
      .limit(1)

    if (movingInInspections.length === 0) {
      return { isSuccess: false, message: "No corresponding move-in inspection found. Move-out inspections must be linked to a move-in inspection." }
    }

    // Use the most recent move-in inspection
    const movingInInspection = movingInInspections[0]

    // Perform comparison
    const comparisonResult = await compareInspectionsAction(
      movingInInspection.id,
      movingOutInspectionId
    )

    if (!comparisonResult.isSuccess) {
      return comparisonResult
    }

    // Optionally send report to tenant
    if (sendEmailToTenant) {
      const { emailMoveOutReportToTenantAction } = await import("@/actions/inspection-email-actions")
      await emailMoveOutReportToTenantAction(movingOutInspectionId)
    }

    return {
      isSuccess: true,
      message: sendEmailToTenant 
        ? "Comparison completed and report sent to tenant"
        : "Comparison completed successfully",
      data: comparisonResult.data || []
    }
  } catch (error) {
    console.error("Error manually comparing inspections:", error)
    return { isSuccess: false, message: "Failed to compare inspections" }
  }
}

