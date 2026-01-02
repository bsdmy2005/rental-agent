"use server"

import { db } from "@/db"
import {
  movingInspectionsTable,
  movingInspectionItemsTable,
  movingInspectionDefectsTable,
  movingInspectionAttachmentsTable,
  movingInspectionDocumentsTable,
  movingInspectionCategoriesTable,
  type InsertMovingInspection,
  type SelectMovingInspection,
  type InsertMovingInspectionItem,
  type SelectMovingInspectionItem,
  type InsertMovingInspectionDefect,
  type SelectMovingInspectionDefect,
  type InsertMovingInspectionAttachment,
  type SelectMovingInspectionAttachment,
  type InsertMovingInspectionDocument,
  type SelectMovingInspectionDocument,
  type SelectMovingInspectionCategory
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, desc, inArray, isNull, asc } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

// Inspection CRUD Operations

export async function createMovingInspectionAction(
  inspection: InsertMovingInspection
): Promise<ActionState<SelectMovingInspection>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [newInspection] = await db
      .insert(movingInspectionsTable)
      .values(inspection)
      .returning()

    if (!newInspection) {
      return { isSuccess: false, message: "Failed to create moving inspection" }
    }

    return {
      isSuccess: true,
      message: "Moving inspection created successfully",
      data: newInspection
    }
  } catch (error) {
    console.error("Error creating moving inspection:", error)
    return { isSuccess: false, message: "Failed to create moving inspection" }
  }
}

export async function getMovingInspectionAction(
  inspectionId: string
): Promise<ActionState<SelectMovingInspection & {
  items: (SelectMovingInspectionItem & {
    category: { name: string; displayOrder: number }
    defects: SelectMovingInspectionDefect[]
    attachments: SelectMovingInspectionAttachment[]
  })[]
  attachments: SelectMovingInspectionAttachment[]
  documents: SelectMovingInspectionDocument[]
}>> {
  try {
    // Get the inspection
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, inspectionId))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Moving inspection not found" }
    }

    // Get items with categories
    const items = await db
      .select({
        id: movingInspectionItemsTable.id,
        inspectionId: movingInspectionItemsTable.inspectionId,
        categoryId: movingInspectionItemsTable.categoryId,
        name: movingInspectionItemsTable.name,
        condition: movingInspectionItemsTable.condition,
        isPresent: movingInspectionItemsTable.isPresent,
        notes: movingInspectionItemsTable.notes,
        roomInstanceNumber: movingInspectionItemsTable.roomInstanceNumber,
        displayOrder: movingInspectionItemsTable.displayOrder,
        confirmedAsPrevious: movingInspectionItemsTable.confirmedAsPrevious,
        moveInItemId: movingInspectionItemsTable.moveInItemId,
        createdAt: movingInspectionItemsTable.createdAt,
        updatedAt: movingInspectionItemsTable.updatedAt,
        category: {
          name: movingInspectionCategoriesTable.name,
          displayOrder: movingInspectionCategoriesTable.displayOrder
        }
      })
      .from(movingInspectionItemsTable)
      .innerJoin(
        movingInspectionCategoriesTable,
        eq(movingInspectionItemsTable.categoryId, movingInspectionCategoriesTable.id)
      )
      .where(eq(movingInspectionItemsTable.inspectionId, inspectionId))
      .orderBy(movingInspectionItemsTable.displayOrder)

    // Get defects for all items
    const itemIds = items.map(item => item.id)
    const defects = itemIds.length > 0
      ? await db
          .select()
          .from(movingInspectionDefectsTable)
          .where(inArray(movingInspectionDefectsTable.itemId, itemIds))
      : []

    // Get attachments for all items
    const itemAttachments = itemIds.length > 0
      ? await db
          .select()
          .from(movingInspectionAttachmentsTable)
          .where(inArray(movingInspectionAttachmentsTable.itemId, itemIds))
      : []

    // Get inspection-level attachments (where itemId is null)
    const inspectionAttachments = await db
      .select()
      .from(movingInspectionAttachmentsTable)
      .where(
        and(
          eq(movingInspectionAttachmentsTable.inspectionId, inspectionId),
          isNull(movingInspectionAttachmentsTable.itemId)
        )
      )

    // Get documents
    const documents = await db
      .select()
      .from(movingInspectionDocumentsTable)
      .where(eq(movingInspectionDocumentsTable.inspectionId, inspectionId))

    // Group defects and attachments by item
    const defectsByItem = new Map<string, SelectMovingInspectionDefect[]>()
    const attachmentsByItem = new Map<string, SelectMovingInspectionAttachment[]>()

    defects.forEach(defect => {
      if (!defectsByItem.has(defect.itemId)) {
        defectsByItem.set(defect.itemId, [])
      }
      defectsByItem.get(defect.itemId)!.push(defect)
    })

    itemAttachments.forEach(attachment => {
      if (attachment.itemId) {
        if (!attachmentsByItem.has(attachment.itemId)) {
          attachmentsByItem.set(attachment.itemId, [])
        }
        attachmentsByItem.get(attachment.itemId)!.push(attachment)
      }
    })

    // Combine items with their defects and attachments
    const itemsWithRelations = items.map(item => ({
      ...item,
      defects: defectsByItem.get(item.id) || [],
      attachments: attachmentsByItem.get(item.id) || []
    }))

    const result = {
      ...inspection,
      items: itemsWithRelations,
      attachments: inspectionAttachments,
      documents
    }

    return {
      isSuccess: true,
      message: "Moving inspection retrieved successfully",
      data: result as any
    }
  } catch (error) {
    console.error("Error getting moving inspection:", error)
    return { isSuccess: false, message: "Failed to get moving inspection" }
  }
}

export async function getMovingInspectionsByLeaseAction(
  leaseAgreementId: string
): Promise<ActionState<SelectMovingInspection[]>> {
  try {
    const inspections = await db.query.movingInspections.findMany({
      where: eq(movingInspectionsTable.leaseAgreementId, leaseAgreementId),
      orderBy: (inspections, { desc }) => [desc(inspections.createdAt)]
    })

    return {
      isSuccess: true,
      message: "Moving inspections retrieved successfully",
      data: inspections
    }
  } catch (error) {
    console.error("Error getting moving inspections:", error)
    return { isSuccess: false, message: "Failed to get moving inspections" }
  }
}

export async function updateMovingInspectionStatusAction(
  inspectionId: string,
  status: "draft" | "in_progress" | "completed" | "signed"
): Promise<ActionState<SelectMovingInspection>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get current inspection to check type
    const [currentInspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, inspectionId))
      .limit(1)

    if (!currentInspection) {
      return { isSuccess: false, message: "Moving inspection not found" }
    }

    const [updatedInspection] = await db
      .update(movingInspectionsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(movingInspectionsTable.id, inspectionId))
      .returning()

    if (!updatedInspection) {
      return { isSuccess: false, message: "Moving inspection not found" }
    }

    // Auto-trigger comparison if move-out inspection is completed
    if (
      status === "completed" &&
      currentInspection.inspectionType === "moving_out"
    ) {
      const { autoCompareInspectionsOnMoveOutCompletionAction } = await import(
        "@/actions/moving-inspection-comparisons-actions"
      )
      // Don't await - let it run in background
      autoCompareInspectionsOnMoveOutCompletionAction(inspectionId).catch((error) => {
        console.error("Error auto-comparing inspections:", error)
      })
    }

    return {
      isSuccess: true,
      message: "Moving inspection status updated successfully",
      data: updatedInspection
    }
  } catch (error) {
    console.error("Error updating moving inspection status:", error)
    return { isSuccess: false, message: "Failed to update moving inspection status" }
  }
}

