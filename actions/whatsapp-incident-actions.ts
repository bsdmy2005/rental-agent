"use server"

import { db } from "@/db"
import { incidentsTable, incidentStatusHistoryTable } from "@/db/schema"
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
    if (!isIncidentReport(messageText)) {
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
    const parsed = parseIncidentFromWhatsApp(messageText)

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
export function getIncidentHelpMessageAction(): ActionState<{ message: string }> {
  return {
    isSuccess: true,
    message: "Help message retrieved",
    data: {
      message: formatIncidentHelpMessage()
    }
  }
}

