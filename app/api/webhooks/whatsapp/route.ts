import { NextRequest, NextResponse } from "next/server"
import { parseTwilioWebhook, validateTwilioWebhook, type TwilioWebhookPayload } from "@/lib/whatsapp/twilio-client"
import { parseTwilioWebhookToWhatsAppMessage } from "@/lib/whatsapp/webhook-handler"
import { extractRfqCode } from "@/lib/whatsapp/rfq-code-generator"
import { extractPropertyIdentifier } from "@/lib/whatsapp/webhook-handler"
import { processQuoteSubmissionAction } from "@/actions/whatsapp-actions"

/**
 * WhatsApp Webhook Handler
 * 
 * Handles incoming WhatsApp messages from Twilio
 * Routes messages to appropriate handlers:
 * - RFQ code → Quote submission handler
 * - Property code → Incident submission handler
 * - Otherwise → General inquiry handler
 */

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  // Twilio doesn't use GET for webhook verification, but keeping for compatibility
  // Some providers (like Facebook) use GET for verification
  const mode = request.nextUrl.searchParams.get("hub.mode")
  const token = request.nextUrl.searchParams.get("hub.verify_token")
  const challenge = request.nextUrl.searchParams.get("hub.challenge")

  // Verify webhook (for Facebook/Meta webhooks)
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "your_verification_token"

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Webhook verified")
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function POST(request: NextRequest) {
  console.log("[WhatsApp Webhook] ==========================================")
  console.log("[WhatsApp Webhook] Received POST request at:", new Date().toISOString())

  try {
    // Twilio sends form data, not JSON
    const formData = await request.formData()
    const payload = parseTwilioWebhook(formData)

    if (!payload) {
      console.log("[WhatsApp Webhook] Invalid payload format")
      return NextResponse.json({ success: true }, { status: 200 }) // Acknowledge to prevent retries
    }

    console.log("[WhatsApp Webhook] Message from:", payload.From)
    console.log("[WhatsApp Webhook] Message body:", payload.Body?.substring(0, 100))

    // Validate webhook signature (optional but recommended)
    const signature = request.headers.get("x-twilio-signature") || ""
    const url = request.url
    const params = Object.fromEntries(formData.entries()) as Record<string, string>
    
    // Note: validateTwilioWebhook requires the full URL with query params
    // For now, we'll skip validation in development but should enable in production
    if (process.env.NODE_ENV === "production") {
      // const isValid = validateTwilioWebhook(url, params, signature)
      // if (!isValid) {
      //   console.error("[WhatsApp Webhook] Invalid webhook signature")
      //   return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
      // }
    }

    // Convert Twilio payload to WhatsAppMessage format
    const message = parseTwilioWebhookToWhatsAppMessage(payload)
    const messageText = message.text || ""

    // Route message based on content
    if (!messageText) {
      console.log("[WhatsApp Webhook] No text content, ignoring")
      return NextResponse.json({ success: true }, { status: 200 })
    }

    // Check if message contains RFQ code (quote submission)
    const rfqCode = extractRfqCode(messageText)
    if (rfqCode) {
      console.log("[WhatsApp Webhook] Detected RFQ code:", rfqCode)
      
      // Process quote submission
      const result = await processQuoteSubmissionAction(messageText, message.from)
      
      if (result.isSuccess) {
        console.log("[WhatsApp Webhook] ✓ Quote submission processed successfully")
      } else {
        console.error("[WhatsApp Webhook] ✗ Quote submission failed:", result.message)
      }

      return NextResponse.json({ success: true }, { status: 200 })
    }

    // Check if message contains property code (incident submission)
    const propertyIdentifier = extractPropertyIdentifier(message)
    if (propertyIdentifier?.method === "code") {
      console.log("[WhatsApp Webhook] Detected property code:", propertyIdentifier.value)
      
      // TODO: Implement incident submission handler
      // const { submitPublicIncidentAction } = await import("@/actions/incidents-actions")
      // const incidentResult = await submitPublicIncidentAction({
      //   ...incidentData,
      //   submissionMethod: "whatsapp"
      // })

      console.log("[WhatsApp Webhook] Incident submission handler not yet implemented")
      return NextResponse.json({ success: true }, { status: 200 })
    }

    // General inquiry - could implement a help/FAQ handler
    console.log("[WhatsApp Webhook] General inquiry received, no handler configured")
    
    // Return success immediately (webhook acknowledged)
    console.log("[WhatsApp Webhook] ✓ Webhook acknowledged")
    console.log("[WhatsApp Webhook] ==========================================")

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[WhatsApp Webhook] ✗ Error processing webhook:", error)
    console.log("[WhatsApp Webhook] ==========================================")
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    )
  }
}

