"use server"

import { db } from "@/db"
import { whatsappSessionsTable } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { createWhatsAppBaileysClient } from "@/lib/whatsapp-baileys-client"
import type {
  SessionStatus,
  StoredMessage,
  SendMessageResult,
  AiConfig,
  AiTestResult
} from "@/lib/whatsapp-baileys-client"
import { ActionState } from "@/types"

// Helper to get client
function getClient(serverUrl: string, apiKey: string) {
  return createWhatsAppBaileysClient({ serverUrl, apiKey })
}

/**
 * Test connection to the Baileys server
 */
export async function testBaileysConnectionAction(
  serverUrl: string
): Promise<ActionState<{ status: string; service: string }>> {
  try {
    const response = await fetch(`${serverUrl}/health`)
    if (!response.ok) {
      return {
        isSuccess: false,
        message: `Server returned ${response.status}`
      }
    }
    const data = await response.json()
    return {
      isSuccess: true,
      message: "Connected to Baileys server",
      data: { status: data.status, service: data.service }
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to connect"
    }
  }
}

/**
 * Create or get a WhatsApp session for the current user
 */
export async function getOrCreateSessionAction(
  sessionName: string = "default"
): Promise<ActionState<{ sessionId: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get user profile
    const userProfile = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.clerkUserId, userId)
    })

    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // Check for existing session
    const existingSession = await db.query.whatsappSessions.findFirst({
      where: (sessions, { and, eq }) =>
        and(
          eq(sessions.userProfileId, userProfile.id),
          eq(sessions.sessionName, sessionName)
        )
    })

    if (existingSession) {
      return {
        isSuccess: true,
        message: "Session found",
        data: { sessionId: existingSession.id }
      }
    }

    // Create new session
    const [newSession] = await db
      .insert(whatsappSessionsTable)
      .values({
        userProfileId: userProfile.id,
        sessionName,
        connectionStatus: "disconnected",
        isActive: true
      })
      .returning()

    return {
      isSuccess: true,
      message: "Session created",
      data: { sessionId: newSession.id }
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get/create session"
    }
  }
}

/**
 * Get session status from Baileys server
 */
export async function getSessionStatusAction(
  serverUrl: string,
  apiKey: string,
  sessionId: string
): Promise<ActionState<SessionStatus>> {
  try {
    const client = getClient(serverUrl, apiKey)
    const status = await client.getSessionStatus(sessionId)
    return {
      isSuccess: true,
      message: "Status retrieved",
      data: status
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get status"
    }
  }
}

/**
 * Connect a session
 */
export async function connectSessionAction(
  serverUrl: string,
  apiKey: string,
  sessionId: string
): Promise<ActionState<{ message: string }>> {
  try {
    const client = getClient(serverUrl, apiKey)
    const result = await client.connect(sessionId)
    if (result.success) {
      return {
        isSuccess: true,
        message: result.message,
        data: { message: result.message }
      }
    }
    return {
      isSuccess: false,
      message: result.message
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to connect"
    }
  }
}

/**
 * Disconnect a session
 */
export async function disconnectSessionAction(
  serverUrl: string,
  apiKey: string,
  sessionId: string
): Promise<ActionState<{ message: string }>> {
  try {
    const client = getClient(serverUrl, apiKey)
    const result = await client.disconnect(sessionId)
    if (result.success) {
      return {
        isSuccess: true,
        message: result.message,
        data: { message: result.message }
      }
    }
    return {
      isSuccess: false,
      message: result.message
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to disconnect"
    }
  }
}

/**
 * Logout a session (clears auth state)
 */
export async function logoutSessionAction(
  serverUrl: string,
  apiKey: string,
  sessionId: string
): Promise<ActionState<{ message: string }>> {
  try {
    const client = getClient(serverUrl, apiKey)
    const result = await client.logout(sessionId)
    
    // Clear phone number from database after successful logout
    if (result.success) {
      const { userId } = await auth()
      if (userId) {
        const userProfile = await db.query.userProfiles.findFirst({
          where: (profiles, { eq }) => eq(profiles.clerkUserId, userId)
        })
        
        if (userProfile) {
          await db
            .update(whatsappSessionsTable)
            .set({
              phoneNumber: null,
              connectionStatus: "logged_out",
              lastDisconnectedAt: new Date()
            })
            .where(eq(whatsappSessionsTable.id, sessionId))
        }
      }
    }
    
    if (result.success) {
      return {
        isSuccess: true,
        message: result.message,
        data: { message: result.message }
      }
    }
    return {
      isSuccess: false,
      message: result.message
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to logout"
    }
  }
}

/**
 * Forget/clear the connected phone number (allows reconnection with different number)
 */
export async function forgetPhoneNumberAction(
  sessionId: string
): Promise<ActionState<{ message: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.clerkUserId, userId)
    })

    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // Verify session belongs to user
    const session = await db.query.whatsappSessions.findFirst({
      where: (sessions, { and, eq }) =>
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userProfileId, userProfile.id)
        )
    })

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    // Clear phone number and reset connection status
    await db
      .update(whatsappSessionsTable)
      .set({
        phoneNumber: null,
        connectionStatus: "disconnected",
        lastDisconnectedAt: new Date()
      })
      .where(eq(whatsappSessionsTable.id, sessionId))

    return {
      isSuccess: true,
      message: "Phone number cleared. You can now connect with a different number.",
      data: { message: "Phone number cleared" }
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to forget phone number"
    }
  }
}

/**
 * Get messages for a session
 */
