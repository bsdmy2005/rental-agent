"use server"

import { ServerClient, Models, type Attachment } from "postmark"
import { db } from "@/db"
import {
  quoteRequestsTable,
  incidentsTable,
  serviceProvidersTable,
  propertiesTable,
  tenantsTable,
  incidentAttachmentsTable,
  type SelectQuoteRequest
} from "@/db/schema"
import { eq, and, or, isNotNull } from "drizzle-orm"
import { ActionState } from "@/types"

/**
 * Get Postmark client instance
 */
function getPostmarkClient(): ServerClient {
  const apiKey = process.env.POSTMARK_API_KEY || process.env.POSTMARK_SERVER_API_TOKEN
  if (!apiKey) {
    throw new Error("POSTMARK_API_KEY or POSTMARK_SERVER_API_TOKEN environment variable is not set")
  }
  return new ServerClient(apiKey)
}

/**
 * Send quote request email to service provider
 */
export async function sendQuoteRequestEmailAction(
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

    // Get property (required for both incident-linked and standalone RFQs)
    if (!quoteRequest.propertyId) {
      return { isSuccess: false, message: "Quote request property ID is required" }
    }

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, quoteRequest.propertyId))
      .limit(1)

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
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
    const [provider] = await db
      .select()
      .from(serviceProvidersTable)
      .where(eq(serviceProvidersTable.id, quoteRequest.serviceProviderId))
      .limit(1)

    if (!provider) {
      return { isSuccess: false, message: "Service provider not found" }
    }

    if (!provider.email) {
      return { isSuccess: false, message: "Service provider email is required" }
    }

    // Get incident attachments (photos) if incident exists
    const emailAttachments: Attachment[] = []
    let attachmentCount = 0
    
    if (incident) {
      const attachments = await db
        .select()
        .from(incidentAttachmentsTable)
        .where(eq(incidentAttachmentsTable.incidentId, incident.id))
        .limit(5) // Limit to 5 photos

      attachmentCount = attachments.length

      // Prepare email attachments
      for (const attachment of attachments) {
        try {
          // Download attachment from Supabase
          const { downloadPDFFromSupabase } = await import("@/lib/storage/supabase-storage")
          const fileBuffer = await downloadPDFFromSupabase(attachment.fileUrl)
          const base64Content = fileBuffer.toString("base64")

          emailAttachments.push({
            Name: attachment.fileName,
            Content: base64Content,
            ContentType: attachment.fileType === "pdf" ? "application/pdf" : "image/jpeg",
            ContentLength: fileBuffer.length,
            ContentID: ""
          })
        } catch (error) {
          console.error(`Failed to download attachment ${attachment.id}:`, error)
          // Continue with other attachments
        }
      }
    }

    // Get RFQ attachments
    // In bulk RFQs, attachments are stored with the first provider's rfqCode,
    // but we need to attach them to all providers' emails.
    // So we look for related quote requests (same incidentId or same propertyId + requestedBy)
    // and use any of their rfqCodes to fetch attachments.
    let rfqCodeForAttachments: string | null = quoteRequest.rfqCode || null

    // If this quote request doesn't have an rfqCode, find a related one that does
    if (!rfqCodeForAttachments) {
      try {
        // Build conditions to find related quote requests
        const conditions = []
        
        // If linked to an incident, find other quote requests for the same incident
        if (quoteRequest.incidentId) {
          conditions.push(eq(quoteRequestsTable.incidentId, quoteRequest.incidentId))
        }
        
        // Also check for same property + requestedBy (for standalone RFQs)
        if (quoteRequest.propertyId && quoteRequest.requestedBy) {
          conditions.push(
            and(
              eq(quoteRequestsTable.propertyId, quoteRequest.propertyId),
              eq(quoteRequestsTable.requestedBy, quoteRequest.requestedBy)
            )
          )
        }

        if (conditions.length > 0) {
          // Find a related quote request that has an rfqCode
          // This could be the first provider's quote request in a bulk RFQ
          const [relatedRequest] = await db
            .select({ rfqCode: quoteRequestsTable.rfqCode })
            .from(quoteRequestsTable)
            .where(
              and(
                or(...conditions),
                isNotNull(quoteRequestsTable.rfqCode)
              )
            )
            .limit(1)

          if (relatedRequest?.rfqCode) {
            rfqCodeForAttachments = relatedRequest.rfqCode
          }
        }
      } catch (error) {
        console.error("Error finding related quote request for attachments:", error)
      }
    }

    // Fetch and attach RFQ attachments if we found a code
    if (rfqCodeForAttachments) {
      try {
        const { getRfqAttachmentsByRfqCodeAction } = await import("@/actions/rfq-attachments-actions")
        const rfqAttachmentsResult = await getRfqAttachmentsByRfqCodeAction(rfqCodeForAttachments)
        
        if (rfqAttachmentsResult.isSuccess && rfqAttachmentsResult.data) {
          attachmentCount += rfqAttachmentsResult.data.length
          
          // Add RFQ attachments to email attachments
          for (const attachment of rfqAttachmentsResult.data) {
            try {
              const { downloadPDFFromSupabase } = await import("@/lib/storage/supabase-storage")
              const fileBuffer = await downloadPDFFromSupabase(attachment.fileUrl)
              const base64Content = fileBuffer.toString("base64")

              // Determine correct content type based on file type
              let contentType = "application/pdf"
              if (attachment.fileType === "image") {
                // Check file extension for image type
                const fileName = attachment.fileName.toLowerCase()
                if (fileName.endsWith(".png")) {
                  contentType = "image/png"
                } else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
                  contentType = "image/jpeg"
                } else {
                  contentType = "image/jpeg" // Default
                }
              }

              emailAttachments.push({
                Name: attachment.fileName,
                Content: base64Content,
                ContentType: contentType,
                ContentLength: fileBuffer.length,
                ContentID: ""
              })
            } catch (error) {
              console.error(`Failed to download RFQ attachment ${attachment.id}:`, error)
              // Continue with other attachments
            }
          }
        }
      } catch (error) {
        console.error("Error fetching RFQ attachments:", error)
        // Continue without RFQ attachments
      }
    }

    // Use the unique email from quote request as the FROM address
    const uniqueEmail = quoteRequest.uniqueEmailAddress

    // Extract domain from unique email or use POSTMARK_FROM_EMAIL domain
    const emailDomain = uniqueEmail.includes("@") 
      ? uniqueEmail.split("@")[1] 
      : process.env.POSTMARK_FROM_EMAIL?.split("@")[1] || "yourdomain.com"
    
    // Get app URL for submission links
    // Use HTTP for localhost, HTTPS for production
    let appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      // Default to HTTP for localhost, HTTPS for other domains
      const isLocalhost = emailDomain.includes("localhost") || emailDomain.includes("127.0.0.1")
      appUrl = isLocalhost ? `http://${emailDomain}` : `https://${emailDomain}`
    }
    // Ensure localhost always uses HTTP
    if (appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
      appUrl = appUrl.replace(/^https:\/\//, "http://")
    }
    
    // Extract just the domain name (without protocol) for display
    const domainName = appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")

    // Email subject - use incident title or RFQ title
    const requestTitle = incident?.title || quoteRequest.title || "Quote Request"
    const subject = `Quote Request: ${requestTitle} - ${property.name}`

    // Email body
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Quote Request</h2>
          <p>Hello ${provider.contactName},</p>
          
          <p>We have a maintenance request that requires a quote. Please review the details below and reply to this email with your quote.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>${incident ? "Incident Details" : "Request Details"}</h3>
            ${incident ? `<p><strong>Title:</strong> ${incident.title}</p>` : quoteRequest.title ? `<p><strong>Title:</strong> ${quoteRequest.title}</p>` : ""}
            ${incident ? `<p><strong>Description:</strong> ${incident.description}</p>` : quoteRequest.description ? `<p><strong>Description:</strong> ${quoteRequest.description}</p>` : ""}
            ${incident ? `<p><strong>Priority:</strong> ${incident.priority}</p>` : ""}
            <p><strong>Property:</strong> ${property.name}</p>
            <p><strong>Address:</strong> ${property.streetAddress}, ${property.suburb}, ${property.province}</p>
            ${tenant ? `<p><strong>Tenant:</strong> ${tenant.name}</p>` : ""}
            ${quoteRequest.notes ? `<p><strong>Additional Notes:</strong> ${quoteRequest.notes}</p>` : ""}
            ${quoteRequest.dueDate ? `<p><strong>Quote Due Date:</strong> ${new Date(quoteRequest.dueDate).toLocaleDateString()}</p>` : ""}
          </div>
          
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>How to Respond</h3>
            <p>Please reply to this email with:</p>
            <ul>
              <li>Your quote amount (e.g., R 1,500.00)</li>
              <li>Description of work to be performed</li>
              <li>Estimated completion date (if available)</li>
            </ul>
            ${quoteRequest.rfqCode ? `<p><strong>Or submit online at:</strong> <a href="${appUrl}/submit-quote/${quoteRequest.rfqCode}">${domainName}/submit-quote/${quoteRequest.rfqCode}</a></p>` : ""}
          </div>
          
          ${attachmentCount > 0 ? `<p><strong>Attachments:</strong> ${attachmentCount} file(s) attached</p>` : ""}
          
          <p>Thank you for your service.</p>
        </body>
      </html>
    `.trim()

    const textBody = `
Quote Request

Hello ${provider.contactName},

We have a maintenance request that requires a quote. Please review the details below and reply to this email with your quote.

${incident ? "Incident Details:" : "Request Details:"}
${incident ? `- Title: ${incident.title}` : quoteRequest.title ? `- Title: ${quoteRequest.title}` : ""}
${incident ? `- Description: ${incident.description}` : quoteRequest.description ? `- Description: ${quoteRequest.description}` : ""}
${incident ? `- Priority: ${incident.priority}` : ""}
- Property: ${property.name}
- Address: ${property.streetAddress}, ${property.suburb}, ${property.province}
${tenant ? `- Tenant: ${tenant.name}\n` : ""}${quoteRequest.notes ? `- Additional Notes: ${quoteRequest.notes}\n` : ""}${quoteRequest.dueDate ? `- Quote Due Date: ${new Date(quoteRequest.dueDate).toLocaleDateString()}\n` : ""}

How to Respond:
Please reply to this email with:
- Your quote amount (e.g., R 1,500.00)
- Description of work to be performed
- Estimated completion date (if available)

${quoteRequest.rfqCode ? `Or submit online at: ${domainName}/submit-quote/${quoteRequest.rfqCode}\n` : ""}

${attachmentCount > 0 ? `Attachments: ${attachmentCount} file(s) attached\n` : ""}

Thank you for your service.
    `.trim()

    // Send email via Postmark - FROM the unique email address
    const postmarkClient = getPostmarkClient()

    const emailResponse = await postmarkClient.sendEmail({
      From: uniqueEmail,
      To: provider.email,
      ReplyTo: uniqueEmail,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      Attachments: emailAttachments,
      TrackOpens: true,
      TrackLinks: Models.LinkTrackingOptions.HtmlAndText
    })

    // Update quote request with email message ID
    const [updatedQuoteRequest] = await db
      .update(quoteRequestsTable)
      .set({
        emailMessageId: emailResponse.MessageID
      })
      .where(eq(quoteRequestsTable.id, quoteRequestId))
      .returning()

    if (!updatedQuoteRequest) {
      return { isSuccess: false, message: "Failed to update quote request" }
    }

    return {
      isSuccess: true,
      message: "Quote request email sent successfully",
      data: updatedQuoteRequest
    }
  } catch (error) {
    console.error("Error sending quote request email:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send quote request email"
    }
  }
}
