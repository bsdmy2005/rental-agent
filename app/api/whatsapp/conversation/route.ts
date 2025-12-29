import { NextRequest, NextResponse } from "next/server"

import { processConversationMessage } from "@/lib/whatsapp/conversation-state-machine"

/**
 * API route for processing WhatsApp messages through conversation state machine.
 * Called by Baileys server for all incoming messages.
 *
 * @description This endpoint receives incoming WhatsApp messages from the Baileys
 * server and routes them through the conversation state machine for processing.
 * The state machine handles tenant identification, verification, incident creation,
 * and follow-up interactions.
 *
 * @security Protected by API key authentication via x-api-key header
 *
 * @example Request body:
 * ```json
 * {
 *   "phoneNumber": "+27821234567",
 *   "messageText": "PROP-ABC123 - My kitchen tap is leaking",
 *   "sessionId": "session-123",
 *   "hasMedia": false,
 *   "mediaUrls": []
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get("x-api-key")
    const expectedApiKey = process.env.WHATSAPP_SERVER_API_KEY

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { phoneNumber, messageText, sessionId, hasMedia, mediaUrls } = body

    if (!phoneNumber || !messageText) {
      return NextResponse.json(
        { error: "Missing required fields: phoneNumber, messageText" },
        { status: 400 }
      )
    }

    // Convert mediaUrls to attachments format expected by state machine
    const attachments =
      hasMedia && Array.isArray(mediaUrls) && mediaUrls.length > 0
        ? mediaUrls.map((url: string, index: number) => ({
            url,
            type: "image", // Default to image, could be enhanced to detect type
            fileName: `attachment-${index + 1}`
          }))
        : undefined

    const result = await processConversationMessage(
      phoneNumber,
      messageText,
      sessionId,
      attachments
    )

    return NextResponse.json({
      success: true,
      responseMessage: result.message,
      incidentCreated: result.incidentCreated || false,
      incidentId: result.incidentId,
      referenceNumber: result.referenceNumber
    })
  } catch (error) {
    console.error("Error processing conversation:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        responseMessage: "Sorry, something went wrong. Please try again."
      },
      { status: 200 }
    )
  }
}
