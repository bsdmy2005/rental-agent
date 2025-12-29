/**
 * Conversation State Machine for WhatsApp Incident Reporting
 *
 * This module manages the multi-turn conversation flow for incident reporting
 * via WhatsApp. It handles tenant identification, verification, incident
 * creation, and follow-up interactions.
 *
 * States:
 * - idle: Waiting for incident report trigger
 * - awaiting_email: Waiting for email for OTP verification
 * - awaiting_otp: Waiting for OTP code verification
 * - awaiting_property: Waiting for property code
 * - awaiting_description: Waiting for incident description
 * - awaiting_photos: Optionally collecting photos
 * - incident_active: Incident created, handling follow-ups
 * - awaiting_closure_confirmation: Confirming incident closure
 */

import {
  getOrCreateConversationStateAction,
  updateConversationStateAction,
  resetConversationStateAction
} from "@/actions/conversation-state-actions"
import { getTenantByPhoneAction } from "@/actions/tenants-actions"
import { sendOtpAction, verifyOtpAction } from "@/actions/otp-actions"
import {
  createIncidentFromConversationAction,
  getOpenIncidentsByPhoneAction,
  closeIncidentFromWhatsAppAction
} from "@/actions/whatsapp-incident-actions"
import {
  linkMessageToIncidentAction,
  getMessageDbIdAction
} from "@/actions/whatsapp-messages-actions"
import { validatePropertyCodeAction } from "@/actions/property-codes-actions"
import {
  isIncidentMessage,
  parseIncidentMessage,
  extractPropertyCode
} from "@/lib/whatsapp/message-parser"
import { parseIncidentFromWhatsApp } from "@/lib/whatsapp/incident-handler"
import { classifyMessageIntent } from "@/lib/whatsapp/ai-intent-classifier"
import { db } from "@/db"
import { incidentsTable } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Valid conversation states for the incident reporting flow
 */
export type ConversationState =
  | "idle"
  | "awaiting_email"
  | "awaiting_otp"
  | "awaiting_property"
  | "awaiting_description"
  | "awaiting_photos"
  | "incident_active"
  | "awaiting_closure_confirmation"
  | "awaiting_incident_selection"
  | "awaiting_new_incident_confirmation"
  | "awaiting_follow_up_confirmation"
  | "awaiting_update_or_closure"

/**
 * Response returned by the conversation state machine
 */
export interface ConversationResponse {
  /** The message to send back to the user */
  message: string
  /** Whether an incident was created during this interaction */
  incidentCreated: boolean
  /** The ID of the created/active incident (if any) */
  incidentId?: string
  /** Human-readable reference number for the incident */
  referenceNumber?: string
}

/**
 * Context stored in the conversation state
 */
export interface ConversationContext {
  tenantId?: string
  propertyId?: string
  propertyName?: string
  tenantName?: string
  partialDescription?: string
  pendingAttachments?: Array<{ url: string; type: string; fileName: string }>
  email?: string
  otpCode?: string
  otpExpiresAt?: string
  pendingMessageForNewIncident?: string
  pendingMessageForFollowUp?: string
  lastMessageAt?: string
  // For incident selection flow
  pendingMessageId?: string
  pendingMessageText?: string
  availableIncidents?: Array<{
    id: string
    reference: string
    title: string
    reportedAt: string
  }>
  selectedIncidentId?: string
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Normalize phone number to 27... format (without + prefix)
 * Handles South African phone numbers in various formats
 *
 * @param phone - The phone number to normalize
 * @returns Normalized phone number in 27XXXXXXXXX format
 *
 * @example
 * normalizePhone("+27821234567") // "27821234567"
 * normalizePhone("0821234567")   // "27821234567"
 * normalizePhone("27821234567")  // "27821234567"
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "")

  // Handle South African numbers
  if (digits.startsWith("0")) {
    // 0821234567 -> 27821234567
    return "27" + digits.substring(1)
  } else if (digits.startsWith("27")) {
    // Already in correct format
    return digits
  } else if (digits.startsWith("8") && digits.length === 9) {
    // 821234567 -> 27821234567
    return "27" + digits
  }

  // Return as-is if no pattern matches
  return digits
}

/**
 * Check if text looks like an email address
 *
 * @param text - The text to check
 * @returns true if text matches basic email pattern
 */
export function isEmail(text: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(text.trim())
}

/**
 * Check if text is a 6-digit OTP code
 *
 * @param text - The text to check
 * @returns true if text is exactly 6 digits
 */
export function isOtpCode(text: string): boolean {
  return /^\d{6}$/.test(text.trim())
}

// Note: isClosureRequest function removed
// Keyword-based closure detection caused false positives (e.g., "window doesn't close")
// Users are now explicitly asked if messages are updates or closures

/**
 * Check if text is an affirmative response
 *
 * @param text - The text to check
 * @returns true if text indicates agreement/confirmation
 */
function isAffirmative(text: string): boolean {
  const affirmatives = ["yes", "y", "yep", "yeah", "confirm", "ok", "okay", "sure", "1"]
  const lowerText = text.toLowerCase().trim()
  return affirmatives.includes(lowerText)
}

/**
 * Check if text is a negative response
 *
 * @param text - The text to check
 * @returns true if text indicates disagreement/cancellation
 */
function isNegative(text: string): boolean {
  const negatives = ["no", "n", "nope", "nah", "cancel", "nevermind", "0"]
  const lowerText = text.toLowerCase().trim()
  return negatives.includes(lowerText)
}

/**
 * Check if text is a help request
 *
 * @param text - The text to check
 * @returns true if text indicates a help request
 */
function isHelpRequest(text: string): boolean {
  const helpKeywords = ["help", "commands", "what can i do", "options", "?", "menu", "assist"]
  const lowerText = text.toLowerCase().trim()
  return helpKeywords.some((keyword) => lowerText.includes(keyword))
}

/**
 * Get context-specific help message
 *
 * @param state - Current conversation state
 * @param hasOpenIncidents - Whether user has open incidents
 * @param incidentReference - Optional incident reference number for active incidents
 * @returns Help message string
 */
function getHelpMessage(
  state: ConversationState,
  hasOpenIncidents: boolean,
  incidentReference?: string
): string {
  switch (state) {
    case "idle":
      return `Available actions:
• Report new incident - Describe your problem with property code
• Attach to existing - Reply 'no' when asked about new incident
• View open incidents - Send any message to see your open incidents
• Help - Type "help" anytime`

    case "incident_active":
      return `Available actions for ${incidentReference || "your incident"}:
• Add update - Just send a message
• Add photo - Send an image
• Close incident - Type "close"
• New incident - Type "new issue"
• Help - Type "help"`

    case "awaiting_incident_selection":
      return `Select incident number, type 'new' to create a new incident, or 'cancel' to exit.`

    case "awaiting_new_incident_confirmation":
    case "awaiting_follow_up_confirmation":
      return `You're being asked to confirm:
• Reply 'yes' to create new incident
• Reply 'no' to attach to existing incident
• Reply 'help' to see this menu again`

    case "awaiting_property":
      return `Please provide your property code (e.g., PROP-ABC123). Type 'cancel' to exit.`

    case "awaiting_description":
      return `Please describe the issue in detail. Type 'cancel' to exit.`

    case "awaiting_photos":
      return `Please send photos of the issue (if any), or type 'skip' to continue without photos.`

    case "awaiting_closure_confirmation":
      return `Reply 'yes' to close the incident, or 'no' to keep it open.`

    default:
      return `Type "help" for assistance. You can report incidents, view open incidents, or get help.`
  }
}

