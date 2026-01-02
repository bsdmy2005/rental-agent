/**
 * Notification Service for Incident Alerts
 *
 * This service handles:
 * - Getting notification recipients for a property (landlord and rental agent)
 * - Formatting email notifications for new incidents
 * - Formatting WhatsApp notifications for new incidents
 */

import { db } from "@/db"
import {
  propertiesTable,
  propertyManagementsTable,
  userProfilesTable,
  notificationPreferencesTable,
  landlordsTable,
  rentalAgentsTable
} from "@/db/schema"
import { eq, and } from "drizzle-orm"

/**
 * Represents a notification recipient with their contact info and preferences
 */
export interface NotificationRecipient {
  userProfileId: string
  name: string
  email?: string
  whatsappPhone?: string
  notifyEmail: boolean
  notifyWhatsapp: boolean
  notifyNewIncidents: boolean
  notifyUrgentOnly: boolean
}

/**
 * Data required to format an incident notification
 */
export interface IncidentNotificationData {
  incidentId: string
  referenceNumber: string
  propertyName: string
  propertyAddress?: string
  description: string
  priority: string
  tenantName?: string
  tenantPhone?: string
  attachmentCount: number
}

/**
 * Email notification content structure
 */
export interface EmailNotificationContent {
  subject: string
  text: string
  html: string
}

/**
 * Get notification recipients for a property
 *
 * Looks up the property's landlord and any active rental agent managing the property,
 * then retrieves their notification preferences.
 *
 * @param propertyId - The UUID of the property
 * @returns Array of notification recipients with their preferences
 */
export async function getPropertyNotificationRecipients(
  propertyId: string
): Promise<NotificationRecipient[]> {
  const recipients: NotificationRecipient[] = []

  // Get property with landlord info
  const property = await db
    .select({
      propertyId: propertiesTable.id,
      landlordId: propertiesTable.landlordId
    })
    .from(propertiesTable)
    .where(eq(propertiesTable.id, propertyId))
    .limit(1)

  if (!property.length) {
    return recipients
  }

  const { landlordId } = property[0]

  // Get landlord's user profile and notification preferences
  const landlordData = await db
    .select({
      userProfileId: userProfilesTable.id,
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      email: userProfilesTable.email,
      phone: userProfilesTable.phone,
      notifyEmail: notificationPreferencesTable.notifyEmail,
      notifyWhatsapp: notificationPreferencesTable.notifyWhatsapp,
      notifyNewIncidents: notificationPreferencesTable.notifyNewIncidents,
      notifyUrgentOnly: notificationPreferencesTable.notifyUrgentOnly,
      whatsappPhone: notificationPreferencesTable.whatsappPhone
    })
    .from(landlordsTable)
    .innerJoin(
      userProfilesTable,
      eq(landlordsTable.userProfileId, userProfilesTable.id)
    )
    .leftJoin(
      notificationPreferencesTable,
      eq(notificationPreferencesTable.userProfileId, userProfilesTable.id)
    )
    .where(eq(landlordsTable.id, landlordId))
    .limit(1)

  if (landlordData.length > 0) {
    const landlord = landlordData[0]
    recipients.push({
      userProfileId: landlord.userProfileId,
      name: formatName(landlord.firstName, landlord.lastName),
      email: landlord.email,
      whatsappPhone: landlord.whatsappPhone ?? landlord.phone ?? undefined,
      notifyEmail: landlord.notifyEmail ?? true,
      notifyWhatsapp: landlord.notifyWhatsapp ?? true,
      notifyNewIncidents: landlord.notifyNewIncidents ?? true,
      notifyUrgentOnly: landlord.notifyUrgentOnly ?? false
    })
  }

  // Get active rental agent for this property
  const managementData = await db
    .select({
      userProfileId: userProfilesTable.id,
      firstName: userProfilesTable.firstName,
      lastName: userProfilesTable.lastName,
      email: userProfilesTable.email,
      phone: userProfilesTable.phone,
      notifyEmail: notificationPreferencesTable.notifyEmail,
      notifyWhatsapp: notificationPreferencesTable.notifyWhatsapp,
      notifyNewIncidents: notificationPreferencesTable.notifyNewIncidents,
      notifyUrgentOnly: notificationPreferencesTable.notifyUrgentOnly,
      whatsappPhone: notificationPreferencesTable.whatsappPhone
    })
    .from(propertyManagementsTable)
    .innerJoin(
      rentalAgentsTable,
      eq(propertyManagementsTable.rentalAgentId, rentalAgentsTable.id)
    )
    .innerJoin(
      userProfilesTable,
      eq(rentalAgentsTable.userProfileId, userProfilesTable.id)
    )
    .leftJoin(
      notificationPreferencesTable,
      eq(notificationPreferencesTable.userProfileId, userProfilesTable.id)
    )
    .where(
      and(
        eq(propertyManagementsTable.propertyId, propertyId),
        eq(propertyManagementsTable.isActive, true)
      )
    )
    .limit(1)

  if (managementData.length > 0) {
    const agent = managementData[0]
    recipients.push({
      userProfileId: agent.userProfileId,
      name: formatName(agent.firstName, agent.lastName),
      email: agent.email,
      whatsappPhone: agent.whatsappPhone ?? agent.phone ?? undefined,
      notifyEmail: agent.notifyEmail ?? true,
      notifyWhatsapp: agent.notifyWhatsapp ?? true,
      notifyNewIncidents: agent.notifyNewIncidents ?? true,
      notifyUrgentOnly: agent.notifyUrgentOnly ?? false
    })
  }

  return recipients
}

