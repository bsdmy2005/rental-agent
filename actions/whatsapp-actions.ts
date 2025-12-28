"use server"

import { db } from "@/db"
import { quoteRequestsTable, serviceProvidersTable, incidentsTable, propertiesTable, tenantsTable, incidentAttachmentsTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"
import type { SelectQuoteRequest } from "@/db/schema"
import { generateRfqCode } from "@/lib/whatsapp/rfq-code-generator"
import { sendQuoteRequestWhatsApp } from "@/lib/whatsapp/response-sender"
import { processQuoteSubmissionFromWhatsApp } from "@/lib/whatsapp/quote-submission-handler"
import { formatWhatsAppNumber } from "@/lib/whatsapp/twilio-client"

/**
 * Send quote request via WhatsApp
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

    // Generate RFQ code if not already set
    let rfqCode = quoteRequest.whatsappCode
    if (!rfqCode) {
      rfqCode = await generateRfqCode()
      await db
        .update(quoteRequestsTable)
        .set({ whatsappCode: rfqCode })
        .where(eq(quoteRequestsTable.id, quoteRequestId))
    }

    // Get incident
    const [incident] = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, quoteRequest.incidentId))
      .limit(1)

    if (!incident) {
      return { isSuccess: false, message: "Incident not found" }
    }

    // Get property
    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, incident.propertyId))
      .limit(1)

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    // Get tenant
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, incident.tenantId))
      .limit(1)

    // Get service provider
    const [provider] = await db
      .select()
      .from(serviceProvidersTable)
      .where(eq(serviceProvidersTable.id, quoteRequest.serviceProviderId))
      .limit(1)

    if (!provider) {
      return { isSuccess: false, message: "Service provider not found" }
    }

    if (!provider.whatsappNumber) {
      return { isSuccess: false, message: "Service provider WhatsApp number is required" }
    }

    // Get incident attachments (photos)
    const attachments = await db
      .select()
      .from(incidentAttachmentsTable)
      .where(eq(incidentAttachmentsTable.incidentId, incident.id))
      .limit(5) // Limit to 5 photos

    // Get public URLs for attachments (assuming they're stored in Supabase)
    const attachmentUrls: string[] = []
    for (const attachment of attachments) {
      // If fileUrl is already a full URL, use it directly
      // Otherwise, construct public URL
      if (attachment.fileUrl.startsWith("http")) {
        attachmentUrls.push(attachment.fileUrl)
      } else {
        // Construct Supabase public URL
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/incidents/${attachment.fileUrl}`
          attachmentUrls.push(publicUrl)
        }
      }
    }

    // Format property address
    const propertyAddress = `${property.streetAddress || ""}, ${property.suburb || ""}, ${property.province || ""}`.trim().replace(/^,\s*|,\s*$/g, "")

    // Send WhatsApp message
    const result = await sendQuoteRequestWhatsApp(provider.whatsappNumber, {
      incidentTitle: incident.title,
      incidentDescription: incident.description,
      incidentPriority: incident.priority,
      propertyName: property.name,
      propertyAddress: propertyAddress || "Address not specified",
      tenantName: tenant?.name || undefined,
      notes: quoteRequest.notes || undefined,
      dueDate: quoteRequest.dueDate ? new Date(quoteRequest.dueDate) : undefined,
      rfqCode,
      attachmentUrls
    })

    // Update quote request with WhatsApp message ID and sent timestamp
    const [updatedQuoteRequest] = await db
      .update(quoteRequestsTable)
      .set({
        whatsappMessageId: result.messageId,
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
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send quote request via WhatsApp"
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

