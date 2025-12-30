"use server"

import { db } from "@/db"
import {
  rfqAttachmentsTable,
  type InsertRfqAttachment,
  type SelectRfqAttachment
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"
import { downloadPDFFromSupabase, uploadPDFToSupabase } from "@/lib/storage/supabase-storage"
import type { SelectIncidentAttachment } from "@/db/schema"

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

/**
 * Copy incident attachments to RFQ attachments
 * Downloads incident attachments from Supabase and uploads them to RFQ storage path
 */
export async function copyIncidentAttachmentsToRfqAction(
  incidentAttachments: SelectIncidentAttachment[],
  rfqCode: string,
  uploadedBy: string
): Promise<ActionState<{ copiedCount: number; failedCount: number }>> {
  if (!rfqCode) {
    return {
      isSuccess: false,
      message: "RFQ code is required to copy attachments"
    }
  }

  if (incidentAttachments.length === 0) {
    return {
      isSuccess: true,
      message: "No attachments to copy",
      data: { copiedCount: 0, failedCount: 0 }
    }
  }

  let copiedCount = 0
  let failedCount = 0

  for (const incidentAttachment of incidentAttachments) {
    try {
      // Download attachment from Supabase
      const fileBuffer = await downloadPDFFromSupabase(incidentAttachment.fileUrl)

      // Sanitize filename
      const sanitizedFileName = incidentAttachment.fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
      const timestamp = Date.now()
      const rfqFilePath = `rfqs/${rfqCode}/${timestamp}-${sanitizedFileName}`

      // Upload to RFQ storage path
      const newFileUrl = await uploadPDFToSupabase(fileBuffer, rfqFilePath)

      // Create RFQ attachment record
      const result = await createRfqAttachmentAction({
        rfqCode,
        fileUrl: newFileUrl,
        fileName: incidentAttachment.fileName,
        fileType: incidentAttachment.fileType === "pdf" ? "pdf" : "image",
        fileSize: fileBuffer.length,
        uploadedBy
      })

      if (result.isSuccess) {
        copiedCount++
        console.log(`[RFQ Attachments] ✓ Copied attachment: ${incidentAttachment.fileName}`)
      } else {
        failedCount++
        console.error(`[RFQ Attachments] ✗ Failed to create RFQ attachment record: ${incidentAttachment.fileName}`, result.message)
      }
    } catch (error) {
      failedCount++
      console.error(`[RFQ Attachments] ✗ Error copying attachment ${incidentAttachment.fileName}:`, error)
      // Continue with other attachments
    }
  }

  return {
    isSuccess: true,
    message: `Copied ${copiedCount} of ${incidentAttachments.length} attachment(s)`,
    data: { copiedCount, failedCount }
  }
}