/**
 * Generate a human-readable reference number from incident ID
 *
 * @param incidentId - The UUID of the incident
 * @returns Reference number in INC-XXXXXXXX format
 */
function generateReferenceNumber(incidentId: string): string {
  return `INC-${incidentId.substring(0, 8).toUpperCase()}`
}

// -----------------------------------------------------------------------------
// Main State Machine
// -----------------------------------------------------------------------------

/**
 * Process an incoming WhatsApp message through the conversation state machine.
 * This is the main entry point for handling incident-related messages.
 *
 * @param phoneNumber - The sender's phone number (will be normalized)
 * @param messageText - The text content of the message
 * @param sessionId - Optional WhatsApp session ID
 * @param attachments - Optional array of media attachments
 * @returns ConversationResponse with reply message and incident status
 */
export async function processConversationMessage(
  phoneNumber: string,
  messageText: string,
  sessionId?: string,
  attachments?: Array<{ url: string; type: string; fileName: string }>
): Promise<ConversationResponse> {
  const normalizedPhone = normalizePhone(phoneNumber)
  const trimmedText = messageText.trim()

  try {
    // Get or create conversation state
    const stateResult = await getOrCreateConversationStateAction(normalizedPhone, sessionId)
    if (!stateResult.isSuccess || !stateResult.data) {
      return {
        message:
          "Sorry, we're experiencing technical difficulties. Please try again later.",
        incidentCreated: false
      }
    }

    const currentState = stateResult.data
    const state = currentState.state as ConversationState
    const context = (currentState.context || {}) as ConversationContext

    // Route to appropriate state handler
    switch (state) {
      case "idle":
        return await handleIdleState(normalizedPhone, trimmedText, context)

      case "awaiting_email":
        return await handleAwaitingEmailState(normalizedPhone, trimmedText, context)

      case "awaiting_otp":
        return await handleAwaitingOtpState(normalizedPhone, trimmedText, context)

      case "awaiting_property":
        return await handleAwaitingPropertyState(normalizedPhone, trimmedText, context)

      case "awaiting_description":
        return await handleAwaitingDescriptionState(
          normalizedPhone,
          trimmedText,
          context,
          attachments
        )

      case "awaiting_photos":
        return await handleAwaitingPhotosState(
          normalizedPhone,
          trimmedText,
          context,
          attachments
        )

      case "incident_active":
        return await handleIncidentActiveState(
          normalizedPhone,
          trimmedText,
          context,
          currentState.incidentId || undefined,
          attachments
        )

      case "awaiting_closure_confirmation":
        return await handleAwaitingClosureState(
          normalizedPhone,
          trimmedText,
          context,
          currentState.incidentId || undefined
        )

      case "awaiting_incident_selection":
        return await handleAwaitingIncidentSelectionState(
          normalizedPhone,
          trimmedText,
          context
        )

      case "awaiting_new_incident_confirmation":
        return await handleAwaitingNewIncidentConfirmationState(
          normalizedPhone,
          trimmedText,
          context
        )

      case "awaiting_follow_up_confirmation":
        return await handleAwaitingFollowUpConfirmationState(
          normalizedPhone,
          trimmedText,
          context
        )

      case "awaiting_update_or_closure":
        return await handleAwaitingUpdateOrClosureState(
          normalizedPhone,
          trimmedText,
          context,
          currentState.incidentId || undefined
        )

      default:
        // Unknown state, reset to idle
        await resetConversationStateAction(normalizedPhone)
        return {
          message:
            "Something went wrong. Please start over by describing your issue.",
          incidentCreated: false
        }
    }
  } catch (error) {
    console.error("Error processing conversation message:", error)
    return {
      message:
        "Sorry, an error occurred. Please try again or contact support.",
      incidentCreated: false
    }
  }
}

// -----------------------------------------------------------------------------
// State Handlers
// -----------------------------------------------------------------------------

/**
 * Handle messages in the idle state.
 * This is the entry point for new incident reports.
 *
 * Flow:
 * 1. Check if message looks like an incident report
 * 2. Try to identify tenant by phone number
 * 3. If identified, proceed to description collection
 * 4. If property code provided, validate and proceed
 * 5. Otherwise, ask for email for OTP verification
 */