export async function signMovingInspectionAction(
  inspectionId: string,
  signerType: "tenant" | "landlord",
  signatureData: Record<string, unknown>
): Promise<ActionState<SelectMovingInspection>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const inspection = await db.query.movingInspections.findFirst({
      where: eq(movingInspectionsTable.id, inspectionId)
    })

    if (!inspection) {
      return { isSuccess: false, message: "Moving inspection not found" }
    }

    const updateData: Partial<InsertMovingInspection> = {}
    if (signerType === "tenant") {
      updateData.signedByTenant = true
      updateData.tenantSignatureData = signatureData as any
    } else {
      updateData.signedByLandlord = true
      updateData.landlordSignatureData = signatureData as any
    }

    // If both parties have signed, set signedAt
    const bothSigned =
      (signerType === "tenant" && inspection.signedByLandlord) ||
      (signerType === "landlord" && inspection.signedByTenant)

    if (bothSigned) {
      updateData.signedAt = new Date()
      updateData.status = "signed"
    }

    const [updatedInspection] = await db
      .update(movingInspectionsTable)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(movingInspectionsTable.id, inspectionId))
      .returning()

    if (!updatedInspection) {
      return { isSuccess: false, message: "Failed to sign moving inspection" }
    }

    return {
      isSuccess: true,
      message: "Moving inspection signed successfully",
      data: updatedInspection
    }
  } catch (error) {
    console.error("Error signing moving inspection:", error)
    return { isSuccess: false, message: "Failed to sign moving inspection" }
  }
}

export async function createMovingOutFromMovingInAction(
  movingInInspectionId: string
): Promise<ActionState<SelectMovingInspection>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Query inspection directly (manual join to avoid referencedTable error)
    const [movingInInspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, movingInInspectionId))
      .limit(1)

    if (!movingInInspection) {
      return { isSuccess: false, message: "Moving-in inspection not found" }
    }

    if (movingInInspection.inspectionType !== "moving_in") {
      return { isSuccess: false, message: "Inspection is not a moving-in inspection" }
    }

    if (movingInInspection.status !== "completed" && movingInInspection.status !== "signed") {
      return { isSuccess: false, message: "Moving-in inspection must be completed or signed" }
    }

    // Query items separately
    const movingInItems = await db
      .select()
      .from(movingInspectionItemsTable)
      .where(eq(movingInspectionItemsTable.inspectionId, movingInInspectionId))
      .orderBy(asc(movingInspectionItemsTable.displayOrder))

    // Create moving-out inspection with locked structure and component configuration
    const movingOutInspection: InsertMovingInspection = {
      leaseAgreementId: movingInInspection.leaseAgreementId,
      inspectionType: "moving_out",
      status: "draft",
      inspectedBy: userId,
      isLocked: true, // Lock structure to match move-in
      componentConfiguration: movingInInspection.componentConfiguration // Copy component config
    }

    const [newMovingOutInspection] = await db
      .insert(movingInspectionsTable)
      .values(movingOutInspection)
      .returning()

    if (!newMovingOutInspection) {
      return { isSuccess: false, message: "Failed to create moving-out inspection" }
    }

    // Copy items from moving-in inspection (locked structure - same items)
    const itemsToCreate: InsertMovingInspectionItem[] = movingInItems.map(
      (item) => ({
        inspectionId: newMovingOutInspection.id,
        categoryId: item.categoryId,
        name: item.name,
        condition: item.condition, // Copy condition from move-in as initial state
        isPresent: null, // Reset Yes/No status (deprecated)
        notes: null, // Reset comments
        roomInstanceNumber: item.roomInstanceNumber, // Preserve room instance
        displayOrder: item.displayOrder,
        confirmedAsPrevious: false, // Default to not confirmed
        moveInItemId: item.id // Link to move-in item
      })
    )

    if (itemsToCreate.length > 0) {
      await db.insert(movingInspectionItemsTable).values(itemsToCreate)
    }

    return {
      isSuccess: true,
      message: "Moving-out inspection created successfully",
      data: newMovingOutInspection
    }
  } catch (error) {
    console.error("Error creating moving-out inspection:", error)
    return { isSuccess: false, message: "Failed to create moving-out inspection" }
  }
}

export async function getRepairableDefectsAction(
  inspectionId: string
): Promise<ActionState<Array<SelectMovingInspectionDefect & { item: { name: string } }>>> {
  try {
    // Get all items for this inspection
    const items = await db.query.movingInspectionItems.findMany({
      where: eq(movingInspectionItemsTable.inspectionId, inspectionId),
      with: {
        defects: {
          where: (defects, { eq }) => eq(defects.isRepairable, true)
        }
      }
    })

    // Flatten defects with item info
    const repairableDefects = items.flatMap((item) =>
      item.defects.map((defect) => ({
        ...defect,
        item: { name: item.name }
      }))
    )

    return {
      isSuccess: true,
      message: "Repairable defects retrieved successfully",
      data: repairableDefects as any
    }
  } catch (error) {
    console.error("Error getting repairable defects:", error)
    return { isSuccess: false, message: "Failed to get repairable defects" }
  }
}

// Item CRUD Operations

export async function createMovingInspectionItemAction(
  item: InsertMovingInspectionItem
): Promise<ActionState<SelectMovingInspectionItem>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Check if inspection is locked
    const inspection = await db.query.movingInspections.findFirst({
      where: eq(movingInspectionsTable.id, item.inspectionId)
    })

    if (inspection?.isLocked) {
      return { isSuccess: false, message: "Cannot add items to locked inspection" }
    }

    const [newItem] = await db.insert(movingInspectionItemsTable).values(item).returning()

    if (!newItem) {
      return { isSuccess: false, message: "Failed to create inspection item" }
    }

    return {
      isSuccess: true,
      message: "Inspection item created successfully",
      data: newItem
    }
  } catch (error) {
    console.error("Error creating inspection item:", error)
    return { isSuccess: false, message: "Failed to create inspection item" }
  }
}

export async function updateMovingInspectionItemAction(
  itemId: string,
  data: Partial<InsertMovingInspectionItem>
): Promise<ActionState<SelectMovingInspectionItem>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get item and inspection in one query using join
    const [itemWithInspection] = await db
      .select({
        item: movingInspectionItemsTable,
        inspection: movingInspectionsTable
      })
      .from(movingInspectionItemsTable)
      .innerJoin(
        movingInspectionsTable,
        eq(movingInspectionItemsTable.inspectionId, movingInspectionsTable.id)
      )
      .where(eq(movingInspectionItemsTable.id, itemId))
      .limit(1)

    if (!itemWithInspection) {
      return { isSuccess: false, message: "Inspection item not found" }
    }

    const { item, inspection } = itemWithInspection

    // Check if inspection is fully signed (both parties have signed)
    const isThirdPartyInspection = inspection.inspectedByThirdParty === true || 
                                    (inspection.signedByInspector === true && inspection.inspectorAccessToken !== null)
    
    const isFullySigned = inspection.status === "signed" || 
                         (isThirdPartyInspection 
                           ? inspection.signedByInspector && inspection.signedByTenant
                           : inspection.signedByLandlord && inspection.signedByTenant)

    // If fully signed, prevent all edits
    if (isFullySigned) {
      return {
        isSuccess: false,
        message: "Cannot update inspection items. This inspection has been fully signed by all parties and is locked."
      }
    }

    // If inspection is locked, only allow condition, notes, and confirmedAsPrevious updates
    if (inspection.isLocked) {
      const allowedFields: (keyof InsertMovingInspectionItem)[] = ["condition", "notes", "confirmedAsPrevious"]
      const restrictedFields = Object.keys(data).filter(
        (key) => !allowedFields.includes(key as keyof InsertMovingInspectionItem)
      )

      if (restrictedFields.length > 0) {
        return {
          isSuccess: false,
          message: `Cannot update locked fields: ${restrictedFields.join(", ")}. Only condition, notes, and confirmedAsPrevious can be updated.`
        }
      }
    }

    const [updatedItem] = await db
      .update(movingInspectionItemsTable)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(movingInspectionItemsTable.id, itemId))
      .returning()

    if (!updatedItem) {
      return { isSuccess: false, message: "Inspection item not found" }
    }

    return {
      isSuccess: true,
      message: "Inspection item updated successfully",
      data: updatedItem
    }
  } catch (error) {
    console.error("Error updating inspection item:", error)
    return { isSuccess: false, message: "Failed to update inspection item" }
  }
}

