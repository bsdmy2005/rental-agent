"use server"

import { ServerClient, Models } from "postmark"
import { db } from "@/db"
import {
  quotesTable,
  quoteRequestsTable,
  serviceProvidersTable,
  propertiesTable,
  incidentsTable,
  type SelectQuote
} from "@/db/schema"
import { eq } from "drizzle-orm"
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
 * Send quote acceptance email to service provider
 */
export async function sendQuoteAcceptanceEmailAction(
  quoteId: string
): Promise<ActionState<SelectQuote>> {
  try {
    // Get quote
    const [quote] = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.id, quoteId))
      .limit(1)

    if (!quote) {
      return { isSuccess: false, message: "Quote not found" }
    }

    // Get quote request
    const [quoteRequest] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.id, quote.quoteRequestId))
      .limit(1)

    if (!quoteRequest) {
      return { isSuccess: false, message: "Quote request not found" }
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

    // Get property
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
    let incidentTitle = quoteRequest.title || "Quote Request"
    if (quoteRequest.incidentId) {
      const [incident] = await db
        .select()
        .from(incidentsTable)
        .where(eq(incidentsTable.id, quoteRequest.incidentId))
        .limit(1)

      if (incident) {
        incidentTitle = incident.title
      }
    }

    // Email subject
    const subject = `Quote Accepted: ${incidentTitle} - ${property.name}`

    // Email body
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Quote Accepted</h2>
          <p>Hello ${provider.contactName},</p>
          
          <p>Great news! Your quote has been accepted for the following work:</p>
          
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Quote Details</h3>
            <p><strong>Amount:</strong> ${quote.amount}</p>
            <p><strong>Description:</strong> ${quote.description || "See original quote request"}</p>
            ${quote.estimatedCompletionDate ? `<p><strong>Estimated Completion Date:</strong> ${new Date(quote.estimatedCompletionDate).toLocaleDateString()}</p>` : ""}
            <p><strong>Property:</strong> ${property.name}</p>
            <p><strong>Address:</strong> ${property.streetAddress}, ${property.suburb}, ${property.province}</p>
          </div>
          
          <p>Please proceed with the work as outlined in your quote. If you have any questions or need to discuss any changes, please contact us.</p>
          
          <p>Thank you for your service.</p>
        </body>
      </html>
    `.trim()

    const textBody = `
Quote Accepted

Hello ${provider.contactName},

Great news! Your quote has been accepted for the following work:

Quote Details:
- Amount: ${quote.amount}
- Description: ${quote.description || "See original quote request"}
${quote.estimatedCompletionDate ? `- Estimated Completion Date: ${new Date(quote.estimatedCompletionDate).toLocaleDateString()}\n` : ""}
- Property: ${property.name}
- Address: ${property.streetAddress}, ${property.suburb}, ${property.province}

Please proceed with the work as outlined in your quote. If you have any questions or need to discuss any changes, please contact us.

Thank you for your service.
    `.trim()

    // Send email via Postmark
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "quotes@yourdomain.com"
    const postmarkClient = getPostmarkClient()

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: provider.email,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      TrackOpens: true,
      TrackLinks: Models.LinkTrackingOptions.HtmlAndText
    })

    return {
      isSuccess: true,
      message: "Quote acceptance email sent successfully",
      data: quote
    }
  } catch (error) {
    console.error("Error sending quote acceptance email:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send quote acceptance email"
    }
  }
}

/**
 * Send quote rejection email to service provider (optional)
 */
export async function sendQuoteRejectionEmailAction(
  quoteId: string,
  reason?: string
): Promise<ActionState<SelectQuote>> {
  try {
    // Get quote
    const [quote] = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.id, quoteId))
      .limit(1)

    if (!quote) {
      return { isSuccess: false, message: "Quote not found" }
    }

    // Get quote request
    const [quoteRequest] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.id, quote.quoteRequestId))
      .limit(1)

    if (!quoteRequest) {
      return { isSuccess: false, message: "Quote request not found" }
    }

    // Get service provider
    const [provider] = await db
      .select()
      .from(serviceProvidersTable)
      .where(eq(serviceProvidersTable.id, quoteRequest.serviceProviderId))
      .limit(1)

    if (!provider || !provider.email) {
      return { isSuccess: false, message: "Service provider email not found" }
    }

    // Get property
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

    // Email subject
    const subject = `Quote Update: ${property.name}`

    // Email body
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Quote Update</h2>
          <p>Hello ${provider.contactName},</p>
          
          <p>Thank you for submitting your quote. Unfortunately, we have decided to proceed with another provider for this project.</p>
          
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
          
          <p>We appreciate your time and will keep you in mind for future projects.</p>
          
          <p>Thank you for your service.</p>
        </body>
      </html>
    `.trim()

    const textBody = `
Quote Update

Hello ${provider.contactName},

Thank you for submitting your quote. Unfortunately, we have decided to proceed with another provider for this project.

${reason ? `Reason: ${reason}\n` : ""}
We appreciate your time and will keep you in mind for future projects.

Thank you for your service.
    `.trim()

    // Send email via Postmark
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "quotes@yourdomain.com"
    const postmarkClient = getPostmarkClient()

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: provider.email,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      TrackOpens: true,
      TrackLinks: Models.LinkTrackingOptions.HtmlAndText
    })

    return {
      isSuccess: true,
      message: "Quote rejection email sent successfully",
      data: quote
    }
  } catch (error) {
    console.error("Error sending quote rejection email:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send quote rejection email"
    }
  }
}