async function handleIdleState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext
): Promise<ConversationResponse> {
  // Check for help request first
  if (isHelpRequest(messageText)) {
    const incidentsResult = await getOpenIncidentsByPhoneAction(phoneNumber)
    const hasOpenIncidents =
      incidentsResult.isSuccess &&
      incidentsResult.data &&
      incidentsResult.data.length > 0
    return {
      message: getHelpMessage("idle", hasOpenIncidents),
      incidentCreated: false
    }
  }

  // Check if user has open incidents
  const incidentsResult = await getOpenIncidentsByPhoneAction(phoneNumber)
  const hasOpenIncidents =
    incidentsResult.isSuccess && incidentsResult.data && incidentsResult.data.length > 0

  // If user has open incidents, use AI to classify intent
  if (hasOpenIncidents && incidentsResult.data) {
    const existingIncidents = incidentsResult.data.map(inc => ({
      id: inc.id,
      title: inc.title,
      description: inc.description,
      reportedAt: inc.reportedAt
    }))

    const classificationResult = await classifyMessageIntent(messageText, existingIncidents)
    
    if (classificationResult.isSuccess && classificationResult.data) {
      const classification = classificationResult.data
      
      // If AI suggests asking for clarification or is unclear, always ask
      if (classification.suggestedAction === "ask_clarification" || classification.intent === "unclear" || classification.confidence < 0.7) {
        await updateConversationStateAction(phoneNumber, {
          state: "awaiting_new_incident_confirmation",
          context: {
            pendingMessageForNewIncident: messageText,
            lastMessageAt: new Date().toISOString()
          } as ConversationContext
        })

        return {
          message:
            `I'm not sure if this is a new incident or an update to an existing one.\n\n` +
            `Are you logging a new incident? Reply 'yes' for new, 'no' to attach to existing, or 'help' for options.`,
          incidentCreated: false
        }
      }
      
      // If AI suggests it's a new incident with high confidence
      if (classification.suggestedAction === "create_new" && classification.confidence >= 0.7) {
        // Store message and ask for confirmation (always confirm, even with AI)
        await updateConversationStateAction(phoneNumber, {
          state: "awaiting_new_incident_confirmation",
          context: {
            pendingMessageForNewIncident: messageText,
            lastMessageAt: new Date().toISOString()
          } as ConversationContext
        })

        return {
          message:
            `This looks like a new incident. Are you logging a new incident? Reply 'yes' for new, 'no' to attach to existing, or 'help' for options.`,
          incidentCreated: false
        }
      }
      
      // If AI suggests it's a follow-up with high confidence
      if (classification.suggestedAction === "attach_to_existing" && classification.confidence >= 0.7) {
        // Still ask for confirmation - show the existing incidents
        const incidents = incidentsResult.data
        const incidentsList = incidents
          .map((incident, index) => {
            const ref = generateReferenceNumber(incident.id)
            return `${index + 1}. ${ref} - ${incident.title}`
          })
          .join("\n")

        await updateConversationStateAction(phoneNumber, {
          state: "awaiting_follow_up_confirmation",
          context: {
            pendingMessageForFollowUp: messageText,
            lastMessageAt: new Date().toISOString()
          } as ConversationContext
        })

        return {
          message:
            `This looks like it might be related to an existing incident. Which incident should this be attached to?\n\n${incidentsList}\n\n` +
            `Reply with the number, or 'new' to create a new incident, or 'cancel' to exit.`,
          incidentCreated: false
        }
      }
    }
    
    // Fallback: if AI classification fails, ask for confirmation
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_new_incident_confirmation",
      context: {
        pendingMessageForNewIncident: messageText,
        lastMessageAt: new Date().toISOString()
      } as ConversationContext
    })

    return {
      message:
        "Are you logging a new incident? Reply 'yes' for new, 'no' to attach to existing, or 'help' for options.",
      incidentCreated: false
    }
  }

  // If no open incidents and message doesn't look like an incident report, show help
  if (!hasOpenIncidents) {
    const isClearIncidentReport = isIncidentMessage(messageText)
    if (!isClearIncidentReport) {
      // No open incidents - show help message
      return {
        message:
          "Hi! I can help you report a property issue. Please describe your problem, " +
          "and include your property code if you have one (e.g., PROP-ABC123).\n\n" +
          "Example: 'PROP-ABC123 - The kitchen tap is leaking'",
        incidentCreated: false
      }
    }
  }

  // Try to identify tenant by phone number
  const tenantResult = await getTenantByPhoneAction(phoneNumber)

  if (tenantResult.isSuccess && tenantResult.data) {
    // Tenant identified by phone - proceed directly
    const tenant = tenantResult.data
    const parsed = parseIncidentMessage(messageText)

    // Update context with tenant info
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_description",
      context: {
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        propertyName: tenant.propertyName,
        tenantName: tenant.name,
        partialDescription: parsed.description
      }
    })

    // If we already have a description, create the incident
    if (parsed.description && parsed.description.length >= 10) {
      return await createIncidentFromState(phoneNumber, {
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        propertyName: tenant.propertyName,
        tenantName: tenant.name,
        partialDescription: parsed.description
      })
    }

    return {
      message:
        `Hi ${tenant.name}! I've identified you from your phone number. ` +
        `Please describe the issue at ${tenant.propertyName || "your property"} in detail.`,
      incidentCreated: false
    }
  }

  // Try to extract property code from message
  const propertyCode = extractPropertyCode(messageText)

  if (propertyCode) {
    // Validate property code
    const propertyResult = await validatePropertyCodeAction(propertyCode)

    if (propertyResult.isSuccess && propertyResult.data) {
      const property = propertyResult.data
      const parsed = parseIncidentMessage(messageText)

      // Property identified, proceed to description
      await updateConversationStateAction(phoneNumber, {
        state: "awaiting_description",
        context: {
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          partialDescription: parsed.description
        }
      })

      // If we already have a description, create the incident
      if (parsed.description && parsed.description.length >= 10) {
        return await createIncidentFromState(phoneNumber, {
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          partialDescription: parsed.description
        })
      }

      return {
        message:
          `Property ${property.propertyName} confirmed. ` +
          `Please describe your issue in detail.`,
        incidentCreated: false
      }
    } else {
      return {
        message:
          `Invalid or expired property code "${propertyCode}". ` +
          `Please check the code and try again, or provide your email address ` +
          `to verify your identity.`,
        incidentCreated: false
      }
    }
  }

  // No phone match and no property code - ask for email
  await updateConversationStateAction(phoneNumber, {
    state: "awaiting_email",
    context: {
      partialDescription: messageText
    }
  })

  return {
    message:
      "I couldn't identify you from your phone number. " +
      "Please enter the email address you used to register with your property, " +
      "and I'll send you a verification code.",
    incidentCreated: false
  }
}

/**
 * Handle messages in the awaiting_email state.
 * Validates email format and sends OTP for verification.
 */
async function handleAwaitingEmailState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext
): Promise<ConversationResponse> {
  // Check for help request
  if (isHelpRequest(messageText)) {
    return {
      message: getHelpMessage("awaiting_email", false),
      incidentCreated: false
    }
  }

  // Check if user wants to use property code instead
  const propertyCode = extractPropertyCode(messageText)
  if (propertyCode) {
    // Validate property code
    const propertyResult = await validatePropertyCodeAction(propertyCode)

    if (propertyResult.isSuccess && propertyResult.data) {
      const property = propertyResult.data

      await updateConversationStateAction(phoneNumber, {
        state: "awaiting_description",
        context: {
          ...context,
          propertyId: property.propertyId,
          propertyName: property.propertyName
        }
      })

      return {
        message:
          `Property ${property.propertyName} confirmed. ` +
          `Please describe your issue in detail.`,
        incidentCreated: false
      }
    }
  }

  // Validate email format
  if (!isEmail(messageText)) {
    return {
      message:
        "That doesn't look like a valid email address. " +
        "Please enter your email (e.g., john@example.com) " +
        "or your property code (e.g., PROP-ABC123).",
      incidentCreated: false
    }
  }

  // Send OTP
  const otpResult = await sendOtpAction(phoneNumber, messageText)

  if (!otpResult.isSuccess) {
    // Check if email not found
    if (otpResult.message.includes("couldn't find")) {
      return {
        message:
          "We couldn't find an account with that email. " +
          "Please check the email address or use your property code instead.",
        incidentCreated: false
      }
    }

    return {
      message: otpResult.message || "Failed to send verification code. Please try again.",
      incidentCreated: false
    }
  }

  // State is updated by sendOtpAction to awaiting_otp

  return {
    message:
      `A 6-digit verification code has been sent to ${messageText}. ` +
      `Please enter the code to continue.`,
    incidentCreated: false
  }
}

/**
 * Handle messages in the awaiting_otp state.
 * Verifies the OTP code and proceeds to incident description.
 */
