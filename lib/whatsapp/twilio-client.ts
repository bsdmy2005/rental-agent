import twilio from "twilio"
import { validateRequest } from "twilio"

/**
 * Initialize Twilio client
 */
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN")
  }

  return twilio(accountSid, authToken)
}

/**
 * Get WhatsApp number from environment
 */
function getWhatsAppNumber(): string {
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER
  if (!whatsappNumber) {
    throw new Error("TWILIO_WHATSAPP_NUMBER not configured")
  }
  return whatsappNumber
}

/**
 * Format phone number to E.164 format for WhatsApp
 * Ensures number starts with whatsapp: prefix
 */
export function formatWhatsAppNumber(phoneNumber: string): string {
  // Remove any existing whatsapp: prefix
  let cleaned = phoneNumber.replace(/^whatsapp:/i, "")

  // Remove spaces, dashes, parentheses
  cleaned = cleaned.replace(/[\s\-()]/g, "")

  // If doesn't start with +, assume it needs country code
  // For South Africa, add +27 if missing
  if (!cleaned.startsWith("+")) {
    // If starts with 0, replace with +27
    if (cleaned.startsWith("0")) {
      cleaned = "+27" + cleaned.substring(1)
    } else {
      // Assume it's a local number without country code, add +27
      cleaned = "+27" + cleaned
    }
  }

  return `whatsapp:${cleaned}`
}

/**
 * Send a WhatsApp text message
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ messageId: string; success: boolean }> {
  try {
    const client = getTwilioClient()
    const from = getWhatsAppNumber()
    const formattedTo = formatWhatsAppNumber(to)

    const twilioMessage = await client.messages.create({
      from,
      to: formattedTo,
      body: message
    })

    return {
      messageId: twilioMessage.sid,
      success: true
    }
  } catch (error) {
    console.error("Error sending WhatsApp message:", error)
    throw error
  }
}

/**
 * Send a WhatsApp message with media (image)
 * Note: Twilio requires media URLs to be publicly accessible
 */
export async function sendWhatsAppMessageWithMedia(
  to: string,
  message: string,
  mediaUrl: string
): Promise<{ messageId: string; success: boolean }> {
  try {
    const client = getTwilioClient()
    const from = getWhatsAppNumber()
    const formattedTo = formatWhatsAppNumber(to)

    // Send text message first if message is provided
    let textMessageId: string | undefined
    if (message) {
      const textMsg = await client.messages.create({
        from,
        to: formattedTo,
        body: message
      })
      textMessageId = textMsg.sid
    }

    // Send media message
    const mediaMsg = await client.messages.create({
      from,
      to: formattedTo,
      mediaUrl: [mediaUrl]
    })

    return {
      messageId: mediaMsg.sid || textMessageId || "",
      success: true
    }
  } catch (error) {
    console.error("Error sending WhatsApp message with media:", error)
    throw error
  }
}

/**
 * Send multiple WhatsApp messages (for multiple images)
 * First message is text, subsequent messages are images
 */
export async function sendWhatsAppMessagesWithMultipleMedia(
  to: string,
  textMessage: string,
  mediaUrls: string[]
): Promise<{ messageIds: string[]; success: boolean }> {
  try {
    const client = getTwilioClient()
    const from = getWhatsAppNumber()
    const formattedTo = formatWhatsAppNumber(to)

    const messageIds: string[] = []

    // Send text message first
    const textMsg = await client.messages.create({
      from,
      to: formattedTo,
      body: textMessage
    })
    messageIds.push(textMsg.sid)

    // Send each image as a separate message
    for (const mediaUrl of mediaUrls) {
      const mediaMsg = await client.messages.create({
        from,
        to: formattedTo,
        mediaUrl: [mediaUrl]
      })
      messageIds.push(mediaMsg.sid)
    }

    return {
      messageIds,
      success: true
    }
  } catch (error) {
    console.error("Error sending WhatsApp messages with media:", error)
    throw error
  }
}

/**
 * Validate Twilio webhook signature
 */
export function validateTwilioWebhook(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    console.warn("TWILIO_AUTH_TOKEN not set, skipping webhook validation")
    return true // In development, allow without validation
  }

  try {
    return validateRequest(authToken, signature, url, params)
  } catch (error) {
    console.error("Error validating Twilio webhook signature:", error)
    return false
  }
}

/**
 * Parse Twilio webhook payload
 */
export interface TwilioWebhookPayload {
  MessageSid: string
  AccountSid: string
  From: string // whatsapp:+27123456789
  To: string // whatsapp:+14155238886
  Body: string
  NumMedia: string // "0" or "1", etc.
  MediaUrl0?: string
  MediaContentType0?: string
  MessageStatus?: string
}

export function parseTwilioWebhook(formData: FormData): TwilioWebhookPayload | null {
  try {
    const payload: Partial<TwilioWebhookPayload> = {}

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        ;(payload as any)[key] = value
      }
    }

    // Ensure required fields are present
    if (!payload.MessageSid || !payload.From || !payload.To || payload.Body === undefined) {
      return null
    }

    return payload as TwilioWebhookPayload
  } catch (error) {
    console.error("Error parsing Twilio webhook:", error)
    return null
  }
}

