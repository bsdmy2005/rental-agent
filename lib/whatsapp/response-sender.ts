"use server"

/**
 * WhatsApp Response Sender Utilities
 * 
 * Sends messages via Twilio WhatsApp Business API
 */

import { sendWhatsAppMessage as sendTwilioMessage, sendWhatsAppMessageWithMedia, sendWhatsAppMessagesWithMultipleMedia } from "./twilio-client"

export interface WhatsAppResponse {
  to: string // Recipient phone number
  message: string
  mediaUrl?: string // For sending images/documents
}

/**
 * Send a WhatsApp message
 */
export async function sendWhatsAppMessage(response: WhatsAppResponse): Promise<void> {
  try {
    if (response.mediaUrl) {
      await sendWhatsAppMessageWithMedia(response.to, response.message, response.mediaUrl)
    } else {
      await sendTwilioMessage(response.to, response.message)
    }
  } catch (error) {
    console.error("[WhatsApp] Error sending message:", error)
    throw error
  }
}

/**
 * Send incident confirmation message
 */
export async function sendIncidentConfirmation(
  phoneNumber: string,
  incidentId: string,
  referenceNumber: string
): Promise<void> {
  const message = `✅ Your incident has been reported successfully!

Reference: ${referenceNumber}

Your incident has been logged and will be reviewed by the property manager. You may be contacted for additional information if needed.

Thank you for reporting this issue.`

  await sendWhatsAppMessage({
    to: phoneNumber,
    message
  })
}

/**
 * Send quote request via WhatsApp
 * Formats message with incident details and RFQ code
 */
export async function sendQuoteRequestWhatsApp(
  phoneNumber: string,
  options: {
    incidentTitle: string
    incidentDescription: string
    incidentPriority: string
    propertyName: string
    propertyAddress: string
    tenantName?: string
    notes?: string
    dueDate?: Date
    rfqCode: string
    attachmentUrls?: string[] // URLs to incident photos
  }
): Promise<{ messageId: string; success: boolean }> {
  const {
    incidentTitle,
    incidentDescription,
    incidentPriority,
    propertyName,
    propertyAddress,
    tenantName,
    notes,
    dueDate,
    rfqCode,
    attachmentUrls = []
  } = options

  // Format message
    const message = `🔧 Quote Request: ${incidentTitle}

Property: ${propertyName}
Address: ${propertyAddress}

📋 Details:
${incidentDescription}

Priority: ${incidentPriority}
${tenantName ? `Tenant: ${tenantName}\n` : ""}${notes ? `Notes: ${notes}\n` : ""}${dueDate ? `Quote Due Date: ${dueDate.toLocaleDateString()}\n` : ""}${attachmentUrls.length > 0 ? `\n📎 ${attachmentUrls.length} photo(s) attached\n` : ""}
💬 To submit your quote, reply with:
RFQ-${rfqCode}
Amount: R [amount]
Description: [your description]
Completion Date: [date] (optional)

Reply with the code above to link your quote.`

  try {
    if (attachmentUrls.length > 0) {
      // Send message with multiple media attachments
      const result = await sendWhatsAppMessagesWithMultipleMedia(
        phoneNumber,
        message,
        attachmentUrls
      )
      return {
        messageId: result.messageIds[0] || "",
        success: result.success
      }
    } else {
      // Send text-only message
      const result = await sendTwilioMessage(phoneNumber, message)
      return {
        messageId: result.messageId,
        success: result.success
      }
    }
  } catch (error) {
    console.error("[WhatsApp] Error sending quote request:", error)
    throw error
  }
}

