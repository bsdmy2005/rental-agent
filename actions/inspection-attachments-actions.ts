"use server"

import { db } from "@/db"
import {
  movingInspectionAttachmentsTable,
  type InsertMovingInspectionAttachment,
  type SelectMovingInspectionAttachment
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, desc } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

/**
 * Upload image attachment for an inspection item
 */
export async function uploadInspectionItemImageAction(data: {
  itemId: string
  inspectionId: string
  fileUrl: string
  fileName: string
  fileType: string
  skipAuth?: boolean // Optional flag to skip auth check (for inspector token-based access)
}): Promise<ActionState<SelectMovingInspectionAttachment>> {
  try {
    if (!data.skipAuth) {
      const { userId } = await auth()
      if (!userId) {
        return { isSuccess: false, message: "Unauthorized" }
      }
    }

    const [newAttachment] = await db
      .insert(movingInspectionAttachmentsTable)
      .values({
        inspectionId: data.inspectionId,
        itemId: data.itemId,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        attachmentType: "photo"
      })
      .returning()

    if (!newAttachment) {
      return { isSuccess: false, message: "Failed to create attachment" }
    }

    return {
      isSuccess: true,
      message: "Image uploaded successfully",
      data: newAttachment
    }
  } catch (error) {
    console.error("Error uploading inspection item image:", error)
    return { isSuccess: false, message: "Failed to upload image" }
  }
}

/**
 * Delete image attachment
 */
export async function deleteInspectionItemImageAction(
  attachmentId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get attachment to extract file path for deletion from Supabase
    const [attachment] = await db
      .select()
      .from(movingInspectionAttachmentsTable)
      .where(eq(movingInspectionAttachmentsTable.id, attachmentId))
      .limit(1)

    if (!attachment) {
      return { isSuccess: false, message: "Attachment not found" }
    }

    // Delete from database
    await db
      .delete(movingInspectionAttachmentsTable)
      .where(eq(movingInspectionAttachmentsTable.id, attachmentId))

    // Delete from Supabase storage
    try {
      const { deleteImageFromSupabase } = await import("@/lib/storage/supabase-storage")
      // Extract path from URL
      const url = new URL(attachment.fileUrl)
      const pathParts = url.pathname.split("/storage/v1/object/public/bills/")
      if (pathParts.length > 1) {
        const storagePath = pathParts[1]
        await deleteImageFromSupabase(storagePath)
      }
    } catch (error) {
      console.error("Error deleting image from Supabase storage:", error)
      // Continue even if storage deletion fails
    }

    return {
      isSuccess: true,
      message: "Image deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting inspection item image:", error)
    return { isSuccess: false, message: "Failed to delete image" }
  }
}

/**
 * Get all images for an inspection item
 */
export async function getInspectionItemImagesAction(
  itemId: string
): Promise<ActionState<SelectMovingInspectionAttachment[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const images = await db
      .select()
      .from(movingInspectionAttachmentsTable)
      .where(eq(movingInspectionAttachmentsTable.itemId, itemId))
      .orderBy(desc(movingInspectionAttachmentsTable.createdAt))

    return {
      isSuccess: true,
      message: "Images retrieved successfully",
      data: images
    }
  } catch (error) {
    console.error("Error getting inspection item images:", error)
    return { isSuccess: false, message: "Failed to get images" }
  }
}