async function handleAwaitingOtpState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext
): Promise<ConversationResponse> {
  // Check if user wants to cancel
  if (isNegative(messageText) || messageText.toLowerCase().includes("cancel")) {
    await resetConversationStateAction(phoneNumber)
    return {
      message:
        "Verification cancelled. You can start over anytime by describing your issue.",
      incidentCreated: false
    }
  }

  // Check for OTP format
  if (!isOtpCode(messageText)) {
    return {
      message:
        "Please enter the 6-digit verification code sent to your email. " +
        'Type "cancel" to start over.',
      incidentCreated: false
    }
  }

  // Verify OTP
  const verifyResult = await verifyOtpAction(phoneNumber, messageText)

  if (!verifyResult.isSuccess) {
    return {
      message:
        verifyResult.message ||
        "Invalid or expired code. Please try again or type 'cancel' to start over.",
      incidentCreated: false
    }
  }

  // OTP verified - state is updated by verifyOtpAction

  const tenantName = verifyResult.data?.tenantName || "there"
  const propertyName = verifyResult.data?.propertyName || "your property"

  // Check if we have a partial description from earlier
  if (context.partialDescription && context.partialDescription.length >= 10) {
    return await createIncidentFromState(phoneNumber, {
      tenantId: verifyResult.data?.tenantId,
      propertyId: verifyResult.data?.propertyId,
      propertyName: verifyResult.data?.propertyName,
      tenantName: verifyResult.data?.tenantName,
      partialDescription: context.partialDescription
    })
  }

  return {
    message:
      `Thanks ${tenantName}! Your phone is now verified and linked to your account. ` +
      `Please describe the issue at ${propertyName} in detail.`,
    incidentCreated: false
  }
}

/**
 * Handle messages in the awaiting_property state.
 * Validates the property code.
 */
async function handleAwaitingPropertyState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext
): Promise<ConversationResponse> {
  // Try to extract property code
  const propertyCode = extractPropertyCode(messageText)

  if (!propertyCode) {
    // Check if entire message is a property code format
    const upperText = messageText.toUpperCase().trim()
    if (upperText.match(/^PROP-[A-Z0-9]{6}$/)) {
      const validateResult = await validatePropertyCodeAction(upperText)
      if (validateResult.isSuccess && validateResult.data) {
        const property = validateResult.data

        await updateConversationStateAction(phoneNumber, {
          state: "awaiting_description",
          context: {
            ...context,
            propertyId: property.propertyId,
            propertyName: property.propertyName
          }
        })

        return {
          message:
            `Property ${property.propertyName} confirmed. ` +
            `Please describe your issue in detail.`,
          incidentCreated: false
        }
      }
    }

    return {
      message:
        "Please enter your property code in the format PROP-XXXXXX. " +
        "You can find this code in your welcome email or on the property notice board.",
      incidentCreated: false
    }
  }

  // Validate property code
  const propertyResult = await validatePropertyCodeAction(propertyCode)

  if (!propertyResult.isSuccess || !propertyResult.data) {
    return {
      message:
        `Invalid or expired property code "${propertyCode}". ` +
        `Please check the code and try again.`,
      incidentCreated: false
    }
  }

  const property = propertyResult.data

  await updateConversationStateAction(phoneNumber, {
    state: "awaiting_description",
    context: {
      ...context,
      propertyId: property.propertyId,
      propertyName: property.propertyName
    }
  })

  return {
    message:
      `Property ${property.propertyName} confirmed. ` +
      `Please describe your issue in detail.`,
    incidentCreated: false
  }
}

/**
 * Handle messages in the awaiting_description state.
 * Captures the incident description and creates the incident.
 */
async function handleAwaitingDescriptionState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext,
  attachments?: Array<{ url: string; type: string; fileName: string }>
): Promise<ConversationResponse> {
  // Check for help request
  if (isHelpRequest(messageText)) {
    return {
      message: getHelpMessage("awaiting_description", false),
      incidentCreated: false
    }
  }

  // Check for cancellation
  if (isNegative(messageText) || messageText.toLowerCase() === "cancel") {
    await resetConversationStateAction(phoneNumber)
    return {
      message:
        "Incident report cancelled. You can start a new report anytime by describing your issue.",
      incidentCreated: false
    }
  }

  // Validate description length
  if (messageText.length < 10) {
    return {
      message:
        "Please provide more details about the issue (at least 10 characters). " +
        "Include what's wrong, where it is, and any other relevant information.",
      incidentCreated: false
    }
  }

  // Update context with description
  await updateConversationStateAction(phoneNumber, {
    state: "awaiting_photos",
    context: {
      ...context,
      partialDescription: messageText,
      pendingAttachments: attachments || []
    }
  })

  // Ask for photos
  return {
    message:
      "Thank you for the description. Can you please attach a picture if you have one? " +
      "This will help us better understand the issue. You can send a photo now, or type 'skip' to continue without one.",
    incidentCreated: false
  }
}

/**
 * Handle messages in the awaiting_photos state.
 * Collects optional photos for the incident.
 */
async function handleAwaitingPhotosState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext,
  attachments?: Array<{ url: string; type: string; fileName: string }>
): Promise<ConversationResponse> {
  const lowerText = messageText.toLowerCase().trim()

  // Handle photo attachments
  if (attachments && attachments.length > 0) {
    const updatedAttachments = [
      ...(context.pendingAttachments || []),
      ...attachments
    ]

    // Create incident with photos
    return await createIncidentFromState(
      phoneNumber,
      {
        ...context,
        pendingAttachments: updatedAttachments
      },
      updatedAttachments
    )
  }

  // Check if user wants to skip photos or finish
  if (
    lowerText === "skip" ||
    lowerText === "no" ||
    lowerText === "done" ||
    lowerText.includes("no photo") ||
    lowerText === "finish"
  ) {
    // Create incident without photos
    return await createIncidentFromState(
      phoneNumber,
      context,
      context.pendingAttachments || []
    )
  }

  // Still waiting for photos
  return {
    message:
      'Please send a photo of the issue, or type "skip" to continue without one.',
    incidentCreated: false
  }
}

/**
 * Handle messages in the incident_active state.
 * Handles follow-up messages, attachments, and closure requests.
 */
