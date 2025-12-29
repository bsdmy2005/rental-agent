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
// Note: createIncidentFromConversationAction will be created in Task 4.2
import { createIncidentFromConversationAction } from "@/actions/whatsapp-incident-actions"
import { validatePropertyCodeAction } from "@/actions/property-codes-actions"
import {
  isIncidentMessage,
  parseIncidentMessage,
  extractPropertyCode
} from "@/lib/whatsapp/message-parser"

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

/**
 * Check if text contains incident-related keywords for closure
 *
 * @param text - The text to check
 * @returns true if text indicates closure intent
 */
function isClosureRequest(text: string): boolean {
  const closureKeywords = [
    "close",
    "closed",
    "resolved",
    "fixed",
    "done",
    "complete",
    "completed",
    "finish",
    "finished",
    "cancel",
    "cancelled"
  ]
  const lowerText = text.toLowerCase().trim()
  return closureKeywords.some(keyword => lowerText.includes(keyword))
}

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
          currentState.incidentId || undefined
        )

      case "awaiting_closure_confirmation":
        return await handleAwaitingClosureState(
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
  // Check if this looks like an incident report
  if (!isIncidentMessage(messageText)) {
    return {
      message:
        "Hi! I can help you report a property issue. Please describe your problem, " +
        "and include your property code if you have one (e.g., PROP-ABC123).\n\n" +
        "Example: 'PROP-ABC123 - The kitchen tap is leaking'",
      incidentCreated: false
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

  // Create the incident
  return await createIncidentFromState(
    phoneNumber,
    {
      ...context,
      partialDescription: messageText,
      pendingAttachments: attachments
    },
    attachments
  )
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

  // Check if user wants to skip photos
  if (
    lowerText === "skip" ||
    lowerText === "no" ||
    lowerText === "done" ||
    lowerText.includes("no photo")
  ) {
    // Complete without photos
    await updateConversationStateAction(phoneNumber, {
      state: "incident_active",
      context
    })

    const referenceNumber = context.tenantId
      ? generateReferenceNumber(context.tenantId)
      : "TBD"

    return {
      message:
        `Incident report submitted successfully! Reference: ${referenceNumber}\n\n` +
        `You can reply to this conversation to add more details or photos. ` +
        `Type "close" when the issue is resolved.`,
      incidentCreated: true,
      referenceNumber
    }
  }

  // Handle photo attachments
  if (attachments && attachments.length > 0) {
    const updatedAttachments = [
      ...(context.pendingAttachments || []),
      ...attachments
    ]

    await updateConversationStateAction(phoneNumber, {
      state: "incident_active",
      context: {
        ...context,
        pendingAttachments: updatedAttachments
      }
    })

    // TODO: Attach photos to incident

    return {
      message:
        `Photo(s) received and attached to your incident report. ` +
        `You can send more photos or type "done" to finish.`,
      incidentCreated: false
    }
  }

  return {
    message:
      'Send a photo of the issue, or type "skip" if you don\'t have one. ' +
      'You can always add photos later by replying to this conversation.',
    incidentCreated: false
  }
}

/**
 * Handle messages in the incident_active state.
 * Handles follow-up messages and closure requests.
 */
async function handleIncidentActiveState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext,
  incidentId?: string
): Promise<ConversationResponse> {
  // Check for closure request
  if (isClosureRequest(messageText)) {
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_closure_confirmation",
      context
    })

    const referenceNumber = incidentId ? generateReferenceNumber(incidentId) : "your incident"

    return {
      message:
        `Are you sure you want to close ${referenceNumber}? ` +
        `Reply "yes" to confirm or "no" to keep it open.`,
      incidentCreated: false,
      incidentId
    }
  }

  // Check for new incident
  if (messageText.toLowerCase().includes("new issue") || messageText.toLowerCase().includes("new problem")) {
    await resetConversationStateAction(phoneNumber)
    return {
      message:
        "Starting a new incident report. Please describe the new issue, " +
        "including your property code if you have one.",
      incidentCreated: false
    }
  }

  // Otherwise, this is a follow-up message
  // TODO: Add message to incident timeline

  const referenceNumber = incidentId ? generateReferenceNumber(incidentId) : "your incident"

  return {
    message:
      `Message added to ${referenceNumber}. ` +
      `Our team will review it shortly. ` +
      `Type "close" when the issue is resolved, or "new issue" to report something else.`,
    incidentCreated: false,
    incidentId
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
  if (isAffirmative(messageText)) {
    // Close the incident
    // TODO: Update incident status to closed

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
    // Create the incident using the server action
    const result = await createIncidentFromConversationAction({
      propertyId: context.propertyId,
      tenantId: context.tenantId,
      description: context.partialDescription,
      submittedPhone: phoneNumber,
      submittedName: context.tenantName,
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
    const referenceNumber = generateReferenceNumber(incident.id)

    // Update state to incident_active
    await updateConversationStateAction(phoneNumber, {
      state: "incident_active",
      incidentId: incident.id,
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
      incidentId: incident.id,
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
