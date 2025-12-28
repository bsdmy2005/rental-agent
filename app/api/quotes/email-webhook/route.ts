import { NextRequest, NextResponse } from "next/server"
import { processQuoteEmailReplyAction } from "@/actions/service-providers-actions"
import type { PostmarkWebhookPayload } from "@/actions/email-processors-actions"

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("[Quote Email Webhook] ==========================================")
  console.log("[Quote Email Webhook] Received POST request at:", new Date().toISOString())

  let payload: PostmarkWebhookPayload
  try {
    const jsonPromise = request.json()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("JSON parsing timeout after 10 seconds")), 10000)
    )

    payload = await Promise.race([jsonPromise, timeoutPromise])
  } catch (jsonError) {
    console.error("[Quote Email Webhook] ✗ Failed to parse JSON payload:", jsonError)
    console.log("[Quote Email Webhook] ==========================================")
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  try {
    console.log("[Quote Email Webhook] Raw payload received:")
    console.log("[Quote Email Webhook] - MessageID:", payload?.MessageID || "(missing)")
    console.log("[Quote Email Webhook] - From:", payload?.From || "(missing)")
    console.log("[Quote Email Webhook] - To:", payload?.To || "(missing)")
    console.log("[Quote Email Webhook] - Recipient:", payload?.Recipient || "(missing)")
    console.log("[Quote Email Webhook] - Subject:", payload?.Subject || "(no subject)")

    if (!payload) {
      console.error("[Quote Email Webhook] ✗ Payload is null or undefined")
      console.log("[Quote Email Webhook] ==========================================")
      return NextResponse.json({ error: "Payload is required" }, { status: 400 })
    }

    // Extract the unique email address from To or Recipient field
    // Format: quote-{quoteRequestId}@domain.com
    const recipientEmail = payload.Recipient || payload.To || ""
    const uniqueEmailMatch = recipientEmail.match(/quote-([a-f0-9-]+)@/)

    if (!uniqueEmailMatch || !uniqueEmailMatch[1]) {
      console.log("[Quote Email Webhook] Not a quote email, ignoring...")
      console.log("[Quote Email Webhook] ==========================================")
      return NextResponse.json({ success: true, message: "Not a quote email" }, { status: 200 })
    }

    const uniqueEmailAddress = `quote-${uniqueEmailMatch[1]}@${recipientEmail.split("@")[1]}`

    console.log("[Quote Email Webhook] Processing quote reply for:", uniqueEmailAddress)

    // Extract quote information using AI extraction
    const emailBody = payload.TextBody || payload.HtmlBody || payload.StrippedTextReply || ""
    
    // Prepare attachments if available
    const attachments: Array<{ fileName: string; content: Buffer }> = []
    if (payload.Attachments && Array.isArray(payload.Attachments)) {
      for (const attachment of payload.Attachments) {
        if (attachment.Content && attachment.Name) {
          try {
            const contentBuffer = Buffer.from(attachment.Content, "base64")
            attachments.push({
              fileName: attachment.Name,
              content: contentBuffer
            })
          } catch (error) {
            console.warn(`[Quote Email Webhook] Failed to process attachment ${attachment.Name}:`, error)
          }
        }
      }
    }

    // Use AI extraction
    let extractedData: {
      amount: string
      description: string
      estimatedCompletionDate?: Date
    } | null = null

    try {
      const { extractQuoteFromEmailAction } = await import("@/actions/service-providers-actions")
      const extractionResult = await extractQuoteFromEmailAction(
        emailBody,
        attachments.length > 0 ? attachments : undefined
      )

      if (extractionResult.isSuccess && extractionResult.data) {
        extractedData = {
          amount: extractionResult.data.amount,
          description: extractionResult.data.description,
          estimatedCompletionDate: extractionResult.data.estimatedCompletionDate
            ? new Date(extractionResult.data.estimatedCompletionDate)
            : undefined
        }
        console.log("[Quote Email Webhook] ✓ AI extraction successful")
      } else {
        console.warn("[Quote Email Webhook] ⚠ AI extraction failed, using fallback")
      }
    } catch (extractError) {
      console.error("[Quote Email Webhook] ✗ AI extraction error:", extractError)
    }

    // Fallback to simple extraction if AI fails
    if (!extractedData) {
      const amountMatch = emailBody.match(/(?:R|ZAR|R\s*)?(\d+(?:[.,]\d{2})?)/i)
      const amount = amountMatch ? amountMatch[1].replace(",", ".") : "0"
      const description = payload.Subject || emailBody.split("\n").slice(0, 3).join(" ").substring(0, 500)
      
      extractedData = {
        amount,
        description
      }
    }

    // Process quote email reply
    console.log("[Quote Email Webhook] ✓ Webhook acknowledged, processing quote reply")
    console.log("[Quote Email Webhook] ==========================================")

    processQuoteEmailReplyAction(
      uniqueEmailAddress,
      {
        amount: extractedData.amount,
        description: extractedData.description,
        estimatedCompletionDate: extractedData.estimatedCompletionDate,
        emailReplyId: payload.MessageID
      },
      {
        source: attachments.length > 0 ? "pdf" : "email",
        messageId: payload.MessageID,
        fileName: attachments.length > 0 ? attachments[0].fileName : undefined
      }
    )
      .then((result) => {
        const duration = Date.now() - startTime
        console.log(`[Quote Email Webhook] Background processing completed in ${duration}ms`)
        console.log("[Quote Email Webhook] Result:", result.isSuccess ? "SUCCESS" : "FAILED")
        if (!result.isSuccess) {
          console.log("[Quote Email Webhook] Error message:", result.message)
        }
      })
      .catch((error) => {
        const duration = Date.now() - startTime
        console.error(`[Quote Email Webhook] ✗ Background processing failed (${duration}ms):`, error)
        if (error instanceof Error) {
          console.error(`[Quote Email Webhook]   Error:`, error.message)
          console.error(`[Quote Email Webhook]   Stack:`, error.stack)
        }
      })

    // Return response immediately
    return NextResponse.json(
      { success: true, message: "Quote email webhook received, processing..." },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Quote Email Webhook] ✗ CRITICAL ERROR (${duration}ms):`, error)
    console.log("[Quote Email Webhook] ==========================================")
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

