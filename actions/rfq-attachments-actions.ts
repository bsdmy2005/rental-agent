"use server"

import { db } from "@/db"
import {
  rfqAttachmentsTable,
  type InsertRfqAttachment,
  type SelectRfqAttachment
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function createRfqAttachmentAction(
  attachment: InsertRfqAttachment
): Promise<ActionState<SelectRfqAttachment>> {
  try {
    const [newAttachment] = await db
      .insert(rfqAttachmentsTable)
      .values(attachment)
      .returning()

    if (!newAttachment) {
      return { isSuccess: false, message: "Failed to upload RFQ attachment" }
    }

    return {
      isSuccess: true,
      message: "RFQ attachment uploaded successfully",
      data: newAttachment
    }
  } catch (error) {
    console.error("Error uploading RFQ attachment:", error)
    return { isSuccess: false, message: "Failed to upload RFQ attachment" }
  }
}

export async function getRfqAttachmentsByRfqCodeAction(
  rfqCode: string
): Promise<ActionState<SelectRfqAttachment[]>> {
  try {
    const attachments = await db
      .select()
      .from(rfqAttachmentsTable)
      .where(eq(rfqAttachmentsTable.rfqCode, rfqCode))

    return {
      isSuccess: true,
      message: "RFQ attachments retrieved successfully",
      data: attachments
    }
  } catch (error) {
    console.error("Error getting RFQ attachments:", error)
    return { isSuccess: false, message: "Failed to get RFQ attachments" }
  }
}

export async function deleteRfqAttachmentAction(
  attachmentId: string
): Promise<ActionState<void>> {
  try {
    await db.delete(rfqAttachmentsTable).where(eq(rfqAttachmentsTable.id, attachmentId))

    return {
      isSuccess: true,
      message: "RFQ attachment deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting RFQ attachment:", error)
    return { isSuccess: false, message: "Failed to delete RFQ attachment" }
  }
}