async function handleIncidentActiveState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext,
  incidentId?: string,
  attachments?: Array<{ url: string; type: string; fileName: string }>
): Promise<ConversationResponse> {
  // Check for help request first
  if (isHelpRequest(messageText)) {
    const referenceNumber = incidentId ? generateReferenceNumber(incidentId) : undefined
    return {
      message: getHelpMessage("incident_active", true, referenceNumber),
      incidentCreated: false,
      incidentId
    }
  }

  // Check if incident is closed
  if (incidentId) {
    try {
      const [incident] = await db
        .select()
        .from(incidentsTable)
        .where(eq(incidentsTable.id, incidentId))
        .limit(1)

      if (incident && incident.status === "closed") {
        // Parse message for property code and description
        const parsed = await parseIncidentFromWhatsApp(messageText)
        const propertyCode = extractPropertyCode(messageText)
        
        // Try to identify tenant
        const tenantResult = await getTenantByPhoneAction(phoneNumber)
        let propertyName = ""
        let tenantName = ""
        
        if (tenantResult.isSuccess && tenantResult.data) {
          propertyName = tenantResult.data.propertyName || ""
          tenantName = tenantResult.data.name || ""
        } else if (propertyCode) {
          const propertyResult = await validatePropertyCodeAction(propertyCode)
          if (propertyResult.isSuccess && propertyResult.data) {
            propertyName = propertyResult.data.propertyName || ""
          }
        }
        
        // Build preview message
        const previewParts: string[] = []
        if (propertyName) previewParts.push(`Property: ${propertyName}`)
        if (parsed.description) {
          const descPreview = parsed.description.length > 50 
            ? parsed.description.substring(0, 50) + "..."
            : parsed.description
          previewParts.push(`Description: ${descPreview}`)
        }
        
        const preview = previewParts.length > 0 
          ? `I found: ${previewParts.join(", ")}. `
          : ""
        
        // Store message in context
        await updateConversationStateAction(phoneNumber, {
          state: "awaiting_new_incident_confirmation",
          context: {
            pendingMessageForNewIncident: messageText,
            propertyId: tenantResult.isSuccess && tenantResult.data ? tenantResult.data.propertyId : undefined,
            propertyName,
            tenantId: tenantResult.isSuccess && tenantResult.data ? tenantResult.data.id : undefined,
            tenantName,
            partialDescription: parsed.description,
            lastMessageAt: new Date().toISOString()
          } as ConversationContext
        })
        
        // Incident is closed - show list of open incidents
        const incidentsResult = await getOpenIncidentsByPhoneAction(phoneNumber)
        
        if (incidentsResult.isSuccess && incidentsResult.data && incidentsResult.data.length > 0) {
          const incidents = incidentsResult.data
          const incidentsList = incidents
            .map((inc, index) => {
              const ref = generateReferenceNumber(inc.id)
              return `${index + 1}. ${ref} - ${inc.title} (${inc.status})`
            })
            .join("\n")

          return {
            message:
              `The incident you were messaging about is now closed. ${preview}Create new incident? (yes/no)\n\n` +
              `Or attach to existing:\n${incidentsList}\n\n` +
              `Reply 'yes' for new, 'no' to attach to existing, or select a number.`,
            incidentCreated: false
          }
        } else {
          // No open incidents - ask to create new
          return {
            message:
              `The incident you were messaging about is now closed. ${preview}Create new incident? (yes/no)`,
            incidentCreated: false
          }
        }
      }
    } catch (error) {
      console.error(`[State Machine] Error checking incident status for ${incidentId}:`, error)
      // Continue with normal flow if check fails
    }
  }

  // Handle attachments if provided
  if (attachments && attachments.length > 0 && incidentId) {
    console.log(`[State Machine] Adding ${attachments.length} attachment(s) to existing incident ${incidentId}`)
    
    try {
      const { uploadIncidentAttachmentAction } = await import("@/actions/incidents-actions")
      
      // Add each attachment to the incident
      for (const attachment of attachments) {
        const result = await uploadIncidentAttachmentAction({
          incidentId,
          fileUrl: attachment.url,
          fileName: attachment.fileName || "attachment",
          fileType: attachment.type || "image"
        })
        
        if (!result.isSuccess) {
          console.error(`[State Machine] Failed to add attachment to incident ${incidentId}:`, result.message)
        } else {
          console.log(`[State Machine] Successfully added attachment ${attachment.fileName} to incident ${incidentId}`)
        }
      }
      
      const referenceNumber = generateReferenceNumber(incidentId)
      return {
        message:
          `Photo${attachments.length > 1 ? "s" : ""} added to ${referenceNumber}. ` +
          `Our team will review it${attachments.length > 1 ? "them" : ""} shortly.`,
        incidentCreated: false,
        incidentId
      }
    } catch (error) {
      console.error(`[State Machine] Error adding attachments to incident ${incidentId}:`, error)
      // Continue with normal message handling even if attachment upload fails
    }
  }

  // Note: Removed keyword-based closure detection (isClosureRequest)
  // Users are now explicitly asked if messages are updates or closures
  // when they select an existing incident

  // Check for explicit new incident request
  if (messageText.toLowerCase().includes("new issue") || messageText.toLowerCase().includes("new problem")) {
    await resetConversationStateAction(phoneNumber)
    return {
      message:
        "Starting a new incident report. Please describe the new issue, " +
        "including your property code if you have one.",
      incidentCreated: false
    }
  }

  // Get current incident details and all open incidents for AI classification
  let currentIncident: { id: string; title: string; description: string; reportedAt: Date } | null = null
  if (incidentId) {
    try {
      const [incident] = await db
        .select()
        .from(incidentsTable)
        .where(eq(incidentsTable.id, incidentId))
        .limit(1)
      
      if (incident) {
        currentIncident = {
          id: incident.id,
          title: incident.title,
          description: incident.description,
          reportedAt: incident.reportedAt
        }
      }
    } catch (error) {
      console.error(`[State Machine] Error fetching current incident:`, error)
    }
  }

  // Get all open incidents for this phone number
  const incidentsResult = await getOpenIncidentsByPhoneAction(phoneNumber)
  const openIncidents = incidentsResult.isSuccess && incidentsResult.data 
    ? incidentsResult.data.map(inc => ({
        id: inc.id,
        title: inc.title,
        description: inc.description,
        reportedAt: inc.reportedAt
      }))
    : []

  // Use AI to classify if this is a new incident or follow-up
  const classificationResult = await classifyMessageIntent(messageText, openIncidents)
  
  if (classificationResult.isSuccess && classificationResult.data) {
    const classification = classificationResult.data
    
    // If AI suggests it's a new incident (even with active incident), ask for confirmation
    if (classification.suggestedAction === "create_new" || 
        (classification.intent === "new_incident" && classification.confidence >= 0.6)) {
      // Store message and transition to confirmation
      await updateConversationStateAction(phoneNumber, {
        state: "awaiting_new_incident_confirmation",
        context: {
          pendingMessageForNewIncident: messageText,
          lastMessageAt: new Date().toISOString()
        } as ConversationContext
      })

      const referenceNumber = incidentId ? generateReferenceNumber(incidentId) : "your incident"
      return {
        message:
          `This looks like a new incident, but you're currently messaging about ${referenceNumber}. ` +
          `Are you logging a new incident? Reply 'yes' for new, 'no' to attach to existing, or 'help' for options.`,
        incidentCreated: false,
        incidentId
      }
    }
    
    // If AI suggests it's a follow-up with high confidence, still ask for confirmation
    if (classification.suggestedAction === "attach_to_existing" && classification.confidence >= 0.7) {
      // Show list of incidents and ask which one
      if (openIncidents.length > 1) {
        const incidentsList = openIncidents
          .map((incident, index) => {
            const ref = generateReferenceNumber(incident.id)
            return `${index + 1}. ${ref} - ${incident.title}`
          })
          .join("\n")

        await updateConversationStateAction(phoneNumber, {
          state: "awaiting_incident_selection",
          context: {
            pendingMessageForFollowUp: messageText,
            lastMessageAt: new Date().toISOString()
          } as ConversationContext
        })

        return {
          message:
            `Which incident should this be attached to?\n\n${incidentsList}\n\n` +
            `Reply with the number, or 'new' to create a new incident, or 'cancel' to exit.`,
          incidentCreated: false,
          incidentId
        }
      } else if (openIncidents.length === 1 && incidentId === openIncidents[0].id) {
        // Only one open incident and it's the current one - ask for confirmation
        const referenceNumber = generateReferenceNumber(incidentId)
        await updateConversationStateAction(phoneNumber, {
          state: "awaiting_follow_up_confirmation",
          context: {
            pendingMessageForFollowUp: messageText,
            lastMessageAt: new Date().toISOString()
          } as ConversationContext
        })

        return {
          message:
            `Add this message to ${referenceNumber}? Reply 'yes' to confirm, 'no' to create a new incident, or 'help' for options.`,
          incidentCreated: false,
          incidentId
        }
      }
    }
  }

  // Default: Always ask for confirmation if unclear
  const referenceNumber = incidentId ? generateReferenceNumber(incidentId) : "your incident"
  
  if (openIncidents.length > 1) {
    const incidentsList = openIncidents
      .map((incident, index) => {
        const ref = generateReferenceNumber(incident.id)
        return `${index + 1}. ${ref} - ${incident.title}`
      })
      .join("\n")

    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_incident_selection",
      context: {
        pendingMessageForFollowUp: messageText,
        lastMessageAt: new Date().toISOString()
      } as ConversationContext
    })

    return {
      message:
        `Which incident should this be attached to?\n\n${incidentsList}\n\n` +
        `Reply with the number, or 'new' to create a new incident, or 'cancel' to exit.`,
      incidentCreated: false,
      incidentId
    }
  } else {
    // Ask for confirmation
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_follow_up_confirmation",
      context: {
        pendingMessageForFollowUp: messageText,
        lastMessageAt: new Date().toISOString()
      } as ConversationContext
    })

    return {
      message:
        `Add this message to ${referenceNumber}? Reply 'yes' to confirm, 'no' to create a new incident, or 'help' for options.`,
      incidentCreated: false,
      incidentId
    }
  }
}

