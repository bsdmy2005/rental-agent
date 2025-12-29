"use server"

import { NextRequest, NextResponse } from "next/server"
import { createIncidentFromWhatsAppAction } from "@/actions/whatsapp-incident-actions"
import { createWhatsAppBaileysClientFromEnv } from "@/lib/whatsapp-baileys-client"

/**
 * API route for handling WhatsApp incident submissions
 * Called by Baileys server when an incident message is received
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get("x-api-key")
    const expectedApiKey = process.env.WHATSAPP_SERVER_API_KEY

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { messageText, fromPhoneNumber, sessionId } = body

    if (!messageText || !fromPhoneNumber || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields: messageText, fromPhoneNumber, sessionId" },
        { status: 400 }
      )
    }

    // Create incident
    const result = await createIncidentFromWhatsAppAction(
      messageText,
      fromPhoneNumber,
      sessionId
    )

    if (!result.isSuccess || !result.data) {
      return NextResponse.json(
        { 
          success: false,
          error: result.message,
          shouldRespond: true,
          responseMessage: result.message
        },
        { status: 200 } // Return 200 so Baileys server can send response
      )
    }

    // Return success with confirmation message to send back
    return NextResponse.json({
      success: true,
      incidentId: result.data.incident.id,
      confirmationMessage: result.data.confirmationMessage,
      shouldRespond: true
    })
  } catch (error) {
    console.error("Error handling WhatsApp incident:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        shouldRespond: true,
        responseMessage: "An error occurred while processing your incident. Please try again later."
      },
      { status: 200 } // Return 200 so Baileys server can send error response
    )
  }
}