type ItemCondition = "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning"

export async function updateMovingInspectionItemsBulkAction(
  itemIds: string[],
  condition: ItemCondition
): Promise<ActionState<SelectMovingInspectionItem[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    if (itemIds.length === 0) {
      return { isSuccess: false, message: "No items provided" }
    }

    // Validate all items belong to same inspection and inspection is locked
    const items = await db
      .select({
        item: movingInspectionItemsTable,
        inspection: movingInspectionsTable
      })
      .from(movingInspectionItemsTable)
      .innerJoin(
        movingInspectionsTable,
        eq(movingInspectionItemsTable.inspectionId, movingInspectionsTable.id)
      )
      .where(inArray(movingInspectionItemsTable.id, itemIds))

    if (items.length !== itemIds.length) {
      return { isSuccess: false, message: "Some items not found" }
    }

    // Check all items belong to same inspection
    const inspectionIds = new Set(items.map((i) => i.inspection.id))
    if (inspectionIds.size > 1) {
      return { isSuccess: false, message: "All items must belong to the same inspection" }
    }

    const inspection = items[0].inspection
    if (!inspection.isLocked) {
      return { isSuccess: false, message: "Inspection must be locked to update items" }
    }

    // Check if inspection is fully signed (both parties have signed)
    const isThirdPartyInspection = inspection.inspectedByThirdParty === true || 
                                    (inspection.signedByInspector === true && inspection.inspectorAccessToken !== null)
    
    const isFullySigned = inspection.status === "signed" || 
                         (isThirdPartyInspection 
                           ? inspection.signedByInspector && inspection.signedByTenant
                           : inspection.signedByLandlord && inspection.signedByTenant)

    if (isFullySigned) {
      return { isSuccess: false, message: "Cannot update inspection items. This inspection has been fully signed by all parties and is locked." }
    }

    // Use transaction for atomic updates
    const updatedItems = await db.transaction(async (tx) => {
      return await tx
        .update(movingInspectionItemsTable)
        .set({ condition, updatedAt: new Date() })
        .where(inArray(movingInspectionItemsTable.id, itemIds))
        .returning()
    })

    return {
      isSuccess: true,
      message: `Successfully updated ${updatedItems.length} items`,
      data: updatedItems
    }
  } catch (error) {
    console.error("Error updating inspection items in bulk:", error)
    return { isSuccess: false, message: "Failed to update inspection items" }
  }
}

export async function updateMovingInspectionItemsBulkFromAIAction(
  updates: Array<{ itemId: string; condition: ItemCondition; notes?: string }>
): Promise<ActionState<SelectMovingInspectionItem[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    if (updates.length === 0) {
      return { isSuccess: false, message: "No updates provided" }
    }

    const itemIds = updates.map((u) => u.itemId)

    // Validate all items belong to same inspection and inspection is locked
    const items = await db
      .select({
        item: movingInspectionItemsTable,
        inspection: movingInspectionsTable
      })
      .from(movingInspectionItemsTable)
      .innerJoin(
        movingInspectionsTable,
        eq(movingInspectionItemsTable.inspectionId, movingInspectionsTable.id)
      )
      .where(inArray(movingInspectionItemsTable.id, itemIds))

    if (items.length !== itemIds.length) {
      return { isSuccess: false, message: "Some items not found" }
    }

    // Check all items belong to same inspection
    const inspectionIds = new Set(items.map((i) => i.inspection.id))
    if (inspectionIds.size > 1) {
      return { isSuccess: false, message: "All items must belong to the same inspection" }
    }

    const inspection = items[0].inspection
    if (!inspection.isLocked) {
      return { isSuccess: false, message: "Inspection must be locked to update items" }
    }

    // Check if inspection is fully signed (both parties have signed)
    const isThirdPartyInspection = inspection.inspectedByThirdParty === true || 
                                    (inspection.signedByInspector === true && inspection.inspectorAccessToken !== null)
    
    const isFullySigned = inspection.status === "signed" || 
                         (isThirdPartyInspection 
                           ? inspection.signedByInspector && inspection.signedByTenant
                           : inspection.signedByLandlord && inspection.signedByTenant)

    if (isFullySigned) {
      return { isSuccess: false, message: "Cannot update inspection items. This inspection has been fully signed by all parties and is locked." }
    }

    // Use transaction for atomic updates
    const updatedItems = await db.transaction(async (tx) => {
      const results: SelectMovingInspectionItem[] = []
      for (const update of updates) {
        const [updated] = await tx
          .update(movingInspectionItemsTable)
          .set({
            condition: update.condition,
            notes: update.notes || null,
            updatedAt: new Date()
          })
          .where(eq(movingInspectionItemsTable.id, update.itemId))
          .returning()
        if (updated) {
          results.push(updated)
        }
      }
      return results
    })

    return {
      isSuccess: true,
      message: `Successfully updated ${updatedItems.length} items`,
      data: updatedItems
    }
  } catch (error) {
    console.error("Error updating inspection items from AI in bulk:", error)
    return { isSuccess: false, message: "Failed to update inspection items" }
  }
}

export async function deleteMovingInspectionItemAction(
  itemId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get item to check inspection
    const [item] = await db
      .select()
      .from(movingInspectionItemsTable)
      .where(eq(movingInspectionItemsTable.id, itemId))
      .limit(1)

    if (!item) {
      return { isSuccess: false, message: "Inspection item not found" }
    }

    // Get inspection to check if locked
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, item.inspectionId))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Inspection not found" }
    }

    // Cannot delete items from locked inspection
    if (inspection.isLocked) {
      return { isSuccess: false, message: "Cannot delete items from locked inspection" }
    }

    await db.delete(movingInspectionItemsTable).where(eq(movingInspectionItemsTable.id, itemId))

    return {
      isSuccess: true,
      message: "Inspection item deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting inspection item:", error)
    return { isSuccess: false, message: "Failed to delete inspection item" }
  }
}

// Defect CRUD Operations

export async function createMovingInspectionDefectAction(
  defect: InsertMovingInspectionDefect
): Promise<ActionState<SelectMovingInspectionDefect>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [newDefect] = await db.insert(movingInspectionDefectsTable).values(defect).returning()

    if (!newDefect) {
      return { isSuccess: false, message: "Failed to create defect" }
    }

    return {
      isSuccess: true,
      message: "Defect created successfully",
      data: newDefect
    }
  } catch (error) {
    console.error("Error creating defect:", error)
    return { isSuccess: false, message: "Failed to create defect" }
  }
}

