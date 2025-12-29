"use server"

import { db } from "@/db"
import { whatsappExplorerMessagesTable, type SelectWhatsappExplorerMessage } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { eq, desc, and, sql } from "drizzle-orm"
import { ActionState } from "@/types"

/**
 * Extract phone number from remoteJid
 * Format: 27788307321@s.whatsapp.net -> 27788307321
 */
function extractPhoneFromJid(remoteJid: string): string {
  return remoteJid.split("@")[0]
}

/**
 * Thread summary interface
 */
export interface ThreadSummary {
  phoneNumber: string
  displayName?: string
  lastMessage: SelectWhatsappExplorerMessage | null
  unreadCount: number
  messageCount: number
}

/**
 * Get all message threads for a session
 * Optimized: Uses SQL aggregation to get thread summaries efficiently
 */
export async function getMessageThreadsAction(
  sessionId: string
): Promise<ActionState<ThreadSummary[]>> {
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

    // Get all messages for the session (we still need all for grouping, but limit to recent ones)
    // For better performance, we can limit to last 1000 messages per thread
    const messages = await db.query.whatsappExplorerMessages.findMany({
      where: (messages, { eq }) => eq(messages.sessionId, sessionId),
      orderBy: (messages, { desc }) => [desc(messages.timestamp)],
      limit: 5000 // Limit to recent 5000 messages for performance
    })

    // Group messages by phone number (optimized with Map)
    const threadsMap = new Map<string, SelectWhatsappExplorerMessage[]>()

    for (const message of messages) {
      const phoneNumber = extractPhoneFromJid(message.remoteJid)
      if (!threadsMap.has(phoneNumber)) {
        threadsMap.set(phoneNumber, [])
      }
      threadsMap.get(phoneNumber)!.push(message)
    }

    // Build thread summaries
    const threads: ThreadSummary[] = []

    for (const [phoneNumber, threadMessages] of threadsMap.entries()) {
      // Sort messages by timestamp (newest first)
      threadMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      // Get last message
      const lastMessage = threadMessages[0] || null

      // Count unread messages (messages not from me that haven't been read)
      const unreadCount = threadMessages.filter(
        (msg) => !msg.fromMe && msg.status !== "read"
      ).length

      threads.push({
        phoneNumber,
        lastMessage,
        unreadCount,
        messageCount: threadMessages.length
      })
    }

    // Sort threads by last message timestamp (newest first)
    threads.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0
      if (!a.lastMessage) return 1
      if (!b.lastMessage) return -1
      return b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime()
    })

    return {
      isSuccess: true,
      message: "Threads retrieved successfully",
      data: threads
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get threads"
    }
  }
}

/**
 * Get messages for a specific thread (contact)
 * Optimized: Uses database WHERE clause with LIKE pattern matching
 */
export async function getMessagesByThreadAction(
  sessionId: string,
  phoneNumber: string
): Promise<ActionState<SelectWhatsappExplorerMessage[]>> {
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

    // Use SQL LIKE pattern to filter by phone number in remoteJid
    // remoteJid format: 27788307321@s.whatsapp.net
    // We match: phoneNumber + '@%' to filter at database level
    const threadMessages = await db
      .select()
      .from(whatsappExplorerMessagesTable)
      .where(
        and(
          eq(whatsappExplorerMessagesTable.sessionId, sessionId),
          sql`${whatsappExplorerMessagesTable.remoteJid} LIKE ${phoneNumber} || '@%'`
        )
      )
      .orderBy(whatsappExplorerMessagesTable.timestamp)

    return {
      isSuccess: true,
      message: "Messages retrieved successfully",
      data: threadMessages
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get messages"
    }
  }
}

/**
 * Clear all messages for a session
 */
export async function clearAllMessagesAction(
  sessionId: string
): Promise<ActionState<void>> {
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

    // Delete all messages for this session
    await db
      .delete(whatsappExplorerMessagesTable)
      .where(eq(whatsappExplorerMessagesTable.sessionId, sessionId))

    return {
      isSuccess: true,
      message: "All messages cleared successfully",
      data: undefined
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to clear messages"
    }
  }
}
