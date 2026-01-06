"use server"

import { ServerClient, Models } from "postmark"
import { ActionState } from "@/types"
import {
  getPropertyNotificationRecipients,
  formatIncidentEmailNotification,
  formatIncidentWhatsAppNotification
} from "@/lib/whatsapp/notification-service"
import { db } from "@/db"
import { incidentsTable, propertiesTable, incidentAttachmentsTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getWhatsAppServerUrl } from "@/lib/utils/get-app-url"

/**
 * Get Postmark client instance
 */
function getPostmarkClient(): ServerClient {
  const apiKey = process.env.POSTMARK_API_KEY || process.env.POSTMARK_SERVER_API_TOKEN
  if (!apiKey) {
    throw new Error("POSTMARK_API_KEY or POSTMARK_SERVER_API_TOKEN not found in environment")
  }
  return new ServerClient(apiKey)
}

/**
 * Send notifications for new incident
 *
 * Retrieves incident details, gets notification recipients based on property,
 * and sends email and WhatsApp notifications based on recipient preferences.
 *
 * @param incidentId - The UUID of the incident to send notifications for
 * @returns Result with counts of emails and WhatsApp messages sent
 */
export async function sendIncidentNotificationsAction(
  incidentId: string
): Promise<ActionState<{ emailsSent: number; whatsappSent: number }>> {
  try {
    // Get incident details with property information
    const [incident] = await db
      .select({
        incident: incidentsTable,
        propertyName: propertiesTable.name,
        propertyAddress: propertiesTable.address
      })
      .from(incidentsTable)
      .leftJoin(propertiesTable, eq(incidentsTable.propertyId, propertiesTable.id))
      .where(eq(incidentsTable.id, incidentId))
      .limit(1)

    if (!incident) {
      return { isSuccess: false, message: "Incident not found" }
    }

    // Get attachment count for the incident
    const attachments = await db
      .select()
      .from(incidentAttachmentsTable)
      .where(eq(incidentAttachmentsTable.incidentId, incidentId))

    // Generate a reference number from the incident ID
    const referenceNumber = `INC-${incidentId.substring(0, 8).toUpperCase()}`

    // Build notification data object
    const notificationData = {
      incidentId,
      referenceNumber,
      propertyName: incident.propertyName || "Unknown Property",
      propertyAddress: incident.propertyAddress || undefined,
      description: incident.incident.description,
      priority: incident.incident.priority,
      tenantName: incident.incident.submittedName || undefined,
      tenantPhone: incident.incident.submittedPhone || undefined,
      attachmentCount: attachments.length
    }

    // Get recipients for this property (landlord and/or rental agent)
    const recipients = await getPropertyNotificationRecipients(
      incident.incident.propertyId
    )

    let emailsSent = 0
    let whatsappSent = 0

    // Send notifications to each recipient based on their preferences
    for (const recipient of recipients) {
      // Send email notification if enabled and email is available
      if (recipient.notifyEmail && recipient.email) {
        try {
          const emailContent = formatIncidentEmailNotification(notificationData)
          const fromEmail = process.env.POSTMARK_FROM_EMAIL || "incidents@yourdomain.com"
          const postmarkClient = getPostmarkClient()

          await postmarkClient.sendEmail({
            From: fromEmail,
            To: recipient.email,
            Subject: emailContent.subject,
            HtmlBody: emailContent.html,
            TextBody: emailContent.text,
            TrackOpens: true,
            TrackLinks: Models.LinkTrackingOptions.HtmlAndText
          })

          console.log(`[Notification] Sent email to ${recipient.email}`)
          emailsSent++
        } catch (emailError) {
          console.error(`[Notification] Failed to send email to ${recipient.email}:`, emailError)
        }
      }

      // Send WhatsApp notification if enabled and phone is available
      if (recipient.notifyWhatsapp && recipient.whatsappPhone) {
        try {
          const whatsappContent = formatIncidentWhatsAppNotification(notificationData)

          // Send via Baileys server API
          const baileysUrl = getWhatsAppServerUrl()
          const response = await fetch(`${baileysUrl}/api/send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: recipient.whatsappPhone,
              message: whatsappContent
            })
          })

          if (response.ok) {
            console.log(`[Notification] Sent WhatsApp to ${recipient.whatsappPhone}`)
            whatsappSent++
          } else {
            console.error(`[Notification] Failed to send WhatsApp to ${recipient.whatsappPhone}`)
          }
        } catch (whatsappError) {
          console.error(`[Notification] Failed to send WhatsApp to ${recipient.whatsappPhone}:`, whatsappError)
        }
      }
    }

    return {
      isSuccess: true,
      message: `Notifications sent: ${emailsSent} emails, ${whatsappSent} WhatsApp`,
      data: { emailsSent, whatsappSent }
    }
  } catch (error) {
    console.error("Error sending notifications:", error)
    return { isSuccess: false, message: "Failed to send notifications" }
  }
}