/**
 * Handle messages in the awaiting_closure_confirmation state.
 * Confirms or cancels incident closure.
 */
async function handleAwaitingClosureState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext,
  incidentId?: string
): Promise<ConversationResponse> {
  // Check for help request
  if (isHelpRequest(messageText)) {
    return {
      message: getHelpMessage("awaiting_closure_confirmation", false),
      incidentCreated: false,
      incidentId
    }
  }

  if (isAffirmative(messageText)) {
    // Close the incident
    if (incidentId) {
      const closeResult = await closeIncidentFromWhatsAppAction(incidentId, phoneNumber)
      if (!closeResult.isSuccess) {
        return {
          message: "Sorry, there was a problem closing your incident. Please try again.",
          incidentCreated: false,
          incidentId
        }
      }
    }

    await resetConversationStateAction(phoneNumber)

    const referenceNumber = incidentId ? generateReferenceNumber(incidentId) : "Your incident"

    return {
      message:
        `${referenceNumber} has been marked as resolved. ` +
        `Thank you for letting us know! You can report a new issue anytime.`,
      incidentCreated: false,
      incidentId
    }
  }

  if (isNegative(messageText)) {
    // Keep incident open
    await updateConversationStateAction(phoneNumber, {
      state: "incident_active",
      context
    })

    return {
      message:
        "Okay, the incident will remain open. " +
        "Feel free to add more details or photos by replying to this conversation.",
      incidentCreated: false,
      incidentId
    }
  }

  return {
    message:
      'Please reply "yes" to close the incident or "no" to keep it open.',
    incidentCreated: false,
    incidentId
  }
}

/**
 * Handle messages in the awaiting_incident_selection state.
 * Shows list of open incidents and handles user selection.
 */
async function handleAwaitingIncidentSelectionState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext
): Promise<ConversationResponse> {
  // Check for help request
  if (isHelpRequest(messageText)) {
    const incidentsResult = await getOpenIncidentsByPhoneAction(phoneNumber)
    const hasOpenIncidents =
      incidentsResult.isSuccess &&
      incidentsResult.data &&
      incidentsResult.data.length > 0
    return {
      message: getHelpMessage("awaiting_incident_selection", hasOpenIncidents),
      incidentCreated: false
    }
  }

  const lowerText = messageText.toLowerCase().trim()

  // Check for cancellation
  if (isNegative(messageText) || lowerText === "cancel") {
    await resetConversationStateAction(phoneNumber)
    return {
      message:
        "Selection cancelled. You can start a new incident report anytime by describing your issue.",
      incidentCreated: false
    }
  }

  // Check if user wants to create new incident
  if (lowerText === "new" || lowerText === "create new" || lowerText.includes("new incident")) {
    // Reset state and start new incident flow
    await resetConversationStateAction(phoneNumber)
    
    // Try to identify tenant by phone number
    const tenantResult = await getTenantByPhoneAction(phoneNumber)
    
    if (tenantResult.isSuccess && tenantResult.data) {
      // Tenant identified - go to description
      const tenant = tenantResult.data
      await updateConversationStateAction(phoneNumber, {
        state: "awaiting_description",
        context: {
          tenantId: tenant.id,
          propertyId: tenant.propertyId,
          propertyName: tenant.propertyName,
          tenantName: tenant.name
        }
      })
      
      return {
        message:
          `Starting new incident report for ${tenant.propertyName || "your property"}. ` +
          `Please describe the issue in detail.`,
        incidentCreated: false
      }
    } else {
      // No tenant - go to property code
      await updateConversationStateAction(phoneNumber, {
        state: "awaiting_property",
        context: {}
      })
      
      return {
        message:
          "Starting new incident report. Please enter your property code (e.g., PROP-ABC123).",
        incidentCreated: false
      }
    }
  }

  // Try to parse as number (incident selection)
  const selectedNumber = parseInt(lowerText, 10)
  
  if (!isNaN(selectedNumber) && selectedNumber > 0) {
    // Get open incidents
    const incidentsResult = await getOpenIncidentsByPhoneAction(phoneNumber)
    
    if (!incidentsResult.isSuccess || !incidentsResult.data || incidentsResult.data.length === 0) {
      return {
        message:
          "No open incidents found. Type 'new' to create a new incident or 'cancel' to exit.",
        incidentCreated: false
      }
    }

    const incidents = incidentsResult.data
    
    if (selectedNumber > incidents.length) {
      return {
        message:
          `Invalid selection. Please choose a number between 1 and ${incidents.length}, ` +
          `type 'new' to create a new incident, or 'cancel' to exit.`,
        incidentCreated: false
      }
    }

    // Get selected incident
    const selectedIncident = incidents[selectedNumber - 1]
    const referenceNumber = generateReferenceNumber(selectedIncident.id)

    // Link the pending message to this incident if we have one
    if (context.pendingMessageId) {
      await linkMessageToIncidentAction(
        context.pendingMessageId,
        selectedIncident.id,
        "follow_up"
      )
    }

    // Transition to asking if this is an update or closure
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_update_or_closure",
      incidentId: selectedIncident.id,
      context: {
        ...context,
        selectedIncidentId: selectedIncident.id,
        availableIncidents: undefined,
        pendingMessageForFollowUp: undefined
      }
    })

    return {
      message:
        `Got it, this is about ${referenceNumber} (${selectedIncident.title}).\n\n` +
        `Is this issue now resolved, or is this an update?\n` +
        `Reply 'resolved' or 'update'.`,
      incidentCreated: false,
      incidentId: selectedIncident.id,
      referenceNumber
    }
  }

  // If we reach here, user input is invalid
  // Get open incidents to show list again
  const incidentsResult = await getOpenIncidentsByPhoneAction(phoneNumber)
  
  if (!incidentsResult.isSuccess || !incidentsResult.data || incidentsResult.data.length === 0) {
    return {
      message:
        "No open incidents found. Type 'new' to create a new incident or 'cancel' to exit.",
      incidentCreated: false
    }
  }

  const incidents = incidentsResult.data
  const incidentsList = incidents
    .map((incident, index) => {
      const ref = generateReferenceNumber(incident.id)
      return `${index + 1}. ${ref} - ${incident.title} (${incident.status})`
    })
    .join("\n")

  return {
    message:
      `Please select an incident by number, or type 'new' to create a new one:\n\n${incidentsList}\n\n` +
      `Reply with the number (1-${incidents.length}), 'new', or 'cancel'.`,
    incidentCreated: false
  }
}

