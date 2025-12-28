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
import { eq, and } from "drizzle-orm"
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

    // Get both inspections with their items
    const movingInInspection = await db.query.movingInspections.findFirst({
      where: eq(movingInspectionsTable.id, movingInInspectionId),
      with: {
        items: {
          orderBy: (items, { asc }) => [asc(items.displayOrder)]
        }
      }
    })

    const movingOutInspection = await db.query.movingInspections.findFirst({
      where: eq(movingInspectionsTable.id, movingOutInspectionId),
      with: {
        items: {
          orderBy: (items, { asc }) => [asc(items.displayOrder)]
        }
      }
    })

    if (!movingInInspection || !movingOutInspection) {
      return { isSuccess: false, message: "One or both inspections not found" }
    }

    if (movingInInspection.inspectionType !== "moving_in" || movingOutInspection.inspectionType !== "moving_out") {
      return { isSuccess: false, message: "Invalid inspection types for comparison" }
    }

    // Create comparison records for matching items
    const comparisons: InsertMovingInspectionComparison[] = []

    for (const movingInItem of movingInInspection.items) {
      const movingOutItem = movingOutInspection.items.find(
        item => item.name === movingInItem.name && item.categoryId === movingInItem.categoryId
      )

      if (movingOutItem) {
        // Determine condition change
        let conditionChange: "improved" | "same" | "deteriorated" | "new_defect" = "same"

        if (movingOutItem.condition === "defective" && movingInItem.condition !== "defective") {
          conditionChange = "new_defect"
        } else if (
          (movingInItem.condition === "good" && movingOutItem.condition !== "good") ||
          (movingInItem.condition === "fair" && movingOutItem.condition === "poor")
        ) {
          conditionChange = "deteriorated"
        } else if (
          (movingInItem.condition === "poor" && movingOutItem.condition !== "poor") ||
          (movingInItem.condition === "fair" && movingOutItem.condition === "good")
        ) {
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

