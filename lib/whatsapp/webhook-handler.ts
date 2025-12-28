/**
 * WhatsApp Webhook Handler Utilities
 * 
 * Foundation for future WhatsApp integration.
 * These utilities will be used to process incoming WhatsApp messages
 * and create incidents from them.
 */

export interface WhatsAppMessage {
  from: string // Phone number
  to: string // Business phone number
  messageId: string
  timestamp: string
  type: "text" | "image" | "location" | "document" | "audio" | "video"
  text?: string
  mediaUrl?: string
  location?: {
    latitude: number
    longitude: number
  }
}

export interface WhatsAppWebhookPayload {
  messages?: WhatsAppMessage[]
  contacts?: Array<{
    profile: {
      name: string
    }
    wa_id: string
  }>
}

/**
 * Parse incoming WhatsApp webhook payload from Twilio
 */
export function parseTwilioWebhookToWhatsAppMessage(
  payload: {
    MessageSid: string
    From: string
    To: string
    Body: string
    NumMedia?: string
    MediaUrl0?: string
    MediaContentType0?: string
  }
): WhatsAppMessage {
  const numMedia = parseInt(payload.NumMedia || "0", 10)
  let type: "text" | "image" | "location" | "document" | "audio" | "video" = "text"
  let mediaUrl: string | undefined

  if (numMedia > 0 && payload.MediaUrl0) {
    const contentType = payload.MediaContentType0 || ""
    if (contentType.startsWith("image/")) {
      type = "image"
    } else if (contentType.startsWith("video/")) {
      type = "video"
    } else if (contentType.startsWith("audio/")) {
      type = "audio"
    } else {
      type = "document"
    }
    mediaUrl = payload.MediaUrl0
  }

  // Extract phone number from whatsapp:+27123456789 format
  const from = payload.From.replace(/^whatsapp:/i, "")
  const to = payload.To.replace(/^whatsapp:/i, "")

  return {
    from,
    to,
    messageId: payload.MessageSid,
    timestamp: new Date().toISOString(),
    type,
    text: payload.Body || undefined,
    mediaUrl
  }
}

/**
 * Parse incoming WhatsApp webhook payload
 * Adapt this based on your WhatsApp provider's payload format
 */
export function parseWhatsAppWebhook(payload: unknown): WhatsAppMessage[] {
  // For Twilio, we handle it separately in the route handler
  // This function is kept for backward compatibility
  const messages: WhatsAppMessage[] = []
  
  // Example parsing for other providers (Facebook/Meta):
  // if (payload.entry?.[0]?.changes?.[0]?.value?.messages) {
  //   for (const msg of payload.entry[0].changes[0].value.messages) {
  //     messages.push({
  //       from: msg.from,
  //       to: msg.to,
  //       messageId: msg.id,
  //       timestamp: msg.timestamp,
  //       type: msg.type,
  //       text: msg.text?.body,
  //       mediaUrl: msg.image?.url || msg.document?.url,
  //       location: msg.location ? {
  //         latitude: msg.location.latitude,
  //         longitude: msg.location.longitude
  //       } : undefined
  //     })
  //   }
  // }
  
  return messages
}

/**
 * Extract property identifier from WhatsApp message
 * Looks for property code or phone number in message text
 */
export function extractPropertyIdentifier(message: WhatsAppMessage): {
  method: "code" | "phone"
  value: string
} | null {
  if (!message.text) return null

  // Try to find property code (format: PROP-XXXXXX)
  const codeMatch = message.text.match(/PROP-[\w]{6}/i)
  if (codeMatch) {
    return {
      method: "code",
      value: codeMatch[0].toUpperCase()
    }
  }

  // If no code found, use sender's phone number
  return {
    method: "phone",
    value: message.from
  }
}

/**
 * Format incident details from WhatsApp message
 */
export function formatIncidentFromMessage(
  message: WhatsAppMessage,
  propertyId: string,
  propertyName: string
): {
  propertyId: string
  title: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
  submittedPhone: string
  submittedName?: string
} {
  // Extract title (first line or first 50 chars)
  const lines = message.text?.split("\n") || []
  const title = lines[0]?.trim() || message.text?.substring(0, 50) || "Incident reported via WhatsApp"
  
  // Description is the full message text
  const description = message.text || "Incident reported via WhatsApp"

  // Determine priority based on keywords (simple heuristic)
  const urgentKeywords = ["urgent", "emergency", "broken", "leak", "fire"]
  const highKeywords = ["important", "critical", "not working"]
  const textLower = description.toLowerCase()
  
  let priority: "low" | "medium" | "high" | "urgent" = "medium"
  if (urgentKeywords.some((keyword) => textLower.includes(keyword))) {
    priority = "urgent"
  } else if (highKeywords.some((keyword) => textLower.includes(keyword))) {
    priority = "high"
  }

  return {
    propertyId,
    title: title.length > 100 ? title.substring(0, 100) : title,
    description,
    priority,
    submittedPhone: message.from,
    submittedName: undefined // Could extract from contact profile if available
  }
}