export async function updateMovingInspectionDefectAction(
  defectId: string,
  data: Partial<InsertMovingInspectionDefect>
): Promise<ActionState<SelectMovingInspectionDefect>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [updatedDefect] = await db
      .update(movingInspectionDefectsTable)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(movingInspectionDefectsTable.id, defectId))
      .returning()

    if (!updatedDefect) {
      return { isSuccess: false, message: "Defect not found" }
    }

    return {
      isSuccess: true,
      message: "Defect updated successfully",
      data: updatedDefect
    }
  } catch (error) {
    console.error("Error updating defect:", error)
    return { isSuccess: false, message: "Failed to update defect" }
  }
}

export async function markDefectAsRepairableAction(
  defectId: string,
  isRepairable: boolean
): Promise<ActionState<SelectMovingInspectionDefect>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    return await updateMovingInspectionDefectAction(defectId, { isRepairable })
  } catch (error) {
    console.error("Error marking defect as repairable:", error)
    return { isSuccess: false, message: "Failed to mark defect as repairable" }
  }
}

export async function deleteMovingInspectionDefectAction(
  defectId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    await db
      .delete(movingInspectionDefectsTable)
      .where(eq(movingInspectionDefectsTable.id, defectId))

    return {
      isSuccess: true,
      message: "Defect deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting defect:", error)
    return { isSuccess: false, message: "Failed to delete defect" }
  }
}

// Attachment CRUD Operations

export async function uploadMovingInspectionAttachmentAction(
  attachment: InsertMovingInspectionAttachment
): Promise<ActionState<SelectMovingInspectionAttachment>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [newAttachment] = await db
      .insert(movingInspectionAttachmentsTable)
      .values(attachment)
      .returning()

    if (!newAttachment) {
      return { isSuccess: false, message: "Failed to upload attachment" }
    }

    return {
      isSuccess: true,
      message: "Attachment uploaded successfully",
      data: newAttachment
    }
  } catch (error) {
    console.error("Error uploading attachment:", error)
    return { isSuccess: false, message: "Failed to upload attachment" }
  }
}

export async function deleteMovingInspectionAttachmentAction(
  attachmentId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    await db
      .delete(movingInspectionAttachmentsTable)
      .where(eq(movingInspectionAttachmentsTable.id, attachmentId))

    return {
      isSuccess: true,
      message: "Attachment deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting attachment:", error)
    return { isSuccess: false, message: "Failed to delete attachment" }
  }
}

// Document CRUD Operations

export async function uploadMovingInspectionDocumentAction(
  document: InsertMovingInspectionDocument
): Promise<ActionState<SelectMovingInspectionDocument>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [newDocument] = await db
      .insert(movingInspectionDocumentsTable)
      .values(document)
      .returning()

    if (!newDocument) {
      return { isSuccess: false, message: "Failed to upload document" }
    }

    return {
      isSuccess: true,
      message: "Document uploaded successfully",
      data: newDocument
    }
  } catch (error) {
    console.error("Error uploading document:", error)
    return { isSuccess: false, message: "Failed to upload document" }
  }
}

export async function deleteMovingInspectionDocumentAction(
  documentId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    await db
      .delete(movingInspectionDocumentsTable)
      .where(eq(movingInspectionDocumentsTable.id, documentId))

    return {
      isSuccess: true,
      message: "Document deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting document:", error)
    return { isSuccess: false, message: "Failed to delete document" }
  }
}

// Component-Based Wizard Actions

export async function getActiveLeasesByPropertyAction(
  propertyId: string
): Promise<ActionState<Array<any>>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const { getLeaseAgreementsByPropertyIdQuery } = await import("@/queries/lease-agreements-queries")
    const { tenantsTable, propertiesTable } = await import("@/db/schema")
    const { inArray } = await import("drizzle-orm")

    const leases = await getLeaseAgreementsByPropertyIdQuery(propertyId)

    // Filter for signed leases only
    const signedLeases = leases.filter(
      (lease) => lease.signedByTenant && lease.signedByLandlord
    )

    // Batch fetch tenants and properties
    const tenantIds = [...new Set(signedLeases.map((l) => l.tenantId))]
    const tenants = tenantIds.length > 0
      ? await db.select().from(tenantsTable).where(inArray(tenantsTable.id, tenantIds))
      : []

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, propertyId))
      .limit(1)

    const tenantsMap = new Map(tenants.map((t) => [t.id, t]))

    const leasesWithDetails = signedLeases.map((lease) => ({
      ...lease,
      tenant: tenantsMap.get(lease.tenantId) || null,
      property: property || null
    }))

    return {
      isSuccess: true,
      message: "Active leases retrieved successfully",
      data: leasesWithDetails
    }
  } catch (error) {
    console.error("Error getting active leases:", error)
    return { isSuccess: false, message: "Failed to get active leases" }
  }
}

export interface ComponentConfiguration {
  // All categories that can have multiple instances (number input)
  motorGate?: number
  entranceHall?: number
  lounge?: number
  diningRoom?: number
  familyRoom?: number
  passageStairs?: number
  kitchenScullery?: number
  pantry?: number
  bedrooms?: number
  bathrooms?: number
  garages?: number
  pool?: number
  patioBalcony?: number
  garden?: number
  general?: number
  other?: number
}

export async function getItemsForComponentsAction(
  components: ComponentConfiguration
): Promise<ActionState<Array<{ categoryName: string; items: Array<{ name: string; displayOrder: number; roomInstanceNumber?: number }> }>>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const { movingInspectionItemsTemplate } = await import("@/db/seed/data/moving-inspection-items")

    const itemsByCategory: Array<{ categoryName: string; items: Array<{ name: string; displayOrder: number; roomInstanceNumber?: number }> }> = []

    // Category mapping: config key -> category name
    const categoryMap: Array<{ key: keyof ComponentConfiguration; categoryName: string }> = [
      { key: "motorGate", categoryName: "Motor Gate" },
      { key: "entranceHall", categoryName: "Entrance Hall" },
      { key: "lounge", categoryName: "Lounge" },
      { key: "diningRoom", categoryName: "Dining Room" },
      { key: "familyRoom", categoryName: "Family Room" },
      { key: "passageStairs", categoryName: "Passage / Stairs" },
      { key: "kitchenScullery", categoryName: "Kitchen & Scullery" },
      { key: "pantry", categoryName: "Pantry" },
      { key: "bedrooms", categoryName: "Main Bedroom" }, // Special handling for bedrooms
      { key: "bathrooms", categoryName: "Bathrooms" },
      { key: "garages", categoryName: "Garages" },
      { key: "pool", categoryName: "Pool" },
      { key: "patioBalcony", categoryName: "Patio / Balcony" },
      { key: "garden", categoryName: "Garden" },
      { key: "general", categoryName: "General" },
      { key: "other", categoryName: "Other" }
    ]

    // Process each category from configuration
    for (const { key, categoryName } of categoryMap) {
      const count = components[key] as number | undefined
      
      if (count !== undefined && count > 0) {
        // Special handling for bedrooms
        if (key === "bedrooms") {
          const mainBedroomItems = movingInspectionItemsTemplate["Main Bedroom"] || []
          const otherBedroomItems = movingInspectionItemsTemplate["Other Bedrooms"] || []
          for (let i = 1; i <= count; i++) {
            const items = i === 1 ? mainBedroomItems : otherBedroomItems
            itemsByCategory.push({
              categoryName: i === 1 ? "Main Bedroom" : "Other Bedrooms",
              items: items.map(item => ({ 
                name: item.name, 
                displayOrder: item.displayOrder, 
                roomInstanceNumber: i 
              }))
            })
          }
        } else {
          // For all other categories
          const templateItems = movingInspectionItemsTemplate[categoryName] || []
          for (let i = 1; i <= count; i++) {
            itemsByCategory.push({
              categoryName,
              items: templateItems.map(item => ({ 
                name: item.name, 
                displayOrder: item.displayOrder, 
                roomInstanceNumber: count > 1 ? i : undefined 
              }))
            })
          }
        }
      }
    }

    return {
      isSuccess: true,
      message: "Items for components retrieved successfully",
      data: itemsByCategory
    }
  } catch (error) {
    console.error("Error getting items for components:", error)
    return { isSuccess: false, message: "Failed to get items for components" }
  }
}

