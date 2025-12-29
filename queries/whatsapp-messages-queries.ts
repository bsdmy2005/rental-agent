import { db } from "@/db"
import { whatsappExplorerMessagesTable, type SelectWhatsappExplorerMessage } from "@/db/schema"
import { eq, desc, and, sql } from "drizzle-orm"

/**
 * Extract phone number from remoteJid
 * Format: 27788307321@s.whatsapp.net -> 27788307321
 */
export function extractPhoneFromJid(remoteJid: string): string {
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
 * Groups messages by contact (remoteJid) and returns thread summaries
 */
export async function getMessageThreadsQuery(
  sessionId: string
): Promise<ThreadSummary[]> {
  // Get all messages for the session
  const messages = await db.query.whatsappExplorerMessages.findMany({
    where: (messages, { eq }) => eq(messages.sessionId, sessionId),
    orderBy: (messages, { desc }) => [desc(messages.timestamp)]
  })

  // Group messages by phone number
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
    // Note: This is a simplified version - you may want to add a read status field
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

  return threads
}

/**
 * Get messages for a specific thread (contact)
 */
export async function getMessagesByThreadQuery(
  sessionId: string,
  phoneNumber: string
): Promise<SelectWhatsappExplorerMessage[]> {
  // Get all messages for the session
  const allMessages = await db.query.whatsappExplorerMessages.findMany({
    where: (messages, { eq }) => eq(messages.sessionId, sessionId),
    orderBy: (messages, { asc }) => [asc(messages.timestamp)]
  })

  // Filter messages for this specific phone number
  const threadMessages = allMessages.filter(
    (msg) => extractPhoneFromJid(msg.remoteJid) === phoneNumber
  )

  return threadMessages
}

/**
 * Get thread summary for a specific contact
 */
export async function getThreadSummaryQuery(
  sessionId: string,
  phoneNumber: string
): Promise<ThreadSummary | null> {
  const messages = await getMessagesByThreadQuery(sessionId, phoneNumber)

  if (messages.length === 0) {
    return null
  }

  // Sort by timestamp (newest first)
  const sortedMessages = [...messages].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  )

  const lastMessage = sortedMessages[0]
  const unreadCount = messages.filter(
    (msg) => !msg.fromMe && msg.status !== "read"
  ).length

  return {
    phoneNumber,
    lastMessage,
    unreadCount,
    messageCount: messages.length
  }
}

/**
 * Get all unique phone numbers (contacts) that have sent/received messages
 */
export async function getAllThreadPhoneNumbersQuery(
  sessionId: string
): Promise<string[]> {
  const messages = await db.query.whatsappExplorerMessages.findMany({
    where: (messages, { eq }) => eq(messages.sessionId, sessionId),
    columns: {
      remoteJid: true
    }
  })

  const phoneNumbers = new Set<string>()
  for (const message of messages) {
    const phoneNumber = extractPhoneFromJid(message.remoteJid)
    phoneNumbers.add(phoneNumber)
  }

  return Array.from(phoneNumbers)
}

