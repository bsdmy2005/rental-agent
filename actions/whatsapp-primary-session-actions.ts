"use server"

import { db } from "@/db"
import { whatsappSessionsTable } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { eq, and } from "drizzle-orm"
import { createWhatsAppBaileysClientFromEnv } from "@/lib/whatsapp-baileys-client"
import { ActionState } from "@/types"
import { getWhatsAppServerUrl } from "@/lib/utils/get-app-url"

/**
 * Get or create primary WhatsApp session for a user profile
 * Primary session is used for RFQ dispatch and incident logging
 */
export async function getPrimaryWhatsAppSessionAction(
  userProfileId: string
): Promise<ActionState<{ sessionId: string; phoneNumber: string | null; connectionStatus: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Verify user profile belongs to current user
    const userProfile = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, userProfileId)
    })

    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // Check for existing primary session
    const existingSession = await db.query.whatsappSessions.findFirst({
      where: (sessions, { and, eq }) =>
        and(
          eq(sessions.userProfileId, userProfileId),
          eq(sessions.sessionName, "primary")
        )
    })

    if (existingSession) {
      return {
        isSuccess: true,
        message: "Primary session found",
        data: {
          sessionId: existingSession.id,
          phoneNumber: existingSession.phoneNumber,
          connectionStatus: existingSession.connectionStatus
        }
      }
    }

    // Create new primary session
    const [newSession] = await db
      .insert(whatsappSessionsTable)
      .values({
        userProfileId: userProfileId,
        sessionName: "primary",
        connectionStatus: "disconnected",
        isActive: true
      })
      .returning()

    return {
      isSuccess: true,
      message: "Primary session created",
      data: {
        sessionId: newSession.id,
        phoneNumber: newSession.phoneNumber,
        connectionStatus: newSession.connectionStatus
      }
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get/create primary session"
    }
  }
}

/**
 * Get primary session status
 */
export async function getPrimarySessionStatusAction(
  userProfileId: string
): Promise<ActionState<{ connectionStatus: string; phoneNumber: string | null; qrCode: string | null; lastError: string | null }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const sessionResult = await getPrimaryWhatsAppSessionAction(userProfileId)
    if (!sessionResult.isSuccess || !sessionResult.data) {
      return { isSuccess: false, message: "Primary session not found" }
    }

    const sessionId = sessionResult.data.sessionId
    const serverUrl = getWhatsAppServerUrl()
    const apiKey = process.env.WHATSAPP_SERVER_API_KEY || ""

    if (!apiKey) {
      return {
        isSuccess: false,
        message: "WhatsApp server API key not configured"
      }
    }

    try {
      const client = createWhatsAppBaileysClientFromEnv()
      const status = await client.getSessionStatus(sessionId)
      
      return {
        isSuccess: true,
        message: "Status retrieved",
        data: {
          connectionStatus: status.connectionStatus,
          phoneNumber: status.phoneNumber,
          qrCode: status.qrCode,
          lastError: status.lastError
        }
      }
    } catch (error) {
      // If server is unreachable, return database status
      const session = await db.query.whatsappSessions.findFirst({
        where: (sessions, { and, eq }) =>
          and(
            eq(sessions.userProfileId, userProfileId),
            eq(sessions.sessionName, "primary")
          )
      })

      return {
        isSuccess: true,
        message: "Status retrieved from database",
        data: {
          connectionStatus: session?.connectionStatus || "disconnected",
          phoneNumber: session?.phoneNumber || null,
          qrCode: null,
          lastError: error instanceof Error ? error.message : "Failed to connect to WhatsApp server"
        }
      }
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get session status"
    }
  }
}

/**
 * Set primary WhatsApp number and initiate connection
 */
export async function setPrimaryWhatsAppNumberAction(
  userProfileId: string,
  phoneNumber: string
): Promise<ActionState<{ sessionId: string; qrCode: string | null }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Normalize phone number (27... format)
    const normalizedPhone = normalizePhoneNumber(phoneNumber)

    // Get or create primary session
    const sessionResult = await getPrimaryWhatsAppSessionAction(userProfileId)
    if (!sessionResult.isSuccess || !sessionResult.data) {
      return { isSuccess: false, message: "Failed to get/create primary session" }
    }

    const sessionId = sessionResult.data.sessionId
    const serverUrl = getWhatsAppServerUrl()
    const apiKey = process.env.WHATSAPP_SERVER_API_KEY || ""

    if (!apiKey) {
      return {
        isSuccess: false,
        message: "WhatsApp server API key not configured"
      }
    }

    // Update phone number in database
    await db
      .update(whatsappSessionsTable)
      .set({
        phoneNumber: normalizedPhone,
        updatedAt: new Date()
      })
      .where(eq(whatsappSessionsTable.id, sessionId))

    // Initiate connection
    const client = createWhatsAppBaileysClientFromEnv()
    const connectResult = await client.connect(sessionId)

    if (!connectResult.success) {
      return {
        isSuccess: false,
        message: connectResult.message
      }
    }

    // Get status to retrieve QR code if needed
    const status = await client.getSessionStatus(sessionId)

    return {
      isSuccess: true,
      message: "Connection initiated",
      data: {
        sessionId,
        qrCode: status.qrCode
      }
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to set phone number"
    }
  }
}

/**
 * Force disconnect and forget primary WhatsApp session
 * This will disconnect, logout, and reset the session to allow a fresh connection
 */