export async function getMessagesAction(
  serverUrl: string,
  apiKey: string,
  sessionId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ActionState<{ messages: StoredMessage[]; pagination: { limit: number; offset: number; count: number } }>> {
  try {
    const client = getClient(serverUrl, apiKey)
    const result = await client.getMessages(sessionId, limit, offset)
    return {
      isSuccess: true,
      message: "Messages retrieved",
      data: { messages: result.messages, pagination: result.pagination }
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get messages"
    }
  }
}

/**
 * Send a message
 */
export async function sendMessageAction(
  serverUrl: string,
  apiKey: string,
  sessionId: string,
  recipient: string,
  content: string
): Promise<ActionState<SendMessageResult>> {
  const timestamp = new Date().toISOString()
  console.log(`[WhatsApp Explorer Action] ${timestamp} - sendMessageAction called`)
  console.log(`[WhatsApp Explorer Action] Server URL: ${serverUrl}`)
  console.log(`[WhatsApp Explorer Action] Session ID: ${sessionId}`)
  console.log(`[WhatsApp Explorer Action] Recipient: ${recipient}`)
  console.log(`[WhatsApp Explorer Action] Content: ${content}`)
  console.log(`[WhatsApp Explorer Action] Content length: ${content.length} characters`)
  
  try {
    const client = getClient(serverUrl, apiKey)
    console.log(`[WhatsApp Explorer Action] Client created, calling sendMessage...`)
    
    const result = await client.sendMessage(sessionId, recipient, content)
    
    console.log(`[WhatsApp Explorer Action] sendMessage completed`)
    console.log(`[WhatsApp Explorer Action] Result success: ${result.success}`)
    console.log(`[WhatsApp Explorer Action] Result:`, JSON.stringify(result, null, 2))
    
    if (result.success) {
      return {
        isSuccess: true,
        message: "Message sent",
        data: result
      }
    }
    return {
      isSuccess: false,
      message: "Failed to send message"
    }
  } catch (error) {
    console.error(`[WhatsApp Explorer Action] Error sending message:`, error)
    console.error(`[WhatsApp Explorer Action] Error details:`, error instanceof Error ? error.stack : String(error))
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send message"
    }
  }
}

/**
 * Get AI configuration
 */
export async function getAiConfigAction(
  serverUrl: string,
  apiKey: string,
  sessionId: string
): Promise<ActionState<{ config: AiConfig | null }>> {
  try {
    const client = getClient(serverUrl, apiKey)
    const result = await client.getAiConfig(sessionId)
    return {
      isSuccess: true,
      message: "AI config retrieved",
      data: { config: result.config }
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get AI config"
    }
  }
}

/**
 * Update AI configuration
 * Reads OpenAI API key and model from environment variables
 */
export async function updateAiConfigAction(
  serverUrl: string,
  apiKey: string,
  sessionId: string,
  config: {
    enabled: boolean
    systemPrompt: string
  }
): Promise<ActionState<{ message: string }>> {
  try {
    // Read from environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY
    const openaiModel = process.env.OPENAI_MODEL || "gpt-4"

    if (!openaiApiKey) {
      return {
        isSuccess: false,
        message: "OPENAI_API_KEY environment variable is not set"
      }
    }

    console.log(`[WhatsApp Explorer Action] Updating AI config for session: ${sessionId}`)
    console.log(`[WhatsApp Explorer Action] Config:`, {
      enabled: config.enabled,
      systemPrompt: config.systemPrompt.substring(0, 100) + "...",
      model: openaiModel,
      hasApiKey: !!openaiApiKey
    })

    const client = getClient(serverUrl, apiKey)
    const result = await client.updateAiConfig(sessionId, {
      enabled: config.enabled,
      systemPrompt: config.systemPrompt,
      model: openaiModel,
      openaiApiKey: openaiApiKey
    })
    
    console.log(`[WhatsApp Explorer Action] AI config update result:`, {
      success: result.success,
      message: result.message
    })
    
    if (result.success) {
      return {
        isSuccess: true,
        message: result.message,
        data: { message: result.message }
      }
    }
    return {
      isSuccess: false,
      message: result.message
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to update AI config"
    }
  }
}

/**
 * Test AI response
 * Reads OpenAI API key and model from environment variables
 */
export async function testAiResponseAction(
  serverUrl: string,
  apiKey: string,
  sessionId: string,
  testMessage: string,
  systemPrompt: string
): Promise<ActionState<AiTestResult>> {
  try {
    // Read from environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY
    const openaiModel = process.env.OPENAI_MODEL || "gpt-4"

    if (!openaiApiKey) {
      return {
        isSuccess: false,
        message: "OPENAI_API_KEY environment variable is not set"
      }
    }

    const client = getClient(serverUrl, apiKey)
    const result = await client.testAi(sessionId, testMessage, systemPrompt, openaiModel, openaiApiKey)
    if (result.success) {
      return {
        isSuccess: true,
        message: "AI response generated",
        data: result
      }
    }
    return {
      isSuccess: false,
      message: result.error || "Failed to test AI"
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to test AI"
    }
  }
}

/**
 * List all sessions for the current user
 */
export async function listSessionsAction(): Promise<
  ActionState<Array<{ id: string; sessionName: string; connectionStatus: string; phoneNumber: string | null }>>
> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.clerkUserId, userId)
    })

    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    const sessions = await db.query.whatsappSessions.findMany({
      where: (sessions, { eq }) => eq(sessions.userProfileId, userProfile.id),
      orderBy: (sessions, { desc }) => desc(sessions.createdAt)
    })

    return {
      isSuccess: true,
      message: "Sessions retrieved",
      data: sessions.map((s) => ({
        id: s.id,
        sessionName: s.sessionName,
        connectionStatus: s.connectionStatus,
        phoneNumber: s.phoneNumber
      }))
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to list sessions"
    }
  }
}
