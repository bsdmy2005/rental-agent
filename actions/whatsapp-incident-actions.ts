"use server"

import { db } from "@/db"
import {
  incidentsTable,
  incidentStatusHistoryTable,
  propertiesTable,
  incidentAttachmentsTable
} from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"
import type { SelectIncident } from "@/db/schema"
import {
  identifyPropertyFromMessage,
  checkRateLimit,
  recordSubmission,
  parseIncidentFromWhatsApp,
  isIncidentReport
} from "@/lib/whatsapp/incident-handler"
import { formatIncidentConfirmationMessage, formatErrorMessage, formatIncidentHelpMessage } from "@/lib/whatsapp/message-formatter"
import { sendIncidentNotificationsAction } from "./notification-actions"
import { getOpenIncidentsByPhoneNumberQuery } from "@/queries/incidents-queries"

/**
 * Normalize phone number to 27... format (without +)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "")
  
  // Handle South African numbers
  if (digits.startsWith("0")) {
    // 0821234567 -> 27821234567
    return "27" + digits.substring(1)
  } else if (digits.startsWith("27")) {
    // Already in correct format
    return digits
  } else if (digits.startsWith("8")) {
    // 821234567 -> 27821234567
    return "27" + digits
  }
  
  // Return as-is if no pattern matches
  return digits
}

/**
 * Create incident from WhatsApp message
 * Main action for handling WhatsApp incident submissions
 */
export async function createIncidentFromWhatsAppAction(
  messageText: string,
  fromPhoneNumber: string,
  sessionId: string
): Promise<ActionState<{ incident: SelectIncident; confirmationMessage: string }>> {
  try {
    const normalizedPhone = normalizePhoneNumber(fromPhoneNumber)

    // Check if message is an incident report
    if (!(await isIncidentReport(messageText))) {
      return {
        isSuccess: false,
        message: "Message does not appear to be an incident report. " + formatIncidentHelpMessage()
      }
    }

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(normalizedPhone)
    if (!rateLimitCheck.isSuccess || !rateLimitCheck.data) {
      return {
        isSuccess: false,
        message: "Failed to check rate limit"
      }
    }

    if (!rateLimitCheck.data.allowed) {
      const resetTime = new Date(rateLimitCheck.data.resetAt).toLocaleTimeString()
      return {
        isSuccess: false,
        message: `Rate limit exceeded. You have submitted ${3 - rateLimitCheck.data.remaining} incidents in the last hour. Please try again after ${resetTime}.`
      }
    }

    // Identify property
    const propertyResult = await identifyPropertyFromMessage(messageText, normalizedPhone)
    if (!propertyResult.isSuccess || !propertyResult.data) {
      return {
        isSuccess: false,
        message: propertyResult.message || "Failed to identify property"
      }
    }

    const { propertyId, propertyName, tenantId, tenantName } = propertyResult.data

    // Parse incident details
    const parsed = await parseIncidentFromWhatsApp(messageText)

    // Validate required fields
    if (!parsed.description && !parsed.title) {
      return {
        isSuccess: false,
        message: "Please provide a description of the incident. " + formatIncidentHelpMessage()
      }
    }

    // Create incident
    const [newIncident] = await db
      .insert(incidentsTable)
      .values({
        propertyId,
        tenantId: tenantId || null,
        title: parsed.title || parsed.description?.substring(0, 100) || "Incident Report",
        description: parsed.description || parsed.title || "No description provided",
        priority: parsed.priority || "medium",
        status: "reported",
        submissionMethod: "whatsapp",
        submittedPhone: normalizedPhone,
        submittedName: tenantName || null,
        isVerified: !!tenantId // Verified if tenant matched
      })
      .returning()

    if (!newIncident) {
      return {
        isSuccess: false,
        message: "Failed to create incident"
      }
    }

    // Create initial status history entry
    await db.insert(incidentStatusHistoryTable).values({
      incidentId: newIncident.id,
      status: newIncident.status,
      changedBy: null,
      notes: tenantName
        ? `Incident reported by ${tenantName} via WhatsApp`
        : "Incident reported via WhatsApp"
    })

    // Record submission for rate limiting
    await recordSubmission(normalizedPhone)

    // Generate reference number (use first 8 chars of UUID)
    const referenceNumber = `INC-${newIncident.id.substring(0, 8).toUpperCase()}`

    // Format confirmation message
    const confirmationMessage = formatIncidentConfirmationMessage(
      newIncident.id,
      referenceNumber,
      propertyName
    )

    // Send notifications to agent/landlord (non-blocking)
    sendIncidentNotificationsAction(newIncident.id).catch(err => {
      console.error("Error sending incident notifications:", err)
    })

    return {
      isSuccess: true,
      message: "Incident created successfully",
      data: {
        incident: newIncident,
        confirmationMessage
      }
    }
  } catch (error) {
    console.error("Error creating incident from WhatsApp:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create incident"
    }
  }
}