export async function initializeInspectionFromComponentsAction(
  leaseAgreementId: string,
  componentConfiguration: ComponentConfiguration,
  customItems?: Array<{ categoryId: string; name: string; displayOrder: number }>
): Promise<ActionState<SelectMovingInspection>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Verify lease is signed
    const { getLeaseAgreementByIdQuery } = await import("@/queries/lease-agreements-queries")
    const lease = await getLeaseAgreementByIdQuery(leaseAgreementId)
    
    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    if (!lease.signedByTenant || !lease.signedByLandlord) {
      return { isSuccess: false, message: "Lease must be signed by both parties" }
    }

    // Check if a move-in inspection already exists for this lease
    const existingMoveInInspections = await db
      .select()
      .from(movingInspectionsTable)
      .where(
        and(
          eq(movingInspectionsTable.leaseAgreementId, leaseAgreementId),
          eq(movingInspectionsTable.inspectionType, "moving_in")
        )
      )
      .limit(1)

    if (existingMoveInInspections.length > 0) {
      return { isSuccess: false, message: "A move-in inspection already exists for this lease" }
    }

    // Create inspection with component configuration
    const [newInspection] = await db
      .insert(movingInspectionsTable)
      .values({
        leaseAgreementId,
        inspectionType: "moving_in",
        status: "draft",
        inspectedBy: userId,
        isLocked: false, // Will be locked after wizard completion
        componentConfiguration: componentConfiguration as any
      })
      .returning()

    if (!newInspection) {
      return { isSuccess: false, message: "Failed to create inspection" }
    }

    // Get items for components
    const itemsResult = await getItemsForComponentsAction(componentConfiguration)
    if (!itemsResult.isSuccess) {
      return { isSuccess: false, message: "Failed to get items for components" }
    }

    // Get categories
    const categories = await db.query.movingInspectionCategories.findMany()
    const categoriesMap = new Map(categories.map((c) => [c.name, c.id]))

    // Create items from components
    const itemsToCreate: InsertMovingInspectionItem[] = []
    let displayOrder = 1

    for (const categoryData of itemsResult.data || []) {
      const categoryId = categoriesMap.get(categoryData.categoryName)
      if (!categoryId) continue

      for (const item of categoryData.items) {
        // Build item object - omit condition to allow database to handle null/default
        const itemToCreate: InsertMovingInspectionItem = {
          inspectionId: newInspection.id,
          categoryId,
          name: item.name,
          displayOrder: item.displayOrder || displayOrder++,
          roomInstanceNumber: item.roomInstanceNumber || null
        }
        // Condition is omitted - user must select it later
        itemsToCreate.push(itemToCreate)
      }
    }

    // Add custom items
    if (customItems && customItems.length > 0) {
      for (const customItem of customItems) {
        // Build custom item object - omit condition to allow database to handle null/default
        const customItemToCreate: InsertMovingInspectionItem = {
          inspectionId: newInspection.id,
          categoryId: customItem.categoryId,
          name: customItem.name,
          displayOrder: customItem.displayOrder || displayOrder++,
          roomInstanceNumber: null
        }
        // Condition is omitted - user must select it later
        itemsToCreate.push(customItemToCreate)
      }
    }

    if (itemsToCreate.length > 0) {
      await db.insert(movingInspectionItemsTable).values(itemsToCreate)
    }

    return {
      isSuccess: true,
      message: "Inspection initialized successfully",
      data: newInspection
    }
  } catch (error) {
    console.error("Error initializing inspection from components:", error)
    return { isSuccess: false, message: "Failed to initialize inspection" }
  }
}

export async function lockInspectionStructureAction(
  inspectionId: string
): Promise<ActionState<SelectMovingInspection>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [updatedInspection] = await db
      .update(movingInspectionsTable)
      .set({
        isLocked: true,
        updatedAt: new Date()
      })
      .where(eq(movingInspectionsTable.id, inspectionId))
      .returning()

    if (!updatedInspection) {
      return { isSuccess: false, message: "Inspection not found" }
    }

    return {
      isSuccess: true,
      message: "Inspection structure locked successfully",
      data: updatedInspection
    }
  } catch (error) {
    console.error("Error locking inspection structure:", error)
    return { isSuccess: false, message: "Failed to lock inspection structure" }
  }
}

export async function validateInspectionStructureAction(
  moveInInspectionId: string,
  moveOutInspectionId: string
): Promise<ActionState<{ isValid: boolean; differences: string[] }>> {
  try {
    const moveIn = await db.query.movingInspections.findFirst({
      where: eq(movingInspectionsTable.id, moveInInspectionId),
      with: {
        items: {
          orderBy: (items, { asc }) => [asc(items.displayOrder)]
        }
      }
    })

    const moveOut = await db.query.movingInspections.findFirst({
      where: eq(movingInspectionsTable.id, moveOutInspectionId),
      with: {
        items: {
          orderBy: (items, { asc }) => [asc(items.displayOrder)]
        }
      }
    })

    if (!moveIn || !moveOut) {
      return { isSuccess: false, message: "One or both inspections not found" }
    }

    const differences: string[] = []

    if (moveIn.items.length !== moveOut.items.length) {
      differences.push(`Item count mismatch: ${moveIn.items.length} vs ${moveOut.items.length}`)
    }

    // Check item structure matches
    const moveInItemsMap = new Map(
      moveIn.items.map((item) => [`${item.categoryId}-${item.name}-${item.roomInstanceNumber || 0}`, item])
    )
    const moveOutItemsMap = new Map(
      moveOut.items.map((item) => [`${item.categoryId}-${item.name}-${item.roomInstanceNumber || 0}`, item])
    )

    for (const [key, moveInItem] of moveInItemsMap) {
      if (!moveOutItemsMap.has(key)) {
        differences.push(`Missing item in move-out: ${moveInItem.name}`)
      }
    }

    for (const [key, moveOutItem] of moveOutItemsMap) {
      if (!moveInItemsMap.has(key)) {
        differences.push(`Extra item in move-out: ${moveOutItem.name}`)
      }
    }

    return {
      isSuccess: true,
      message: "Structure validation completed",
      data: {
        isValid: differences.length === 0,
        differences
      }
    }
  } catch (error) {
    console.error("Error validating inspection structure:", error)
    return { isSuccess: false, message: "Failed to validate inspection structure" }
  }
}