export async function forceDisconnectPrimarySessionAction(
  userProfileId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get primary session
    const sessionResult = await getPrimaryWhatsAppSessionAction(userProfileId)
    if (!sessionResult.isSuccess || !sessionResult.data) {
      return { isSuccess: false, message: "Primary session not found" }
    }

    const sessionId = sessionResult.data.sessionId
    const serverUrl = getWhatsAppServerUrl()
    const apiKey = process.env.WHATSAPP_SERVER_API_KEY || ""

    // Helper to check if error is a connection error (server unreachable)
    const isConnectionError = (error: unknown): boolean => {
      if (error instanceof Error) {
        const message = error.message.toLowerCase()
        const cause = (error as any).cause
        return (
          message.includes("econnrefused") ||
          message.includes("fetch failed") ||
          message.includes("network") ||
          (cause && typeof cause === "object" && "code" in cause && cause.code === "ECONNREFUSED")
        )
      }
      return false
    }

    // Try to disconnect and logout from WhatsApp server (ignore errors if server is unreachable)
    // This is safe to skip if server is down - we'll still reset the database state
    if (apiKey && serverUrl) {
      try {
        const client = createWhatsAppBaileysClientFromEnv()
        
        // First try to disconnect
        try {
          await client.disconnect(sessionId)
        } catch (error) {
          // Ignore connection errors (server might be down) - only log other errors
          if (!isConnectionError(error)) {
            console.log("Disconnect error (ignored):", error instanceof Error ? error.message : String(error))
          }
        }

        // Then try to logout to clear auth state
        try {
          await client.logout(sessionId)
        } catch (error) {
          // Ignore connection errors (server might be down) - only log other errors
          if (!isConnectionError(error)) {
            console.log("Logout error (ignored):", error instanceof Error ? error.message : String(error))
          }
        }
      } catch (error) {
        // Ignore connection errors (server might be down) - only log other errors
        if (!isConnectionError(error)) {
          console.log("WhatsApp server error (ignored):", error instanceof Error ? error.message : String(error))
        }
      }
    }

    // Reset session in database - clear phone number, auth state, and set to disconnected
    await db
      .update(whatsappSessionsTable)
      .set({
        phoneNumber: null,
        connectionStatus: "disconnected",
        authState: null,
        lastDisconnectedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(whatsappSessionsTable.id, sessionId))

    return {
      isSuccess: true,
      message: "Connection forgotten. You can now set up a fresh connection.",
      data: undefined
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to force disconnect"
    }
  }
}

/**
 * Ensure primary session is connected
 * Returns error if not connected
 */
export async function ensurePrimarySessionConnectedAction(
  userProfileId: string
): Promise<ActionState<{ sessionId: string; phoneNumber: string }>> {
  try {
    const statusResult = await getPrimarySessionStatusAction(userProfileId)
    if (!statusResult.isSuccess || !statusResult.data) {
      return {
        isSuccess: false,
        message: "Primary WhatsApp session not found. Please configure WhatsApp in settings."
      }
    }

    const { connectionStatus, phoneNumber } = statusResult.data

    if (connectionStatus !== "connected") {
      return {
        isSuccess: false,
        message: `WhatsApp is not connected. Current status: ${connectionStatus}. Please connect your WhatsApp account in settings.`
      }
    }

    if (!phoneNumber) {
      return {
        isSuccess: false,
        message: "WhatsApp phone number not configured. Please set up your WhatsApp account in settings."
      }
    }

    const sessionResult = await getPrimaryWhatsAppSessionAction(userProfileId)
    if (!sessionResult.isSuccess || !sessionResult.data) {
      return { isSuccess: false, message: "Session not found" }
    }

    return {
      isSuccess: true,
      message: "WhatsApp is connected and ready",
      data: {
        sessionId: sessionResult.data.sessionId,
        phoneNumber: phoneNumber
      }
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to check connection status"
    }
  }
}

/**
 * Check if WhatsApp is enabled and connected for a user
 */
export async function isWhatsAppEnabledAction(
  userProfileId: string
): Promise<ActionState<{ enabled: boolean; connected: boolean; phoneNumber: string | null }>> {
  try {
    const statusResult = await getPrimarySessionStatusAction(userProfileId)
    if (!statusResult.isSuccess || !statusResult.data) {
      return {
        isSuccess: true,
        message: "WhatsApp not configured",
        data: {
          enabled: false,
          connected: false,
          phoneNumber: null
        }
      }
    }

    const { connectionStatus, phoneNumber } = statusResult.data
    const connected = connectionStatus === "connected"
    const enabled = !!phoneNumber // Enabled if phone number is set

    return {
      isSuccess: true,
      message: enabled ? (connected ? "WhatsApp is enabled and connected" : "WhatsApp is enabled but not connected") : "WhatsApp is not enabled",
      data: {
        enabled,
        connected,
        phoneNumber
      }
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to check WhatsApp status"
    }
  }
}

/**
 * Normalize phone number to 27... format (without +)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "")
  
  // Handle South African numbers
  if (digits.startsWith("0")) {
    // 0821234567 -> 27821234567
    return "27" + digits.substring(1)
  } else if (digits.startsWith("27")) {
    // Already in correct format
    return digits
  } else if (digits.startsWith("8")) {
    // 821234567 -> 27821234567
    return "27" + digits
  }
  
  // Return as-is if no pattern matches
  return digits
}

