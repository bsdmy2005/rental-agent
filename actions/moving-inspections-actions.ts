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
  type SelectMovingInspectionDocument
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, desc } from "drizzle-orm"
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
    const inspection = await db.query.movingInspections.findFirst({
      where: eq(movingInspectionsTable.id, inspectionId),
      with: {
        items: {
          with: {
            category: true,
            defects: true,
            attachments: true
          },
          orderBy: (items, { asc }) => [asc(items.displayOrder)]
        },
        attachments: true,
        documents: true
      }
    })

    if (!inspection) {
      return { isSuccess: false, message: "Moving inspection not found" }
    }

    return {
      isSuccess: true,
      message: "Moving inspection retrieved successfully",
      data: inspection as any
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

    const movingInInspection = await db.query.movingInspections.findFirst({
      where: eq(movingInspectionsTable.id, movingInInspectionId),
      with: {
        items: {
          orderBy: (items, { asc }) => [asc(items.displayOrder)]
        }
      }
    })

    if (!movingInInspection) {
      return { isSuccess: false, message: "Moving-in inspection not found" }
    }

    if (movingInInspection.inspectionType !== "moving_in") {
      return { isSuccess: false, message: "Inspection is not a moving-in inspection" }
    }

    // Create moving-out inspection
    const movingOutInspection: InsertMovingInspection = {
      leaseAgreementId: movingInInspection.leaseAgreementId,
      inspectionType: "moving_out",
      status: "draft",
      inspectedBy: userId
    }

    const [newMovingOutInspection] = await db
      .insert(movingInspectionsTable)
      .values(movingOutInspection)
      .returning()

    if (!newMovingOutInspection) {
      return { isSuccess: false, message: "Failed to create moving-out inspection" }
    }

    // Copy items from moving-in inspection
    const itemsToCreate: InsertMovingInspectionItem[] = movingInInspection.items.map(
      (item, index) => ({
        inspectionId: newMovingOutInspection.id,
        categoryId: item.categoryId,
        name: item.name,
        condition: "good", // Default condition for moving-out
        notes: null,
        displayOrder: item.displayOrder || index
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

// Item CRUD Operations

export async function createMovingInspectionItemAction(
  item: InsertMovingInspectionItem
): Promise<ActionState<SelectMovingInspectionItem>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
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

export async function deleteMovingInspectionItemAction(
  itemId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
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

