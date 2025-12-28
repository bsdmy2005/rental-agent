"use server"

import type { PostmarkWebhookPayload } from "@/lib/email/postmark-parser"
import type { SelectExtractionRule } from "@/db/schema"
import { classifyDocument } from "@/lib/email/document-classifier"
import { uploadPDFToSupabase } from "@/lib/storage/supabase-storage"

export interface ExtractionResult {
  success: boolean
  pdfBuffers: Array<{ name: string; content: Buffer }>
  error?: string
  trace?: Array<{ step: string; timestamp: Date; data?: unknown }>
}

/**
 * Lane 1: Process email attachments (fast path)
 */
export async function processAttachments(
  email: PostmarkWebhookPayload,
  rule: SelectExtractionRule
): Promise<ExtractionResult> {
  const trace: Array<{ step: string; timestamp: Date; data?: unknown }> = []
  const startTime = new Date()

  console.log("[Lane 1] Processing attachments...")
  trace.push({ step: "start", timestamp: startTime })

  try {
    if (!email.Attachments || email.Attachments.length === 0) {
      return {
        success: false,
        pdfBuffers: [],
        error: "No attachments found in email",
        trace
      }
    }

    trace.push({
      step: "attachments_found",
      timestamp: new Date(),
      data: { count: email.Attachments.length }
    })

    const pdfBuffers: Array<{ name: string; content: Buffer }> = []

    // Process each attachment
    for (const attachment of email.Attachments) {
      const isPdf =
        attachment.ContentType === "application/pdf" ||
        attachment.Name.toLowerCase().endsWith(".pdf")

      if (!isPdf) {
        console.log(`[Lane 1] Skipping non-PDF attachment: ${attachment.Name}`)
        continue
      }

      // Decode base64 content
      let content: Buffer
      try {
        if (!attachment.Content || attachment.Content.trim() === "") {
          console.warn(`[Lane 1] ⚠ Attachment ${attachment.Name} has no content`)
          continue
        }
        content = Buffer.from(attachment.Content, "base64")
      } catch (error) {
        console.error(`[Lane 1] ✗ Failed to decode attachment ${attachment.Name}:`, error)
        continue
      }

      // Validate PDF
      const pdfMagicBytes = content.slice(0, 4).toString("ascii")
      if (pdfMagicBytes !== "%PDF") {
        console.error(`[Lane 1] ✗ Invalid PDF: ${attachment.Name}`)
        continue
      }

      // Classify document
      const classification = await classifyDocument(attachment.Name, attachment.ContentType)
      console.log(
        `[Lane 1] ✓ Classified ${attachment.Name} as ${classification.type} (confidence: ${classification.confidence})`
      )

      trace.push({
        step: "document_classified",
        timestamp: new Date(),
        data: {
          fileName: attachment.Name,
          type: classification.type,
          confidence: classification.confidence
        }
      })

      pdfBuffers.push({
        name: attachment.Name,
        content
      })
    }

    if (pdfBuffers.length === 0) {
      return {
        success: false,
        pdfBuffers: [],
        error: "No valid PDF attachments found",
        trace
      }
    }

    trace.push({
      step: "complete",
      timestamp: new Date(),
      data: { pdfCount: pdfBuffers.length }
    })

    console.log(`[Lane 1] ✓ Processed ${pdfBuffers.length} PDF attachment(s)`)
    return {
      success: true,
      pdfBuffers,
      trace
    }
  } catch (error) {
    console.error("[Lane 1] ✗ Error processing attachments:", error)
    trace.push({
      step: "error",
      timestamp: new Date(),
      data: { error: error instanceof Error ? error.message : "Unknown error" }
    })
    return {
      success: false,
      pdfBuffers: [],
      error: error instanceof Error ? error.message : "Unknown error",
      trace
    }
  }
}

