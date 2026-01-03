"use server"

import { db } from "@/db"
import { quoteRequestsTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"
import type { SelectQuoteRequest } from "@/db/schema"
import { sendQuoteRequestViaBaileys } from "@/lib/whatsapp/baileys-rfq-service"
import { processQuoteSubmissionFromWhatsApp } from "@/lib/whatsapp/quote-submission-handler"
import { generateRfqCode } from "@/lib/whatsapp/rfq-code-generator"

/**
 * Send quote request via WhatsApp using Baileys
 * Gracefully falls back if WhatsApp is not enabled/connected
 */
export async function sendQuoteRequestWhatsAppAction(
  quoteRequestId: string
): Promise<ActionState<SelectQuoteRequest>> {
  try {
    // Get quote request
    const [quoteRequest] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.id, quoteRequestId))
      .limit(1)

    if (!quoteRequest) {
      return { isSuccess: false, message: "Quote request not found" }
    }

    // Get userProfileId from requestedBy field
    const userProfileId = quoteRequest.requestedBy

    // Send via Baileys
    const result = await sendQuoteRequestViaBaileys(quoteRequestId, userProfileId)

    if (!result.success) {
      // Graceful fallback: Return success but log that WhatsApp was not used
      console.log(`WhatsApp not available for quote request ${quoteRequestId}: ${result.message}`)
      return {
        isSuccess: true,
        message: `WhatsApp not available: ${result.message}. Email will be used instead.`,
        data: quoteRequest
      }
    }

    // Update quote request with WhatsApp message ID and sent timestamp
    const [updatedQuoteRequest] = await db
      .update(quoteRequestsTable)
      .set({
        whatsappMessageId: result.messageId || null,
        whatsappSentAt: new Date()
      })
      .where(eq(quoteRequestsTable.id, quoteRequestId))
      .returning()

    if (!updatedQuoteRequest) {
      return { isSuccess: false, message: "Failed to update quote request" }
    }

    return {
      isSuccess: true,
      message: "Quote request sent via WhatsApp successfully",
      data: updatedQuoteRequest
    }
  } catch (error) {
    console.error("Error sending quote request via WhatsApp:", error)
    // Graceful fallback: Don't fail the entire operation
    return {
      isSuccess: true,
      message: `WhatsApp send failed: ${error instanceof Error ? error.message : "Unknown error"}. Email will be used instead.`,
      data: await db.query.quoteRequests.findFirst({
        where: (requests, { eq }) => eq(requests.id, quoteRequestId)
      }) as SelectQuoteRequest
    }
  }
}

/**
 * Process quote submission from WhatsApp
 */
export async function processQuoteSubmissionAction(
  messageText: string,
  fromPhoneNumber: string
): Promise<ActionState<void>> {
  try {
    const result = await processQuoteSubmissionFromWhatsApp(messageText, fromPhoneNumber)
    
    if (!result.isSuccess) {
      return {
        isSuccess: false,
        message: result.message
      }
    }

    return {
      isSuccess: true,
      message: "Quote submission processed successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error processing quote submission:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to process quote submission"
    }
  }
}

/**
 * Resend quote request via WhatsApp
 */
export async function resendQuoteRequestWhatsAppAction(
  quoteRequestId: string
): Promise<ActionState<SelectQuoteRequest>> {
  // Generate new RFQ code for resend
  const rfqCode = await generateRfqCode()
  
  await db
    .update(quoteRequestsTable)
    .set({ 
      whatsappCode: rfqCode,
      whatsappMessageId: null,
      whatsappSentAt: null
    })
    .where(eq(quoteRequestsTable.id, quoteRequestId))

  // Send using the main action
  return sendQuoteRequestWhatsAppAction(quoteRequestId)
}

/**
 * Validate RFQ code
 */
export async function validateRfqCodeAction(
  rfqCode: string
): Promise<ActionState<{ quoteRequestId: string; isValid: boolean }>> {
  try {
    const [quoteRequest] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.whatsappCode, rfqCode))
      .limit(1)

    if (!quoteRequest) {
      return {
        isSuccess: true,
        message: "RFQ code not found",
        data: { quoteRequestId: "", isValid: false }
      }
    }

    // Check if expired
    let isValid = true
    if (quoteRequest.dueDate) {
      const now = new Date()
      const dueDate = new Date(quoteRequest.dueDate)
      isValid = now <= dueDate
    }

    return {
      isSuccess: true,
      message: isValid ? "RFQ code is valid" : "RFQ code has expired",
      data: {
        quoteRequestId: quoteRequest.id,
        isValid
      }
    }
  } catch (error) {
    console.error("Error validating RFQ code:", error)
    return {
      isSuccess: false,
      message: "Failed to validate RFQ code"
    }
  }
}

