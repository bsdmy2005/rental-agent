import { NextRequest, NextResponse } from "next/server"
import { processEmailWebhookAction } from "@/actions/email-processors-actions"

/**
 * Test endpoint for email webhook processing
 * This endpoint allows you to test email processing without setting up Postmark
 * 
 * Usage (POST request to /api/test/email-webhook):
 * 
 * Example 1: With Date field (Postmark format)
 * {
 *   "MessageID": "test-123",
 *   "From": "bills@test.com",
 *   "To": "your-user-email@example.com", // Must match a user profile email
 *   "Subject": "Test Bill",
 *   "Date": "2024-01-01T00:00:00Z",
 *   "Attachments": [
 *     {
 *       "Name": "bill.pdf",
 *       "Content": "<base64-encoded-pdf-content>",
 *       "ContentType": "application/pdf",
 *       "ContentLength": 12345
 *     }
 *   ]
 * }
 * 
 * Example 2: With "Name" <email> format in To field
 * {
 *   "MessageID": "test-456",
 *   "From": "bills@test.com",
 *   "To": "\"John Doe\" <john@example.com>",
 *   "Subject": "Test Bill",
 *   "Date": "2024-01-01T00:00:00Z",
 *   "Attachments": []
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("[Test Email Webhook] ==========================================")
  console.log("[Test Email Webhook] Test endpoint called at:", new Date().toISOString())
  
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "This endpoint is only available in development" },
        { status: 403 }
      )
    }

    const payload = await request.json()
    
    console.log("[Test Email Webhook] Test payload received:")
    console.log("[Test Email Webhook] - MessageID:", payload.MessageID)
    console.log("[Test Email Webhook] - From:", payload.From)
    console.log("[Test Email Webhook] - To:", payload.To)
    console.log("[Test Email Webhook] - Subject:", payload.Subject)
    console.log("[Test Email Webhook] - Date:", payload.Date)
    console.log("[Test Email Webhook] - ReceivedAt:", payload.ReceivedAt)
    console.log("[Test Email Webhook] - Attachments:", payload.Attachments?.length || 0)

    const result = await processEmailWebhookAction(payload)
    
    const duration = Date.now() - startTime
    console.log(`[Test Email Webhook] Processing completed in ${duration}ms`)
    console.log("[Test Email Webhook] Result:", result.isSuccess ? "SUCCESS" : "FAILED")
    if (!result.isSuccess) {
      console.log("[Test Email Webhook] Error message:", result.message)
    }
    console.log("[Test Email Webhook] ==========================================")

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Test Email Webhook] ✗ ERROR (${duration}ms):`, error)
    if (error instanceof Error) {
      console.error("[Test Email Webhook]   Error message:", error.message)
      console.error("[Test Email Webhook]   Stack trace:", error.stack)
    }
    console.log("[Test Email Webhook] ==========================================")
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