export async function getMovingInspectionCategoriesAction(): Promise<ActionState<SelectMovingInspectionCategory[]>> {
  try {
    const categories = await db.query.movingInspectionCategories.findMany({
      orderBy: (categories, { asc }) => [asc(categories.displayOrder)]
    })

    return {
      isSuccess: true,
      message: "Categories retrieved successfully",
      data: categories
    }
  } catch (error) {
    console.error("Error getting categories:", error)
    return { isSuccess: false, message: "Failed to get categories" }
  }
}

export async function createMovingInspectionCategoryAction(
  name: string
): Promise<ActionState<SelectMovingInspectionCategory>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Check if category already exists
    const existing = await db.query.movingInspectionCategories.findFirst({
      where: (categories, { eq }) => eq(categories.name, name)
    })

    if (existing) {
      return {
        isSuccess: true,
        message: "Category already exists",
        data: existing
      }
    }

    // Get max display order
    const categories = await db.query.movingInspectionCategories.findMany({
      orderBy: (categories, { desc }) => [desc(categories.displayOrder)]
    })
    const maxDisplayOrder = categories[0]?.displayOrder || 0

    const [newCategory] = await db
      .insert(movingInspectionCategoriesTable)
      .values({
        name: name.trim(),
        displayOrder: maxDisplayOrder + 1
      })
      .returning()

    if (!newCategory) {
      return { isSuccess: false, message: "Failed to create category" }
    }

    return {
      isSuccess: true,
      message: "Category created successfully",
      data: newCategory
    }
  } catch (error) {
    console.error("Error creating category:", error)
    return { isSuccess: false, message: "Failed to create category" }
  }
}

export interface EditableRoom {
  id: string
  categoryName: string
  categoryId?: string
  roomInstanceNumber?: number
  isInstance?: boolean
  isCustom?: boolean
  items: Array<{
    id: string
    name: string
    displayOrder: number
    isCustom?: boolean
  }>
}

export async function initializeInspectionFromRoomsAction(
  leaseAgreementId: string,
  rooms: EditableRoom[]
): Promise<ActionState<SelectMovingInspection>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Verify lease is signed
    const { getLeaseAgreementByIdQuery } = await import("@/queries/lease-agreements-queries")
    const lease = await getLeaseAgreementByIdQuery(leaseAgreementId)
    
    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    if (!lease.signedByTenant || !lease.signedByLandlord) {
      return { isSuccess: false, message: "Lease must be signed by both parties" }
    }

    // Check if a move-in inspection already exists for this lease
    const existingMoveInInspections = await db
      .select()
      .from(movingInspectionsTable)
      .where(
        and(
          eq(movingInspectionsTable.leaseAgreementId, leaseAgreementId),
          eq(movingInspectionsTable.inspectionType, "moving_in")
        )
      )
      .limit(1)

    if (existingMoveInInspections.length > 0) {
      return { isSuccess: false, message: "A move-in inspection already exists for this lease" }
    }

    // Get all categories
    const categories = await db.query.movingInspectionCategories.findMany()
    const categoriesMap = new Map(categories.map((c) => [c.name, c.id]))

    // Create inspection
    const [newInspection] = await db
      .insert(movingInspectionsTable)
      .values({
        leaseAgreementId,
        inspectionType: "moving_in",
        status: "draft",
        inspectedBy: userId,
        isLocked: false, // Will be locked after wizard completion
        componentConfiguration: null // Not using component config in this flow
      })
      .returning()

    if (!newInspection) {
      return { isSuccess: false, message: "Failed to create inspection" }
    }

    // Create items from rooms
    const itemsToCreate: InsertMovingInspectionItem[] = []

    for (const room of rooms) {
      // Get or create category
      let categoryId = room.categoryId

      if (!categoryId) {
        // Find category by name
        categoryId = categoriesMap.get(room.categoryName)
      }

      if (!categoryId) {
        // Create new category if it doesn't exist (for custom rooms)
        const [newCategory] = await db
          .insert(movingInspectionCategoriesTable)
          .values({
            name: room.categoryName,
            displayOrder: categories.length + 1
          })
          .returning()

        if (newCategory) {
          categoryId = newCategory.id
          categoriesMap.set(room.categoryName, categoryId)
        } else {
          console.error(`Failed to create category: ${room.categoryName}`)
          continue
        }
      }

      // Create items for this room
      for (const item of room.items) {
        if (!item.name.trim()) continue // Skip empty items

        // Build item object - condition is nullable, so we omit it to let database handle default/null
        const itemToCreate: InsertMovingInspectionItem = {
          inspectionId: newInspection.id,
          categoryId,
          name: item.name.trim(),
          displayOrder: item.displayOrder,
          roomInstanceNumber: room.roomInstanceNumber || null
        }
        // Only include condition if it's explicitly set (for now, we don't set it - user must select)
        // Omitting condition field allows database to use its default/null behavior
        
        itemsToCreate.push(itemToCreate)
      }
    }

    // Insert all items
    if (itemsToCreate.length > 0) {
      await db.insert(movingInspectionItemsTable).values(itemsToCreate)
    }

    return {
      isSuccess: true,
      message: "Inspection initialized successfully",
      data: newInspection
    }
  } catch (error) {
    console.error("Error initializing inspection from rooms:", error)
    return { isSuccess: false, message: "Failed to initialize inspection" }
  }
}

export async function deleteMovingInspectionAction(
  inspectionId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get inspection to verify it exists
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, inspectionId))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Moving inspection not found" }
    }

    // Delete the inspection (cascade will handle related items, defects, attachments, etc.)
    await db
      .delete(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, inspectionId))

    return {
      isSuccess: true,
      message: "Moving inspection deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting moving inspection:", error)
    return { isSuccess: false, message: "Failed to delete moving inspection" }
  }
}

/**
 * Get inspection by tenant access token (for public access)
 */