/**
 * Get help message for incident submission
 */
export async function getIncidentHelpMessageAction(): Promise<ActionState<{ message: string }>> {
  return {
    isSuccess: true,
    message: "Help message retrieved",
    data: {
      message: formatIncidentHelpMessage()
    }
  }
}

/**
 * Create incident from conversation state
 * Used by the conversation state machine when a user completes the incident reporting flow
 *
 * @param data - The incident data collected during the conversation
 * @param data.propertyId - UUID of the property where the incident occurred
 * @param data.tenantId - Optional UUID of the tenant if identified
 * @param data.tenantName - Optional name of the tenant
 * @param data.description - Description of the incident
 * @param data.phoneNumber - Phone number of the person reporting
 * @param data.attachments - Optional array of attachments (photos, documents)
 * @returns ActionState with incident ID, reference number, and confirmation message
 */
export async function createIncidentFromConversationAction(data: {
  propertyId: string
  tenantId?: string
  tenantName?: string
  description: string
  phoneNumber: string
  attachments?: Array<{ url: string; type: string; fileName: string }>
}): Promise<
  ActionState<{
    incidentId: string
    referenceNumber: string
    confirmationMessage: string
  }>
> {
  try {
    const { propertyId, tenantId, tenantName, description, phoneNumber, attachments } =
      data

    // Get property name for confirmation message
    const [property] = await db
      .select({ name: propertiesTable.name })
      .from(propertiesTable)
      .where(eq(propertiesTable.id, propertyId))
      .limit(1)

    const propertyName = property?.name || "Unknown Property"

    // Create incident record
    const [newIncident] = await db
      .insert(incidentsTable)
      .values({
        propertyId,
        tenantId: tenantId || null,
        title: description.substring(0, 100),
        description,
        priority: "medium",
        status: "reported",
        submissionMethod: "whatsapp",
        submittedPhone: phoneNumber,
        submittedName: tenantName || null,
        isVerified: !!tenantId
      })
      .returning()

    if (!newIncident) {
      return { isSuccess: false, message: "Failed to create incident" }
    }

    // Create initial status history entry for audit trail
    await db.insert(incidentStatusHistoryTable).values({
      incidentId: newIncident.id,
      status: newIncident.status,
      changedBy: null,
      notes: tenantName
        ? `Incident reported by ${tenantName} via WhatsApp`
        : "Incident reported via WhatsApp"
    })

    // Add attachments if any were provided during the conversation
    if (attachments && attachments.length > 0) {
      console.log(`[Incident Creation] Adding ${attachments.length} attachment(s) to incident ${newIncident.id}`)
      console.log(`[Incident Creation] Attachments:`, attachments.map(att => ({
        url: att.url,
        fileName: att.fileName,
        type: att.type
      })))
      
      const attachmentValues = attachments.map(att => ({
        incidentId: newIncident.id,
        fileUrl: att.url,
        fileName: att.fileName || "attachment",
        fileType: att.type || "image"
      }))
      
      await db.insert(incidentAttachmentsTable).values(attachmentValues)
      console.log(`[Incident Creation] Successfully saved ${attachmentValues.length} attachment(s) to database`)
    } else {
      console.log(`[Incident Creation] No attachments provided for incident ${newIncident.id}`)
    }

    // Record submission for rate limiting
    await recordSubmission(phoneNumber)

    // Generate reference number using first 8 characters of UUID
    const referenceNumber = `INC-${newIncident.id.substring(0, 8).toUpperCase()}`

    // Format confirmation message to send back to user
    const confirmationMessage = formatIncidentConfirmationMessage(
      newIncident.id,
      referenceNumber,
      propertyName
    )

    // Send notifications to agent/landlord (non-blocking)
    sendIncidentNotificationsAction(newIncident.id).catch(err => {
      console.error("Error sending incident notifications:", err)
    })

    return {
      isSuccess: true,
      message: "Incident created successfully",
      data: {
        incidentId: newIncident.id,
        referenceNumber,
        confirmationMessage
      }
    }
  } catch (error) {
    console.error("Error creating incident from conversation:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create incident"
    }
  }
}

/**
 * Get open incidents by phone number
 * Returns incidents that are not closed, formatted for display
 */
export async function getOpenIncidentsByPhoneAction(
  phoneNumber: string
): Promise<ActionState<SelectIncident[]>> {
  try {
    const incidents = await getOpenIncidentsByPhoneNumberQuery(phoneNumber)

    return {
      isSuccess: true,
      message: `Found ${incidents.length} open incident${incidents.length !== 1 ? "s" : ""}`,
      data: incidents
    }
  } catch (error) {
    console.error("Error getting open incidents by phone:", error)
    return {
      isSuccess: false,
      message: "Failed to get open incidents"
    }
  }
}

