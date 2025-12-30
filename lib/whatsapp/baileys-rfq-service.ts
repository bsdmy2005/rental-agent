"use server"

import { db } from "@/db"
import { quoteRequestsTable, serviceProvidersTable, incidentsTable, propertiesTable, tenantsTable } from "@/db/schema"
import { eq, and, isNotNull } from "drizzle-orm"
import { createWhatsAppBaileysClientFromEnv } from "@/lib/whatsapp-baileys-client"
import { formatRfqMessageForWhatsApp } from "./message-formatter"
import { ensurePrimarySessionConnectedAction, isWhatsAppEnabledAction } from "@/actions/whatsapp-primary-session-actions"

/**
 * Format phone number for message sending (Baileys format: 27...)
 * Matches the format used in WhatsApp Explorer for consistency
 */
function formatPhoneForMessage(phone: string): string {
  // Remove spaces, dashes, parentheses, and any + signs
  let cleaned = phone.replace(/[\s\-()+]/g, "")
  
  // If starts with 0, replace with 27
  if (cleaned.startsWith("0")) {
    cleaned = "27" + cleaned.substring(1)
  } else if (cleaned.startsWith("27")) {
    // Already has 27, use as is
    cleaned = cleaned
  } else if (cleaned.length >= 9) {
    // Assume it's a local number, add 27
    cleaned = "27" + cleaned
  }
  
  return cleaned
}

/**
 * Send quote request via Baileys WhatsApp
 * Gets primary session for user, ensures connected, formats message, and sends
 */
