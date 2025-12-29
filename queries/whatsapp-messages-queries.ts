import { db } from "@/db"
import { whatsappExplorerMessagesTable, whatsappSessionsTable, incidentsTable, type SelectWhatsappExplorerMessage } from "@/db/schema"
import { eq, desc, and, sql, or, ilike, ne } from "drizzle-orm"

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

/**
 * Get messages for an incident by phone number from primary session
 * This finds the primary session for the user and gets messages for the incident's phone number
 */
export async function getIncidentWhatsAppMessagesQuery(
  userProfileId: string,
  phoneNumber: string
): Promise<SelectWhatsappExplorerMessage[]> {
  // Normalize phone number (remove + if present, ensure 27... format)
  const normalizedPhone = phoneNumber.replace(/\D/g, "").replace(/^0/, "27")
  
  // Find primary session for this user
  const primarySession = await db.query.whatsappSessions.findFirst({
    where: (sessions, { and, eq }) =>
      and(
        eq(sessions.userProfileId, userProfileId),
        eq(sessions.sessionName, "primary")
      )
  })

  if (!primarySession) {
    return []
  }

  // Get all messages for the primary session
  const allMessages = await db.query.whatsappExplorerMessages.findMany({
    where: (messages, { eq }) => eq(messages.sessionId, primarySession.id),
    orderBy: (messages, { asc }) => [asc(messages.timestamp)]
  })

  // Filter messages for this phone number (match both normalized and original formats)
  const threadMessages = allMessages.filter((msg) => {
    const msgPhone = extractPhoneFromJid(msg.remoteJid)
    const normalizedMsgPhone = msgPhone.replace(/\D/g, "").replace(/^0/, "27")
    return normalizedMsgPhone === normalizedPhone || msgPhone === phoneNumber
  })

  return threadMessages
}

/**
 * Get messages related to a specific incident
 * Filters messages by phone number and timestamp within incident timeframe
 * Excludes messages that are clearly associated with other incidents
 */
export async function getIncidentRelatedMessagesQuery(
  incidentId: string,
  phoneNumber: string,
  sessionId: string,
  incidentReportedAt: Date,
  incidentUpdatedAt: Date
): Promise<SelectWhatsappExplorerMessage[]> {
  // Normalize phone number (remove + if present, ensure 27... format)
  const normalizedPhone = phoneNumber.replace(/\D/g, "").replace(/^0/, "27")
  
  // Get all messages for the session
  const allMessages = await db.query.whatsappExplorerMessages.findMany({
    where: (messages, { eq }) => eq(messages.sessionId, sessionId),
    orderBy: (messages, { asc }) => [asc(messages.timestamp)]
  })

  // Get all incidents for this phone number to exclude messages from other incidents
  const allIncidents = await db
    .select({
      id: incidentsTable.id,
      reportedAt: incidentsTable.reportedAt,
      updatedAt: incidentsTable.updatedAt
    })
    .from(incidentsTable)
    .where(
      and(
        or(
          eq(incidentsTable.submittedPhone, phoneNumber),
          eq(incidentsTable.submittedPhone, normalizedPhone),
          ilike(incidentsTable.submittedPhone, `%${normalizedPhone}%`)
        ),
        ne(incidentsTable.id, incidentId) // Exclude current incident
      )
    )

  // Define tight time window for this incident
  // Start: 2 minutes before incident creation (to catch the initial message that created it)
  // End: 1 hour after incident last update (to catch follow-up messages, but not messages from new incidents)
  const startTime = new Date(incidentReportedAt.getTime() - 2 * 60 * 1000) // 2 minutes before
  const maxEndTime = new Date(incidentUpdatedAt.getTime() + 60 * 60 * 1000) // 1 hour after last update
  const endTime = new Date() > maxEndTime ? maxEndTime : new Date()
  
  // Filter messages:
  // 1. Phone number match (normalized)
  // 2. Timestamp within incident's tight timeframe
  // 3. Not closer to another incident's timeframe
  // 4. Must be after incident creation (or within 2 min before for initial message)
  const incidentMessages = allMessages.filter((msg) => {
    const msgPhone = extractPhoneFromJid(msg.remoteJid)
    const normalizedMsgPhone = msgPhone.replace(/\D/g, "").replace(/^0/, "27")
    const phoneMatch = normalizedMsgPhone === normalizedPhone || msgPhone === phoneNumber
    
    if (!phoneMatch) return false
    
    // CRITICAL: Only include messages that are:
    // - Within 2 minutes BEFORE incident creation (initial message that triggered incident creation)
    // - OR after incident creation and within 1 hour of last update (follow-up messages)
    // Exclude ALL other messages (they belong to other incidents)
    
    const messageTime = msg.timestamp.getTime()
    const incidentTime = incidentReportedAt.getTime()
    const twoMinutesBefore = incidentTime - (2 * 60 * 1000)
    
    // Check if message is within the allowed window
    const isWithinInitialWindow = messageTime >= twoMinutesBefore && messageTime < incidentTime
    const isAfterIncident = messageTime >= incidentTime && messageTime <= endTime.getTime()
    
    if (!isWithinInitialWindow && !isAfterIncident) {
      return false // Message is outside the allowed time window
    }
    
    // Exclude messages that are clearly closer to another incident
    for (const otherIncident of allIncidents) {
      // If message is before this incident was created but after another incident was created,
      // it definitely belongs to the other incident
      if (msg.timestamp < incidentReportedAt && msg.timestamp >= otherIncident.reportedAt) {
        return false
      }
      
      // If message is within 2 minutes before this incident, check if it's also within 2 minutes before another incident
      // If so, assign it to whichever incident it's closer to
      if (msg.timestamp < incidentReportedAt) {
        const twoMinutesBeforeOther = new Date(otherIncident.reportedAt.getTime() - 2 * 60 * 1000)
        
        // If message is within 2 minutes before both incidents, check which one it's closer to
        if (msg.timestamp >= twoMinutesBeforeOther && msg.timestamp < otherIncident.reportedAt) {
          const timeToThisIncident = incidentReportedAt.getTime() - msg.timestamp.getTime()
          const timeToOtherIncident = msg.timestamp.getTime() - otherIncident.reportedAt.getTime()
          
          // If message is closer to other incident (or same distance), exclude from this incident
          if (timeToOtherIncident <= timeToThisIncident) {
            return false
          }
        }
      }
      
      // If message is after both incidents were created, check which one it's closer to
      if (msg.timestamp >= incidentReportedAt && msg.timestamp >= otherIncident.reportedAt) {
        const distanceToThisIncident = Math.abs(msg.timestamp.getTime() - incidentReportedAt.getTime())
        const distanceToOtherIncident = Math.abs(msg.timestamp.getTime() - otherIncident.reportedAt.getTime())
        
        // If message is closer to other incident (within 5 minutes), exclude it
        if (distanceToOtherIncident < distanceToThisIncident && distanceToOtherIncident < 5 * 60 * 1000) {
          return false
        }
      }
    }
    
    return true
  })

  return incidentMessages
}

