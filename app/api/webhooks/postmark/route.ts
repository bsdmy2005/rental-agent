import { NextRequest, NextResponse } from "next/server"
import { processEmailWebhookAction, type PostmarkWebhookPayload } from "@/actions/email-processors-actions"

// Configure route for longer processing time and ensure it's not blocked
// Note: We return immediately, so maxDuration is mainly for error handling
export const maxDuration = 60 // 60 seconds max duration
export const runtime = "nodejs" // Use Node.js runtime

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("[Email Webhook] ==========================================")
  console.log("[Email Webhook] Received POST request at:", new Date().toISOString())
  
  // Parse payload with timeout protection
  let payload: {
    MessageID?: string
    From?: string
    To?: string
    Recipient?: string
    Subject?: string
    ReceivedAt?: string
    Attachments?: Array<{ Name?: string; ContentType?: string; ContentLength?: number }>
    [key: string]: unknown
  }
  try {
    // Set a timeout for JSON parsing to avoid hanging
    const jsonPromise = request.json()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("JSON parsing timeout after 10 seconds")), 10000)
    )
    
    payload = await Promise.race([jsonPromise, timeoutPromise])
  } catch (jsonError) {
    console.error("[Email Webhook] ✗ Failed to parse JSON payload:", jsonError)
    if (jsonError instanceof Error) {
      console.error("[Email Webhook]   Error:", jsonError.message)
    }
    console.log("[Email Webhook] ==========================================")
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }
  
  // Log request info after parsing (non-blocking)
  console.log("[Email Webhook] Request headers:", {
    "content-type": request.headers.get("content-type"),
    "user-agent": request.headers.get("user-agent"),
    "x-postmark-signature": request.headers.get("x-postmark-signature") ? "(present)" : "(missing)",
    "content-length": request.headers.get("content-length")
  })
  
  try {
    
    console.log("[Email Webhook] Raw payload received:")
    console.log("[Email Webhook] - MessageID:", payload?.MessageID || "(missing)")
    console.log("[Email Webhook] - From:", payload?.From || "(missing)")
    console.log("[Email Webhook] - To:", payload?.To || "(missing)")
    console.log("[Email Webhook] - Recipient:", payload?.Recipient || "(missing)")
    console.log("[Email Webhook] - Subject:", payload?.Subject || "(no subject)")
    console.log("[Email Webhook] - ReceivedAt:", payload?.ReceivedAt || "(missing)")
    console.log("[Email Webhook] - Attachments count:", payload?.Attachments?.length || 0)
    console.log("[Email Webhook] - All payload keys:", payload ? Object.keys(payload) : "payload is null/undefined")
    
    if (!payload) {
      console.error("[Email Webhook] ✗ Payload is null or undefined")
      console.log("[Email Webhook] ==========================================")
      return NextResponse.json({ error: "Payload is required" }, { status: 400 })
    }

    // Validate required fields
    if (!payload.MessageID || !payload.From) {
      console.error("[Email Webhook] ✗ Missing required fields (MessageID or From)")
      console.log("[Email Webhook] ==========================================")
      return NextResponse.json({ error: "MessageID and From are required" }, { status: 400 })
    }

    if (payload.Attachments && payload.Attachments.length > 0) {
      payload.Attachments.forEach((att: { Name?: string; ContentType?: string; ContentLength?: number }, idx: number) => {
        console.log(`[Email Webhook]   Attachment ${idx + 1}:`, {
          name: att.Name,
          contentType: att.ContentType,
          contentLength: att.ContentLength
        })
      })
    }

    // Verify webhook signature if needed
    // const signature = request.headers.get("X-Postmark-Signature")
    // TODO: Verify signature with POSTMARK_WEBHOOK_SECRET

    // Return success immediately to Postmark (webhook acknowledged)
    // Processing will continue in the background
    console.log("[Email Webhook] ✓ Webhook acknowledged, processing in background")
    console.log("[Email Webhook] ==========================================")
    
    // Process email asynchronously - don't await, return immediately
    // The promise chain won't block the response
    // Type assertion is safe here because we've validated MessageID and From exist
    processEmailWebhookAction(payload as PostmarkWebhookPayload)
      .then((result) => {
        const duration = Date.now() - startTime
        console.log(`[Email Webhook] Background processing completed in ${duration}ms`)
        console.log("[Email Webhook] Result:", result.isSuccess ? "SUCCESS" : "FAILED")
        if (!result.isSuccess) {
          console.log("[Email Webhook] Error message:", result.message)
        }
      })
      .catch((error) => {
        const duration = Date.now() - startTime
        console.error(`[Email Webhook] ✗ Background processing failed (${duration}ms):`, error)
        if (error instanceof Error) {
          console.error(`[Email Webhook]   Error:`, error.message)
          console.error(`[Email Webhook]   Stack:`, error.stack)
        }
      })
    
    // Return response immediately (don't await the background processing)
    return NextResponse.json(
      { success: true, message: "Webhook received, processing..." },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Email Webhook] ✗ CRITICAL ERROR processing Postmark webhook (${duration}ms):`, error)
    if (error instanceof Error) {
      console.error(`[Email Webhook]   Error name:`, error.name)
      console.error(`[Email Webhook]   Error message:`, error.message)
      console.error(`[Email Webhook]   Error stack:`, error.stack)
    } else {
      console.error(`[Email Webhook]   Unknown error type:`, typeof error)
      console.error(`[Email Webhook]   Error value:`, JSON.stringify(error, null, 2))
    }
    console.log("[Email Webhook] ==========================================")
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