export async function sendQuoteRequestViaBaileys(
  quoteRequestId: string,
  userProfileId: string
): Promise<{ success: boolean; message: string; messageId?: string }> {
  console.log(`[RFQ WhatsApp] ========================================`)
  console.log(`[RFQ WhatsApp] Starting RFQ WhatsApp send process`)
  console.log(`[RFQ WhatsApp] Quote Request ID: ${quoteRequestId}`)
  console.log(`[RFQ WhatsApp] User Profile ID: ${userProfileId}`)
  console.log(`[RFQ WhatsApp] ========================================`)
  
  try {
    // Check if WhatsApp is enabled for this user
    console.log(`[RFQ WhatsApp] Step 1: Checking if WhatsApp is enabled...`)
    const enabledCheck = await isWhatsAppEnabledAction(userProfileId)
    console.log(`[RFQ WhatsApp] Enabled check result:`, {
      isSuccess: enabledCheck.isSuccess,
      enabled: enabledCheck.data?.enabled,
      connected: enabledCheck.data?.connected,
      phoneNumber: enabledCheck.data?.phoneNumber,
      message: enabledCheck.message
    })
    
    if (!enabledCheck.isSuccess || !enabledCheck.data?.enabled || !enabledCheck.data?.connected) {
      console.log(`[RFQ WhatsApp] ❌ WhatsApp not enabled or not connected`)
      return {
        success: false,
        message: enabledCheck.data?.enabled 
          ? "WhatsApp is configured but not connected. Please connect your WhatsApp account in settings."
          : "WhatsApp is not enabled for this account. Please configure WhatsApp in settings."
      }
    }

    // Ensure primary session is connected
    console.log(`[RFQ WhatsApp] Step 2: Ensuring primary session is connected...`)
    const connectionCheck = await ensurePrimarySessionConnectedAction(userProfileId)
    console.log(`[RFQ WhatsApp] Connection check result:`, {
      isSuccess: connectionCheck.isSuccess,
      sessionId: connectionCheck.data?.sessionId,
      phoneNumber: connectionCheck.data?.phoneNumber,
      message: connectionCheck.message
    })
    
    if (!connectionCheck.isSuccess || !connectionCheck.data) {
      console.log(`[RFQ WhatsApp] ❌ Primary session not connected`)
      return {
        success: false,
        message: connectionCheck.message || "WhatsApp is not connected"
      }
    }

    const { sessionId, phoneNumber: primaryPhoneNumber } = connectionCheck.data
    console.log(`[RFQ WhatsApp] ✓ Primary session connected`)
    console.log(`[RFQ WhatsApp] Session ID: ${sessionId}`)
    console.log(`[RFQ WhatsApp] Primary Phone Number: ${primaryPhoneNumber}`)

    // Get quote request
    console.log(`[RFQ WhatsApp] Step 3: Fetching quote request from database...`)
    const [quoteRequest] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.id, quoteRequestId))
      .limit(1)

    if (!quoteRequest) {
      console.log(`[RFQ WhatsApp] ❌ Quote request not found`)
      return { success: false, message: "Quote request not found" }
    }
    
    console.log(`[RFQ WhatsApp] ✓ Quote request found:`, {
      id: quoteRequest.id,
      rfqCode: quoteRequest.rfqCode,
      serviceProviderId: quoteRequest.serviceProviderId,
      propertyId: quoteRequest.propertyId,
      incidentId: quoteRequest.incidentId
    })

    // Get property (required for both incident-linked and standalone RFQs)
    if (!quoteRequest.propertyId) {
      return { success: false, message: "Property ID is required" }
    }

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, quoteRequest.propertyId))
      .limit(1)

    if (!property) {
      return { success: false, message: "Property not found" }
    }

    // Get incident if linked
    let incident: typeof incidentsTable.$inferSelect | null = null
    let tenant: typeof tenantsTable.$inferSelect | null = null

    if (quoteRequest.incidentId) {
      const [incidentData] = await db
        .select()
        .from(incidentsTable)
        .where(eq(incidentsTable.id, quoteRequest.incidentId))
        .limit(1)

      if (incidentData) {
        incident = incidentData

        // Get tenant if incident has tenantId
        if (incident.tenantId) {
          const [tenantData] = await db
            .select()
            .from(tenantsTable)
            .where(eq(tenantsTable.id, incident.tenantId))
            .limit(1)

          if (tenantData) {
            tenant = tenantData
          }
        }
      }
    }

    // Get service provider
    console.log(`[RFQ WhatsApp] Step 4: Fetching service provider from database...`)
    const [provider] = await db
      .select()
      .from(serviceProvidersTable)
      .where(eq(serviceProvidersTable.id, quoteRequest.serviceProviderId))
      .limit(1)

    if (!provider) {
      console.log(`[RFQ WhatsApp] ❌ Service provider not found`)
      return { success: false, message: "Service provider not found" }
    }
    
    console.log(`[RFQ WhatsApp] ✓ Service provider found:`, {
      id: provider.id,
      name: provider.businessName || provider.contactName,
      whatsappNumber: provider.whatsappNumber,
      email: provider.email
    })

    if (!provider.whatsappNumber) {
      console.log(`[RFQ WhatsApp] ❌ Service provider WhatsApp number is missing`)
      return { success: false, message: "Service provider WhatsApp number is required" }
    }
    
    console.log(`[RFQ WhatsApp] Provider WhatsApp Number (original): ${provider.whatsappNumber}`)

    // Format property address
    const propertyAddress = `${property.streetAddress || ""}, ${property.suburb || ""}, ${property.province || ""}`.trim().replace(/^,\s*|,\s*$/g, "")

    // Determine title and description
    // Use quoteRequest first (contains transformed text), then fallback to incident (original text)
    const requestTitle = quoteRequest.title || incident?.title || "Maintenance Request"
    const requestDescription = quoteRequest.description || incident?.description || "Please provide a quote for the requested work."

    // Get RFQ attachments
    // In bulk RFQs, attachments are stored with the first provider's rfqCode,
    // but we need to attach them to all providers' messages.
    // So we look for related quote requests (same incidentId) and use any of their rfqCodes to fetch attachments.
    let attachmentCount = 0
    let attachmentUrls: string[] = []
    let rfqCodeForAttachments: string | null = quoteRequest.rfqCode || null

    // If this quote request doesn't have an rfqCode, find a related one that does (for bulk RFQs)
    if (!rfqCodeForAttachments && quoteRequest.incidentId) {
      try {
        // If linked to an incident, find other quote requests for the same incident that have attachments
        const [relatedRequest] = await db
          .select({ rfqCode: quoteRequestsTable.rfqCode })
          .from(quoteRequestsTable)
          .where(
            and(
              eq(quoteRequestsTable.incidentId, quoteRequest.incidentId),
              isNotNull(quoteRequestsTable.rfqCode)
            )
          )
          .limit(1)

        if (relatedRequest?.rfqCode) {
          rfqCodeForAttachments = relatedRequest.rfqCode
        }
      } catch (error) {
        console.error("[RFQ WhatsApp] Error finding related quote request for attachments:", error)
      }
    }

    // Fetch RFQ attachments if we found a code
    if (rfqCodeForAttachments) {
      try {
        const { getRfqAttachmentsByRfqCodeAction } = await import("@/actions/rfq-attachments-actions")
        const attachmentsResult = await getRfqAttachmentsByRfqCodeAction(rfqCodeForAttachments)
        
        if (attachmentsResult.isSuccess && attachmentsResult.data) {
          attachmentCount = attachmentsResult.data.length
          attachmentUrls = attachmentsResult.data.map(att => att.fileUrl)
          console.log(`[RFQ WhatsApp] Found ${attachmentCount} RFQ attachment(s) using code: ${rfqCodeForAttachments}`)
        }
      } catch (attachmentError) {
        console.error("[RFQ WhatsApp] Error fetching RFQ attachments:", attachmentError)
        // Continue without attachments
      }
    }

    // Build online submission URL if RFQ code exists
    const domain = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
    const onlineSubmissionUrl = quoteRequest.rfqCode 
      ? `${domain}/submit-quote/${quoteRequest.rfqCode}`
      : undefined

    // Format message
    console.log(`[RFQ WhatsApp] Step 5: Formatting RFQ message...`)
    const message = formatRfqMessageForWhatsApp({
      title: requestTitle,
      description: requestDescription,
      propertyName: property.name,
      propertyAddress: propertyAddress || "Address not specified",
      tenantName: tenant?.name,
      notes: quoteRequest.notes || undefined,
      dueDate: quoteRequest.dueDate || undefined,
      rfqCode: quoteRequest.rfqCode || undefined,
      onlineSubmissionUrl,
      attachmentCount, 
      priority: incident?.priority || undefined
    })
    
    console.log(`[RFQ WhatsApp] ✓ Message formatted`)
    console.log(`[RFQ WhatsApp] Message details:`, {
      length: message.length,
      characterCount: message.length,
      lineCount: message.split('\n').length,
      preview: message.substring(0, 200) + (message.length > 200 ? '...' : '')
    })
    console.log(`[RFQ WhatsApp] Full message content:`)
    console.log(`[RFQ WhatsApp] ${message.split('\n').join('\n[RFQ WhatsApp] ')}`)

    // Format provider phone number (matches WhatsApp Explorer format)
    console.log(`[RFQ WhatsApp] Step 6: Formatting recipient phone number...`)
    const recipientPhone = formatPhoneForMessage(provider.whatsappNumber)
    console.log(`[RFQ WhatsApp] Phone number formatting:`, {
      original: provider.whatsappNumber,
      formatted: recipientPhone,
      length: recipientPhone.length
    })

    // Send message via Baileys (using same client creation as Explorer)
    console.log(`[RFQ WhatsApp] Step 7: Preparing to send message via Baileys...`)
    const serverUrl = process.env.WHATSAPP_SERVER_URL || "http://localhost:3001"
    const apiKey = process.env.WHATSAPP_SERVER_API_KEY || ""
    
    console.log(`[RFQ WhatsApp] Server configuration:`, {
      serverUrl,
      apiKeyConfigured: !!apiKey,
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : "NOT SET"
    })
    
    if (!apiKey) {
      console.log(`[RFQ WhatsApp] ❌ WhatsApp server API key not configured`)
      return {
        success: false,
        message: "WhatsApp server API key not configured"
      }
    }

    console.log(`[RFQ WhatsApp] Creating Baileys client...`)
    const client = createWhatsAppBaileysClientFromEnv()
    console.log(`[RFQ WhatsApp] ✓ Client created`)
    
    console.log(`[RFQ WhatsApp] ========================================`)
    console.log(`[RFQ WhatsApp] SENDING MESSAGE VIA WHATSAPP`)
    console.log(`[RFQ WhatsApp] ========================================`)
    console.log(`[RFQ WhatsApp] Session ID: ${sessionId}`)
    console.log(`[RFQ WhatsApp] Recipient Phone: ${recipientPhone}`)
    console.log(`[RFQ WhatsApp] Message Length: ${message.length} characters`)
    console.log(`[RFQ WhatsApp] Server URL: ${serverUrl}`)
    console.log(`[RFQ WhatsApp] ========================================`)
    
    try {
      const sendStartTime = Date.now()
      console.log(`[RFQ WhatsApp] Calling client.sendMessage()...`)
      const result = await client.sendMessage(sessionId, recipientPhone, message)
      const sendDuration = Date.now() - sendStartTime
      
      // Send media attachments if any
      if (attachmentUrls.length > 0) {
        console.log(`[RFQ WhatsApp] Sending ${attachmentUrls.length} media attachment(s)...`)
        for (let i = 0; i < attachmentUrls.length; i++) {
          const attachmentUrl = attachmentUrls[i]
          try {
            // Determine media type from URL or file extension
            const isPDF = attachmentUrl.toLowerCase().includes(".pdf") || attachmentUrl.toLowerCase().endsWith(".pdf")
            const mediaType = isPDF ? "document" : "image"
            
            console.log(`[RFQ WhatsApp] Sending attachment ${i + 1}/${attachmentUrls.length}: ${attachmentUrl} (${mediaType})`)
            await client.sendMediaMessage(
              sessionId,
              recipientPhone,
              attachmentUrl,
              mediaType
            )
            console.log(`[RFQ WhatsApp] ✓ Attachment ${i + 1} sent successfully`)
            
            // Small delay between attachments to avoid rate limiting
            if (i < attachmentUrls.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          } catch (mediaError) {
            console.error(`[RFQ WhatsApp] ✗ Failed to send attachment ${i + 1}:`, mediaError)
            // Continue with other attachments
          }
        }
        console.log(`[RFQ WhatsApp] ✓ All attachments sent`)
      }
      
      console.log(`[RFQ WhatsApp] ========================================`)
      console.log(`[RFQ WhatsApp] SEND RESULT RECEIVED`)
      console.log(`[RFQ WhatsApp] ========================================`)
      console.log(`[RFQ WhatsApp] Success: ${result.success}`)
      console.log(`[RFQ WhatsApp] Message ID: ${result.messageId || 'N/A'}`)
      console.log(`[RFQ WhatsApp] Timestamp: ${result.timestamp || 'N/A'}`)
      console.log(`[RFQ WhatsApp] Recipient: ${result.recipient || recipientPhone}`)
      console.log(`[RFQ WhatsApp] Content: ${result.content ? result.content.substring(0, 100) + '...' : 'N/A'}`)
      console.log(`[RFQ WhatsApp] Send Duration: ${sendDuration}ms`)
      console.log(`[RFQ WhatsApp] ========================================`)
      
      if (result.success) {
        console.log(`[RFQ WhatsApp] ✓ Message sent successfully, updating database...`)
        // Update quote request with WhatsApp message ID and sent timestamp
        await db
          .update(quoteRequestsTable)
          .set({
            whatsappMessageId: result.messageId,
            whatsappSentAt: new Date()
          })
          .where(eq(quoteRequestsTable.id, quoteRequestId))

        console.log(`[RFQ WhatsApp] ✓ Database updated with message ID: ${result.messageId}`)
        console.log(`[RFQ WhatsApp] ========================================`)
        console.log(`[RFQ WhatsApp] ✅ RFQ WhatsApp send completed successfully`)
        console.log(`[RFQ WhatsApp] ========================================`)
        
        return {
          success: true,
          message: "Quote request sent via WhatsApp successfully",
          messageId: result.messageId
        }
      }

      console.log(`[RFQ WhatsApp] ❌ Send result indicates failure`)
      console.log(`[RFQ WhatsApp] ========================================`)
      return {
        success: false,
        message: "Failed to send WhatsApp message"
      }
    } catch (sendError) {
      console.error(`[RFQ WhatsApp] ========================================`)
      console.error(`[RFQ WhatsApp] ❌ ERROR SENDING MESSAGE`)
      console.error(`[RFQ WhatsApp] ========================================`)
      console.error(`[RFQ WhatsApp] Error type: ${sendError instanceof Error ? sendError.constructor.name : typeof sendError}`)
      console.error(`[RFQ WhatsApp] Error message:`, sendError instanceof Error ? sendError.message : String(sendError))
      console.error(`[RFQ WhatsApp] Error stack:`, sendError instanceof Error ? sendError.stack : 'N/A')
      console.error(`[RFQ WhatsApp] Session ID: ${sessionId}`)
      console.error(`[RFQ WhatsApp] Recipient: ${recipientPhone}`)
      console.error(`[RFQ WhatsApp] ========================================`)
      throw sendError
    }

  } catch (error) {
    console.error(`[RFQ WhatsApp] ========================================`)
    console.error(`[RFQ WhatsApp] ❌ FATAL ERROR IN RFQ WHATSAPP SEND`)
    console.error(`[RFQ WhatsApp] ========================================`)
    console.error(`[RFQ WhatsApp] Quote Request ID: ${quoteRequestId}`)
    console.error(`[RFQ WhatsApp] User Profile ID: ${userProfileId}`)
    console.error(`[RFQ WhatsApp] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`)
    console.error(`[RFQ WhatsApp] Error message:`, error instanceof Error ? error.message : String(error))
    console.error(`[RFQ WhatsApp] Error stack:`, error instanceof Error ? error.stack : 'N/A')
    console.error(`[RFQ WhatsApp] ========================================`)
    
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send quote request via WhatsApp"
    }
  }
}