export async function getInspectionByTokenAction(
  token: string
): Promise<ActionState<SelectMovingInspection & {
  items: (SelectMovingInspectionItem & {
    category: { name: string; displayOrder: number }
    defects: SelectMovingInspectionDefect[]
  })[]
  property: any
  tenant: any
  lease: any
}>> {
  try {
    if (!token || token.trim() === "") {
      return { isSuccess: false, message: "Access token is required" }
    }

    // Find inspection by tenantAccessToken
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.tenantAccessToken, token))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Invalid access token. Please use the link from your email." }
    }

    // Check signing requirements:
    // - If third-party inspection: inspector must have signed
    // - If direct inspection: landlord must have signed
    // Check if it's a third-party inspection (either flag is set OR inspector has signed)
    const isThirdPartyInspection = inspection.inspectedByThirdParty === true || 
                                    (inspection.signedByInspector === true && inspection.inspectorAccessToken !== null)
    
    if (isThirdPartyInspection) {
      // Third-party inspection: require inspector signature
      if (!inspection.signedByInspector) {
        return { isSuccess: false, message: "The inspector must sign this inspection before you can sign it." }
      }
    } else {
      // Direct inspection: require landlord signature
      if (!inspection.signedByLandlord) {
        return { isSuccess: false, message: "Landlord must sign this inspection before you can sign it." }
      }
    }

    // Get items with categories
    const items = await db
      .select({
        id: movingInspectionItemsTable.id,
        inspectionId: movingInspectionItemsTable.inspectionId,
        categoryId: movingInspectionItemsTable.categoryId,
        name: movingInspectionItemsTable.name,
        condition: movingInspectionItemsTable.condition,
        isPresent: movingInspectionItemsTable.isPresent,
        notes: movingInspectionItemsTable.notes,
        roomInstanceNumber: movingInspectionItemsTable.roomInstanceNumber,
        displayOrder: movingInspectionItemsTable.displayOrder,
        createdAt: movingInspectionItemsTable.createdAt,
        updatedAt: movingInspectionItemsTable.updatedAt,
        category: {
          name: movingInspectionCategoriesTable.name,
          displayOrder: movingInspectionCategoriesTable.displayOrder
        }
      })
      .from(movingInspectionItemsTable)
      .innerJoin(
        movingInspectionCategoriesTable,
        eq(movingInspectionItemsTable.categoryId, movingInspectionCategoriesTable.id)
      )
      .where(eq(movingInspectionItemsTable.inspectionId, inspection.id))
      .orderBy(movingInspectionItemsTable.displayOrder)

    // Get defects for each item
    const itemIds = items.map(item => item.id)
    const defects = itemIds.length > 0
      ? await db
          .select()
          .from(movingInspectionDefectsTable)
          .where(inArray(movingInspectionDefectsTable.itemId, itemIds))
      : []

    // Group defects by item
    const defectsByItem = new Map<string, typeof defects>()
    defects.forEach(defect => {
      if (!defectsByItem.has(defect.itemId)) {
        defectsByItem.set(defect.itemId, [])
      }
      defectsByItem.get(defect.itemId)!.push(defect)
    })

    // Attach defects to items
    const itemsWithDefects = items.map(item => ({
      ...item,
      defects: defectsByItem.get(item.id) || []
    }))

    // Get lease, property, and tenant
    const { leaseAgreementsTable } = await import("@/db/schema")
    const { propertiesTable } = await import("@/db/schema")
    const { tenantsTable } = await import("@/db/schema")

    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, inspection.leaseAgreementId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease not found" }
    }

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, lease.tenantId))
      .limit(1)

    return {
      isSuccess: true,
      message: "Inspection retrieved successfully",
      data: {
        ...inspection,
        items: itemsWithDefects,
        property: property || null,
        tenant: tenant || null,
        lease: lease || null
      } as any
    }
  } catch (error) {
    console.error("Error getting inspection by token:", error)
    return { isSuccess: false, message: "Failed to get inspection" }
  }
}

/**
 * Sign inspection as tenant (via token, no authentication required)
 */
export async function signInspectionAsTenantAction(
  token: string,
  signatureData: any
): Promise<ActionState<SelectMovingInspection>> {
  try {
    if (!token || token.trim() === "") {
      return { isSuccess: false, message: "Access token is required" }
    }

    // Find inspection by tenantAccessToken
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.tenantAccessToken, token))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Invalid access token" }
    }

    // Check if already signed
    if (inspection.signedByTenant) {
      return { isSuccess: false, message: "You have already signed this inspection" }
    }

    // Check signing requirements:
    // - If third-party inspection: inspector must have signed
    // - If direct inspection: landlord must have signed
    // Check if it's a third-party inspection (either flag is set OR inspector has signed)
    const isThirdPartyInspection = inspection.inspectedByThirdParty === true || 
                                    (inspection.signedByInspector === true && inspection.inspectorAccessToken !== null)
    
    if (isThirdPartyInspection) {
      // Third-party inspection: require inspector signature
      if (!inspection.signedByInspector) {
        return { isSuccess: false, message: "The inspector must sign this inspection before you can sign it." }
      }
    } else {
      // Direct inspection: require landlord signature
      if (!inspection.signedByLandlord) {
        return { isSuccess: false, message: "Landlord must sign this inspection before you can sign it." }
      }
    }

    // Update inspection with tenant signature
    const updateData: Partial<InsertMovingInspection> = {
      signedByTenant: true,
      tenantSignatureData: signatureData as any,
      updatedAt: new Date()
    }

    // Determine if inspection will be fully signed after this update
    // For third-party: inspector + tenant (tenant signing now, check if inspector already signed)
    // For direct: landlord + tenant (tenant signing now, check if landlord already signed)
    const isThirdPartyInspectionForSigning = inspection.inspectedByThirdParty === true || 
                                              (inspection.signedByInspector === true && inspection.inspectorAccessToken !== null)
    
    const willBeFullySigned = isThirdPartyInspectionForSigning
      ? inspection.signedByInspector // inspector already signed, tenant signing now
      : inspection.signedByLandlord // landlord already signed, tenant signing now

    if (willBeFullySigned) {
      updateData.signedAt = new Date()
      updateData.status = "signed"
    }

    const [updatedInspection] = await db
      .update(movingInspectionsTable)
      .set(updateData)
      .where(eq(movingInspectionsTable.id, inspection.id))
      .returning()

    if (!updatedInspection) {
      return { isSuccess: false, message: "Failed to sign inspection" }
    }

    // If both parties have signed, generate and email PDF
    const isThirdPartyForPDF = updatedInspection.inspectedByThirdParty === true || 
                                (updatedInspection.signedByInspector === true && updatedInspection.inspectorAccessToken !== null)
    
    const isFullySigned = isThirdPartyForPDF
      ? updatedInspection.signedByInspector && updatedInspection.signedByTenant
      : updatedInspection.signedByLandlord && updatedInspection.signedByTenant

    if (isFullySigned) {
      const { sendSignedInspectionPDFToTenantAction } = await import("@/lib/email/moving-inspection-email-service")
      // Don't await - let it run in background
      sendSignedInspectionPDFToTenantAction(inspection.id).catch((error) => {
        console.error("Error sending signed PDF to tenant:", error)
      })
    }

    return {
      isSuccess: true,
      message: "Inspection signed successfully",
      data: updatedInspection
    }
  } catch (error) {
    console.error("Error signing inspection as tenant:", error)
    return { isSuccess: false, message: "Failed to sign inspection" }
  }
}

/**
 * Get inspection by inspector access token (for public access)
 */
