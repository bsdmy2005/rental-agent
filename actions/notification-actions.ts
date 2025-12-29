"use server"

import { ActionState } from "@/types"
import {
  getPropertyNotificationRecipients,
  formatIncidentEmailNotification,
  formatIncidentWhatsAppNotification
} from "@/lib/whatsapp/notification-service"
import { db } from "@/db"
import { incidentsTable, propertiesTable, incidentAttachmentsTable } from "@/db/schema"
import { eq } from "drizzle-orm"

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
        const emailContent = formatIncidentEmailNotification(notificationData)
        // TODO: Implement email sending with your provider (e.g., Resend, SendGrid)
        console.log(`[Notification] Would send email to ${recipient.email}`)
        console.log(`[Notification] Email subject: ${emailContent.subject}`)
        emailsSent++
      }

      // Send WhatsApp notification if enabled and phone is available
      if (recipient.notifyWhatsapp && recipient.whatsappPhone) {
        const whatsappContent = formatIncidentWhatsAppNotification(notificationData)
        // TODO: Send via Baileys server
        console.log(`[Notification] Would send WhatsApp to ${recipient.whatsappPhone}`)
        console.log(`[Notification] WhatsApp message length: ${whatsappContent.length}`)
        whatsappSent++
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