/**
 * Handle messages in the awaiting_new_incident_confirmation state.
 * Handles yes/no responses for creating a new incident.
 */
async function handleAwaitingNewIncidentConfirmationState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext
): Promise<ConversationResponse> {
  // Check for help request
  if (isHelpRequest(messageText)) {
    return {
      message: getHelpMessage("awaiting_new_incident_confirmation", false),
      incidentCreated: false
    }
  }

  const lowerText = messageText.toLowerCase().trim()

  if (isAffirmative(messageText)) {
    // User wants to create new incident - parse stored message
    const storedMessage = context.pendingMessageForNewIncident || messageText
    
    // Try to identify tenant by phone number
    const tenantResult = await getTenantByPhoneAction(phoneNumber)
    
    if (tenantResult.isSuccess && tenantResult.data) {
      // Tenant identified - parse message and create incident
      const tenant = tenantResult.data
      const parsed = await parseIncidentFromWhatsApp(storedMessage)
      
      await updateConversationStateAction(phoneNumber, {
        state: "awaiting_description",
        context: {
          tenantId: tenant.id,
          propertyId: tenant.propertyId,
          propertyName: tenant.propertyName,
          tenantName: tenant.name,
          partialDescription: parsed.description || storedMessage
        }
      })
      
      // If we have enough description, create incident directly
      if (parsed.description && parsed.description.length >= 10) {
        return await createIncidentFromState(phoneNumber, {
          tenantId: tenant.id,
          propertyId: tenant.propertyId,
          propertyName: tenant.propertyName,
          tenantName: tenant.name,
          partialDescription: parsed.description
        })
      }
      
      return {
        message:
          `Hi ${tenant.name}! Creating new incident for ${tenant.propertyName || "your property"}. ` +
          `Please describe the issue in detail.`,
        incidentCreated: false
      }
    }
    
    // No tenant identified - check for property code
    const propertyCode = extractPropertyCode(storedMessage)
    
    if (propertyCode) {
      const propertyResult = await validatePropertyCodeAction(propertyCode)
      
      if (propertyResult.isSuccess && propertyResult.data) {
        const property = propertyResult.data
        const parsed = await parseIncidentFromWhatsApp(storedMessage)
        
        await updateConversationStateAction(phoneNumber, {
          state: "awaiting_description",
          context: {
            propertyId: property.propertyId,
            propertyName: property.propertyName,
            partialDescription: parsed.description || storedMessage
          }
        })
        
        if (parsed.description && parsed.description.length >= 10) {
          return await createIncidentFromState(phoneNumber, {
            propertyId: property.propertyId,
            propertyName: property.propertyName,
            partialDescription: parsed.description
          })
        }
        
        return {
          message:
            `Property ${property.propertyName} confirmed. ` +
            `Please describe your issue in detail.`,
          incidentCreated: false
        }
      }
    }
    
    // No tenant or property code - start property code flow
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_property",
      context: {
        partialDescription: storedMessage
      }
    })
    
    return {
      message:
        "Please enter your property code (e.g., PROP-ABC123) to create the incident.",
      incidentCreated: false
    }
  }
  
  if (isNegative(messageText)) {
    // User doesn't want new incident - transition to follow-up confirmation
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_follow_up_confirmation",
      context: {
        ...context,
        pendingMessageForFollowUp: context.pendingMessageForNewIncident || messageText
      } as ConversationContext
    })
    
    return {
      message:
        "Are you attaching this to an existing incident? Reply 'yes' to see your open incidents, or 'no' to cancel.",
      incidentCreated: false
    }
  }
  
  // Invalid input - show question again
  return {
    message:
      "Are you logging a new incident? Reply 'yes' for new, 'no' to attach to existing, or 'help' for options.",
    incidentCreated: false
  }
}

/**
 * Handle messages in the awaiting_follow_up_confirmation state.
 * Handles yes/no responses for attaching to existing incidents.
 */