export async function getInspectionByInspectorTokenAction(
  token: string
): Promise<ActionState<SelectMovingInspection & {
  items: (SelectMovingInspectionItem & {
    category: { name: string; displayOrder: number }
    defects: SelectMovingInspectionDefect[]
  })[]
  property: any
  tenant: any
  lease: any
}>> {
  try {
    if (!token || token.trim() === "") {
      return { isSuccess: false, message: "Access token is required" }
    }

    // Find inspection by inspectorAccessToken
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.inspectorAccessToken, token))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Invalid access token. Please use the link from your email." }
    }

    // Allow access even after signing (read-only mode will be enforced in UI)
    // Get items with categories (manual joins to avoid referencedTable error)
    const items = await db
      .select({
        id: movingInspectionItemsTable.id,
        name: movingInspectionItemsTable.name,
        condition: movingInspectionItemsTable.condition,
        notes: movingInspectionItemsTable.notes,
        confirmedAsPrevious: movingInspectionItemsTable.confirmedAsPrevious,
        roomInstanceNumber: movingInspectionItemsTable.roomInstanceNumber,
        categoryId: movingInspectionItemsTable.categoryId,
        displayOrder: movingInspectionItemsTable.displayOrder
      })
      .from(movingInspectionItemsTable)
      .innerJoin(
        movingInspectionCategoriesTable,
        eq(movingInspectionItemsTable.categoryId, movingInspectionCategoriesTable.id)
      )
      .where(eq(movingInspectionItemsTable.inspectionId, inspection.id))
      .orderBy(movingInspectionItemsTable.displayOrder)

    // Get categories for items
    const categoryIds = [...new Set(items.map((item) => item.categoryId))]
    const categories = categoryIds.length > 0
      ? await db
          .select()
          .from(movingInspectionCategoriesTable)
          .where(inArray(movingInspectionCategoriesTable.id, categoryIds))
      : []

    const categoriesMap = new Map(categories.map((cat) => [cat.id, cat]))

    // Get defects for items
    const itemIds = items.map((item) => item.id)
    const defects = itemIds.length > 0
      ? await db
          .select()
          .from(movingInspectionDefectsTable)
          .where(inArray(movingInspectionDefectsTable.itemId, itemIds))
      : []

    const defectsByItemId = new Map<string, SelectMovingInspectionDefect[]>()
    defects.forEach((defect) => {
      if (!defectsByItemId.has(defect.itemId)) {
        defectsByItemId.set(defect.itemId, [])
      }
      defectsByItemId.get(defect.itemId)!.push(defect)
    })

    // Get lease and property
    const { leaseAgreementsTable, propertiesTable, tenantsTable } = await import("@/db/schema")
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, inspection.leaseAgreementId))
      .limit(1)

    const [property] = lease
      ? await db
          .select()
          .from(propertiesTable)
          .where(eq(propertiesTable.id, lease.propertyId))
          .limit(1)
      : [null]

    const [tenant] = lease
      ? await db
          .select()
          .from(tenantsTable)
          .where(eq(tenantsTable.id, lease.tenantId))
          .limit(1)
      : [null]

    // Assemble items with categories and defects
    const itemsWithDetails = items.map((item) => {
      const category = categoriesMap.get(item.categoryId)
      return {
        ...item,
        category: category
          ? {
              name: category.name,
              displayOrder: category.displayOrder
            }
          : { name: "Unknown", displayOrder: 0 },
        defects: defectsByItemId.get(item.id) || []
      }
    })

    return {
      isSuccess: true,
      message: "Inspection retrieved successfully",
      data: {
        ...inspection,
        items: itemsWithDetails as any,
        property: property || null,
        tenant: tenant || null,
        lease: lease || null
      } as any
    }
  } catch (error) {
    console.error("Error getting inspection by inspector token:", error)
    return { isSuccess: false, message: "Failed to get inspection" }
  }
}

/**
 * Update inspection item by inspector (via token, no authentication required)
 */
export async function updateInspectionByInspectorAction(
  token: string,
  itemId: string,
  data: Partial<{ condition: ItemCondition; notes: string; confirmedAsPrevious: boolean }>
): Promise<ActionState<SelectMovingInspectionItem>> {
  try {
    if (!token || token.trim() === "") {
      return { isSuccess: false, message: "Access token is required" }
    }

    // Find inspection by inspectorAccessToken
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.inspectorAccessToken, token))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Invalid access token" }
    }

    // Check if already signed by inspector
    if (inspection.signedByInspector) {
      return { isSuccess: false, message: "Cannot update inspection after it has been signed" }
    }

    // Check if inspection is fully signed (both parties have signed)
    const isFullySigned = inspection.status === "signed" || 
                         (inspection.signedByInspector && inspection.signedByTenant)

    if (isFullySigned) {
      return { isSuccess: false, message: "Cannot update inspection items. This inspection has been fully signed by all parties and is locked." }
    }

    // Verify item belongs to this inspection
    const [item] = await db
      .select()
      .from(movingInspectionItemsTable)
      .where(
        and(
          eq(movingInspectionItemsTable.id, itemId),
          eq(movingInspectionItemsTable.inspectionId, inspection.id)
        )
      )
      .limit(1)

    if (!item) {
      return { isSuccess: false, message: "Inspection item not found" }
    }

    // Update item
    const [updatedItem] = await db
      .update(movingInspectionItemsTable)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(movingInspectionItemsTable.id, itemId))
      .returning()

    if (!updatedItem) {
      return { isSuccess: false, message: "Failed to update inspection item" }
    }

    return {
      isSuccess: true,
      message: "Inspection item updated successfully",
      data: updatedItem
    }
  } catch (error) {
    console.error("Error updating inspection by inspector:", error)
    return { isSuccess: false, message: "Failed to update inspection item" }
  }
}

/**
 * Sign inspection as inspector (via token, no authentication required)
 */
export async function signInspectionAsInspectorAction(
  token: string,
  signatureData: any
): Promise<ActionState<SelectMovingInspection>> {
  try {
    if (!token || token.trim() === "") {
      return { isSuccess: false, message: "Access token is required" }
    }

    // Find inspection by inspectorAccessToken
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.inspectorAccessToken, token))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Invalid access token" }
    }

    // Check if already signed
    if (inspection.signedByInspector) {
      return { isSuccess: false, message: "You have already signed this inspection" }
    }

    // Update inspection with inspector signature and mark as completed
    const updateData: Partial<InsertMovingInspection> = {
      signedByInspector: true,
      inspectorSignatureData: signatureData as any,
      status: "completed", // Mark as completed when inspector signs
      updatedAt: new Date()
    }

    const [updatedInspection] = await db
      .update(movingInspectionsTable)
      .set(updateData)
      .where(eq(movingInspectionsTable.id, inspection.id))
      .returning()

    if (!updatedInspection) {
      return { isSuccess: false, message: "Failed to sign inspection" }
    }

    // Automatically send to tenant after inspector signs
    const { sendInspectionToTenantAfterInspectorAction } = await import("@/actions/inspection-email-actions")
    // Don't await - let it run in background
    sendInspectionToTenantAfterInspectorAction(inspection.id).catch((error) => {
      console.error("Error sending inspection to tenant after inspector:", error)
    })

    return {
      isSuccess: true,
      message: "Inspection signed successfully. The inspection has been sent to the tenant for their signature.",
      data: updatedInspection
    }
  } catch (error) {
    console.error("Error signing inspection as inspector:", error)
    return { isSuccess: false, message: "Failed to sign inspection" }
  }
}

/**
 * Assign third-party inspector to inspection
 */
export async function assignInspectorToInspectionAction(
  inspectionId: string,
  inspectorInfo: {
    name: string
    email: string
    company: string
    phone: string
  }
): Promise<ActionState<{ token: string; accessUrl: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get inspection
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, inspectionId))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Inspection not found" }
    }

    // Generate or get inspector access token
    const { generateInspectorAccessTokenAction } = await import("@/actions/inspection-email-actions")
    const tokenResult = await generateInspectorAccessTokenAction(inspectionId)

    if (!tokenResult.isSuccess || !tokenResult.data) {
      return { isSuccess: false, message: "Failed to generate inspector access token" }
    }

    // Update inspection with inspector info
    const [updatedInspection] = await db
      .update(movingInspectionsTable)
      .set({
        inspectorName: inspectorInfo.name,
        inspectorEmail: inspectorInfo.email,
        inspectorCompany: inspectorInfo.company,
        inspectorPhone: inspectorInfo.phone,
        inspectedByThirdParty: true,
        updatedAt: new Date()
      })
      .where(eq(movingInspectionsTable.id, inspectionId))
      .returning()

    if (!updatedInspection) {
      return { isSuccess: false, message: "Failed to update inspection with inspector info" }
    }

    // Send email to inspector
    const { emailInspectionToInspectorAction } = await import("@/actions/inspection-email-actions")
    await emailInspectionToInspectorAction(inspectionId, inspectorInfo.email, inspectorInfo.name)

    return {
      isSuccess: true,
      message: "Inspector assigned and email sent successfully",
      data: tokenResult.data
    }
  } catch (error) {
    console.error("Error assigning inspector to inspection:", error)
    return { isSuccess: false, message: "Failed to assign inspector" }
  }
}

