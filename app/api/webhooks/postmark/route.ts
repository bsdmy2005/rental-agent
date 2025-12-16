import { NextRequest, NextResponse } from "next/server"
import { processEmailWebhookAction } from "@/actions/email-processors-actions"

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    // Verify webhook signature if needed
    // const signature = request.headers.get("X-Postmark-Signature")
    // TODO: Verify signature with POSTMARK_WEBHOOK_SECRET

    const result = await processEmailWebhookAction(payload)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Postmark webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