async function handleAwaitingFollowUpConfirmationState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext
): Promise<ConversationResponse> {
  // Check for help request
  if (isHelpRequest(messageText)) {
    return {
      message: getHelpMessage("awaiting_follow_up_confirmation", false),
      incidentCreated: false
    }
  }

  const lowerText = messageText.toLowerCase().trim()

  if (isAffirmative(messageText)) {
    // User confirmed - need to determine which incident to attach to
    const incidentsResult = await getOpenIncidentsByPhoneAction(phoneNumber)
    
    if (incidentsResult.isSuccess && incidentsResult.data && incidentsResult.data.length > 0) {
      const incidents = incidentsResult.data
      
      // If there's only one incident, attach to it directly
      if (incidents.length === 1) {
        const incident = incidents[0]
        const storedMessage = context.pendingMessageForFollowUp || messageText
        
        // Update incident's updatedAt to include this message in the time window
        await db
          .update(incidentsTable)
          .set({ updatedAt: new Date() })
          .where(eq(incidentsTable.id, incident.id))
        
        // Transition to incident_active state
        await updateConversationStateAction(phoneNumber, {
          state: "incident_active",
          incidentId: incident.id,
          context: {
            propertyId: incident.propertyId,
            tenantId: incident.tenantId || undefined,
            pendingMessageForFollowUp: undefined
          }
        })
        
        const referenceNumber = generateReferenceNumber(incident.id)
        return {
          message:
            `Message added to ${referenceNumber}. Our team will review it shortly. ` +
            `Type "close" when the issue is resolved, or "new issue" to report something else.`,
          incidentCreated: false,
          incidentId: incident.id
        }
      }
      
      // Multiple incidents - show list for selection
      const incidentsList = incidents
        .map((incident, index) => {
          const ref = generateReferenceNumber(incident.id)
          return `${index + 1}. ${ref} - ${incident.title} (${incident.status})`
        })
        .join("\n")

      // Transition to selection state
      await updateConversationStateAction(phoneNumber, {
        state: "awaiting_incident_selection",
        context: {
          ...context,
          pendingMessageForFollowUp: context.pendingMessageForFollowUp || messageText
        } as ConversationContext
      })

      return {
        message:
          `Which incident should this be attached to? Reply with the number, or 'new' to create new, or 'cancel'.\n\n${incidentsList}`,
        incidentCreated: false
      }
    } else {
      // No open incidents - ask if they want to create new
      await updateConversationStateAction(phoneNumber, {
        state: "awaiting_new_incident_confirmation",
        context: {
          ...context,
          pendingMessageForNewIncident: context.pendingMessageForFollowUp || messageText
        } as ConversationContext
      })
      
      return {
        message:
          "You don't have open incidents. Should I create a new one? (yes/no)",
        incidentCreated: false
      }
    }
  }
  
  if (isNegative(messageText)) {
    // User doesn't want to attach - offer to create new
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_new_incident_confirmation",
      context: {
        ...context,
        pendingMessageForNewIncident: context.pendingMessageForFollowUp || messageText
      } as ConversationContext
    })
    
    return {
      message:
        "Should I create a new incident? Reply 'yes' for new, or 'cancel' to exit.",
      incidentCreated: false
    }
  }
  
  // Invalid input
  return {
    message:
      "Are you attaching this to an existing incident? Reply 'yes' to see your open incidents, or 'no' to cancel.",
    incidentCreated: false
  }
}

/**
 * Handle messages in the awaiting_update_or_closure state.
 * User is confirming if their message is an update or indicates resolution.
 */
async function handleAwaitingUpdateOrClosureState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext,
  incidentId?: string
): Promise<ConversationResponse> {
  const lowerText = messageText.toLowerCase().trim()

  // Check for resolution confirmation
  const resolutionKeywords = ["resolved", "fixed", "done", "yes", "close", "closed"]
  if (resolutionKeywords.includes(lowerText)) {
    // Close the incident
    if (incidentId) {
      const closeResult = await closeIncidentFromWhatsAppAction(incidentId, phoneNumber)
      if (!closeResult.isSuccess) {
        return {
          message: "Sorry, there was a problem closing the incident. Please try again.",
          incidentCreated: false,
          incidentId
        }
      }
    }

    await resetConversationStateAction(phoneNumber)

    const referenceNumber = incidentId ? generateReferenceNumber(incidentId) : "Your incident"

    return {
      message:
        `${referenceNumber} has been marked as resolved.\n\n` +
        `Thank you for letting us know! You can report a new issue anytime.`,
      incidentCreated: false,
      incidentId
    }
  }

  // Check for update confirmation
  const updateKeywords = ["update", "no", "not resolved", "still", "more"]
  if (updateKeywords.some(kw => lowerText.includes(kw))) {
    // Keep incident active
    await updateConversationStateAction(phoneNumber, {
      state: "incident_active",
      incidentId,
      context: {
        ...context,
        selectedIncidentId: undefined
      }
    })

    const referenceNumber = incidentId ? generateReferenceNumber(incidentId) : "the incident"

    return {
      message:
        `Your message has been added to ${referenceNumber}.\n\n` +
        `Our team will review it. You can send more updates or photos anytime.`,
      incidentCreated: false,
      incidentId
    }
  }

  // Unclear response - ask again
  return {
    message:
      `Is this issue now resolved, or is this an update?\n\n` +
      `Reply 'resolved' if the issue is fixed, or 'update' if you're adding more information.`,
    incidentCreated: false,
    incidentId
  }
}

// -----------------------------------------------------------------------------
// Incident Creation Helper
// -----------------------------------------------------------------------------

/**
 * Create an incident from the collected conversation context.
 * This is called when we have enough information to submit the incident.
 *
 * @param phoneNumber - The submitter's phone number
 * @param context - The accumulated conversation context
 * @param attachments - Optional media attachments
 * @returns ConversationResponse with creation result
 */
async function createIncidentFromState(
  phoneNumber: string,
  context: ConversationContext,
  attachments?: Array<{ url: string; type: string; fileName: string }>
): Promise<ConversationResponse> {
  // Validate required fields
  if (!context.propertyId) {
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_property",
      context
    })

    return {
      message:
        "I need to know which property this is for. " +
        "Please enter your property code (e.g., PROP-ABC123).",
      incidentCreated: false
    }
  }

  if (!context.partialDescription || context.partialDescription.length < 10) {
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_description",
      context
    })

    return {
      message:
        "Please provide more details about the issue (at least 10 characters).",
      incidentCreated: false
    }
  }

  try {
    console.log(`[State Machine] Creating incident with ${attachments?.length || 0} attachment(s)`)
    if (attachments && attachments.length > 0) {
      console.log(`[State Machine] Attachment URLs:`, attachments.map(att => att.url))
    }
    
    // Create the incident using the server action
    const result = await createIncidentFromConversationAction({
      propertyId: context.propertyId,
      tenantId: context.tenantId,
      tenantName: context.tenantName,
      description: context.partialDescription,
      phoneNumber,
      attachments
    })

    if (!result.isSuccess || !result.data) {
      return {
        message:
          result.message ||
          "Sorry, we couldn't create your incident report. Please try again.",
        incidentCreated: false
      }
    }

    const incident = result.data
    const referenceNumber = incident.referenceNumber

    // Update state to incident_active
    await updateConversationStateAction(phoneNumber, {
      state: "incident_active",
      incidentId: incident.incidentId,
      context: {
        ...context,
        pendingAttachments: undefined // Clear attachments after creation
      }
    })

    const propertyName = context.propertyName || "your property"
    const photoPrompt =
      attachments && attachments.length > 0
        ? ""
        : "\n\nYou can send photos by replying to this conversation."

    return {
      message:
        `Incident reported successfully!\n\n` +
        `Reference: ${referenceNumber}\n` +
        `Property: ${propertyName}\n\n` +
        `Our team has been notified and will respond as soon as possible. ` +
        `You can add more details by replying to this conversation. ` +
        `Type "close" when the issue is resolved.${photoPrompt}`,
      incidentCreated: true,
      incidentId: incident.incidentId,
      referenceNumber
    }
  } catch (error) {
    console.error("Error creating incident from state:", error)
    return {
      message:
        "Sorry, an error occurred while creating your incident report. " +
        "Please try again or contact support.",
      incidentCreated: false
    }
  }
}