/**
 * Format an incident notification for email
 *
 * Creates subject, plain text, and HTML versions of the email.
 *
 * @param data - The incident data to include in the notification
 * @returns Email notification content with subject, text, and HTML
 */
export function formatIncidentEmailNotification(
  data: IncidentNotificationData
): EmailNotificationContent {
  const {
    referenceNumber,
    propertyName,
    propertyAddress,
    description,
    priority,
    tenantName,
    tenantPhone,
    attachmentCount
  } = data

  const priorityLabel = getPriorityLabel(priority)
  const priorityEmoji = getPriorityEmoji(priority)

  // Email subject
  const subject = `${priorityEmoji} New Incident: ${referenceNumber} - ${propertyName}`

  // Plain text version
  const text = `
New Incident Report

Reference: ${referenceNumber}
Property: ${propertyName}${propertyAddress ? `\nAddress: ${propertyAddress}` : ""}
Priority: ${priorityLabel}
${tenantName ? `Tenant: ${tenantName}` : ""}${tenantPhone ? `\nContact: ${tenantPhone}` : ""}

Description:
${description}

${attachmentCount > 0 ? `Attachments: ${attachmentCount} file(s)` : ""}

---
This is an automated notification from PropNxt.AI.
Log in to your dashboard to respond to this incident.
`.trim()

  // HTML version
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Incident Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${getPriorityColor(priority)}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 12px; }
    .label { font-weight: 600; color: #555; }
    .value { margin-top: 4px; }
    .description { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid ${getPriorityColor(priority)}; }
    .footer { margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
    .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: white; color: ${getPriorityColor(priority)}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 18px;">${priorityEmoji} New Incident Report</h1>
      <p style="margin: 8px 0 0;">Reference: ${referenceNumber}</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Property</div>
        <div class="value">${escapeHtml(propertyName)}${propertyAddress ? `<br><small style="color: #666;">${escapeHtml(propertyAddress)}</small>` : ""}</div>
      </div>
      <div class="field">
        <div class="label">Priority</div>
        <div class="value"><span class="priority-badge">${priorityLabel}</span></div>
      </div>
      ${
        tenantName
          ? `
      <div class="field">
        <div class="label">Reported By</div>
        <div class="value">${escapeHtml(tenantName)}${tenantPhone ? ` - ${escapeHtml(tenantPhone)}` : ""}</div>
      </div>
      `
          : ""
      }
      <div class="field">
        <div class="label">Description</div>
        <div class="description">${escapeHtml(description).replace(/\n/g, "<br>")}</div>
      </div>
      ${
        attachmentCount > 0
          ? `
      <div class="field">
        <div class="label">Attachments</div>
        <div class="value">${attachmentCount} file(s) attached</div>
      </div>
      `
          : ""
      }
    </div>
    <div class="footer">
      <p>This is an automated notification from PropNxt.AI.</p>
      <p>Log in to your dashboard to respond to this incident.</p>
    </div>
  </div>
</body>
</html>
`.trim()

  return { subject, text, html }
}

/**
 * Format an incident notification for WhatsApp
 *
 * Creates a WhatsApp-friendly message with the incident details.
 *
 * @param data - The incident data to include in the notification
 * @returns Formatted WhatsApp message string
 */
export function formatIncidentWhatsAppNotification(
  data: IncidentNotificationData
): string {
  const {
    referenceNumber,
    propertyName,
    propertyAddress,
    description,
    priority,
    tenantName,
    tenantPhone,
    attachmentCount
  } = data

  const priorityEmoji = getPriorityEmoji(priority)
  const priorityLabel = getPriorityLabel(priority)

  // Truncate description if too long for WhatsApp
  const maxDescLength = 500
  const truncatedDesc =
    description.length > maxDescLength
      ? description.substring(0, maxDescLength) + "..."
      : description

  let message = `${priorityEmoji} *New Incident Report*\n\n`
  message += `*Reference:* ${referenceNumber}\n`
  message += `*Property:* ${propertyName}\n`

  if (propertyAddress) {
    message += `*Address:* ${propertyAddress}\n`
  }

  message += `*Priority:* ${priorityLabel}\n`

  if (tenantName) {
    message += `*Reported By:* ${tenantName}\n`
  }

  if (tenantPhone) {
    message += `*Contact:* ${tenantPhone}\n`
  }

  message += `\n*Description:*\n${truncatedDesc}\n`

  if (attachmentCount > 0) {
    message += `\n📎 *Attachments:* ${attachmentCount} file(s)\n`
  }

  message += `\n---\n`
  message += `Log in to your dashboard to respond to this incident.`

  return message
}

/**
 * Filter recipients based on incident priority and preferences
 *
 * Filters out recipients who:
 * - Don't want new incident notifications
 * - Only want urgent notifications but this isn't urgent
 *
 * @param recipients - Array of potential recipients
 * @param priority - The incident priority
 * @returns Filtered array of recipients who should be notified
 */
export function filterRecipientsByPreferences(
  recipients: NotificationRecipient[],
  priority: string
): NotificationRecipient[] {
  const isUrgent = priority === "urgent" || priority === "high"

  return recipients.filter((recipient) => {
    // Must want new incident notifications
    if (!recipient.notifyNewIncidents) {
      return false
    }

    // If they only want urgent, check priority
    if (recipient.notifyUrgentOnly && !isUrgent) {
      return false
    }

    // Must have at least one notification method enabled
    if (!recipient.notifyEmail && !recipient.notifyWhatsapp) {
      return false
    }

    return true
  })
}

/**
 * Get recipients who should receive email notifications
 */
export function getEmailRecipients(
  recipients: NotificationRecipient[]
): NotificationRecipient[] {
  return recipients.filter((r) => r.notifyEmail && r.email)
}

/**
 * Get recipients who should receive WhatsApp notifications
 */
export function getWhatsAppRecipients(
  recipients: NotificationRecipient[]
): NotificationRecipient[] {
  return recipients.filter((r) => r.notifyWhatsapp && r.whatsappPhone)
}

// Helper functions

/**
 * Format a name from first and last name parts
 */
function formatName(firstName?: string | null, lastName?: string | null): string {
  const parts = [firstName, lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : "Unknown"
}

/**
 * Get human-readable priority label
 */
function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: "Low Priority",
    medium: "Medium Priority",
    high: "High Priority",
    urgent: "Urgent"
  }
  return labels[priority] ?? "Medium Priority"
}

/**
 * Get emoji for priority level
 */
function getPriorityEmoji(priority: string): string {
  const emojis: Record<string, string> = {
    low: "🟢",
    medium: "🟡",
    high: "🟠",
    urgent: "🔴"
  }
  return emojis[priority] ?? "🟡"
}

/**
 * Get color for priority level (used in HTML emails)
 */
function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: "#22c55e",
    medium: "#eab308",
    high: "#f97316",
    urgent: "#ef4444"
  }
  return colors[priority] ?? "#eab308"
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char])
}
