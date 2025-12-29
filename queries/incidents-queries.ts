import { db } from "@/db"
import {
  incidentsTable,
  incidentAttachmentsTable,
  incidentStatusHistoryTable,
  propertiesTable,
  tenantsTable,
  userProfilesTable,
  quoteRequestsTable,
  quotesTable,
  type SelectIncident,
  type SelectIncidentAttachment,
  type SelectIncidentStatusHistory
} from "@/db/schema"
import { eq, desc, inArray, ne, or, ilike, and } from "drizzle-orm"
import type { IncidentTimelineItem } from "@/types/incidents-types"

export interface IncidentWithDetails extends SelectIncident {
  property: {
    id: string
    name: string
    streetAddress: string
    suburb: string
    province: string
  }
  tenant: {
    id: string
    name: string
    email: string | null
  }
  attachments: SelectIncidentAttachment[]
  statusHistory: (SelectIncidentStatusHistory & {
    changedByUser?: {
      id: string
      firstName: string | null
      lastName: string | null
      email: string
    }
  })[]
  assignedToUser?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
}

export async function getIncidentByIdWithDetailsQuery(
  incidentId: string
): Promise<IncidentWithDetails | null> {
  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.id, incidentId))
    .limit(1)

  if (!incident) {
    return null
  }

  // Get property
  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.id, incident.propertyId))
    .limit(1)

  if (!property) {
    return null
  }

  // Get tenant (optional - anonymous incidents may not have a tenant)
  let tenant = null
  if (incident.tenantId) {
    const [tenantRecord] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, incident.tenantId))
      .limit(1)
    tenant = tenantRecord || null
  }

  // Get attachments
  const attachments = await db
    .select()
    .from(incidentAttachmentsTable)
    .where(eq(incidentAttachmentsTable.incidentId, incidentId))
    .orderBy(desc(incidentAttachmentsTable.uploadedAt))

  // Get status history
  const statusHistory = await db
    .select()
    .from(incidentStatusHistoryTable)
    .where(eq(incidentStatusHistoryTable.incidentId, incidentId))
    .orderBy(desc(incidentStatusHistoryTable.changedAt))

  // Get assigned to user if exists
  let assignedToUser = undefined
  if (incident.assignedTo) {
    const [user] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, incident.assignedTo))
      .limit(1)

    if (user) {
      assignedToUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    }
  }

  // Get changed by users for status history
  const changedByUserIds = [
    ...new Set(statusHistory.map((h) => h.changedBy).filter(Boolean) as string[])
  ]
  let userMap = new Map()
  if (changedByUserIds.length > 0) {
    const users = await db
      .select()
      .from(userProfilesTable)
      .where(inArray(userProfilesTable.id, changedByUserIds))

    userMap = new Map(users.map((u) => [u.id, u]))
  }

  return {
    ...incident,
    property: {
      id: property.id,
      name: property.name,
      streetAddress: property.streetAddress,
      suburb: property.suburb,
      province: property.province
    },
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email
        }
      : {
          id: "",
          name: incident.submittedName || "Anonymous",
          email: null
        },
    attachments,
    statusHistory: statusHistory.map((h) => ({
      ...h,
      changedByUser: h.changedBy
        ? {
            id: h.changedBy,
            firstName: userMap.get(h.changedBy)?.firstName || null,
            lastName: userMap.get(h.changedBy)?.lastName || null,
            email: userMap.get(h.changedBy)?.email || ""
          }
        : undefined
    })),
    assignedToUser
  }
}

export async function getIncidentsByPropertyIdsQuery(
  propertyIds: string[]
): Promise<SelectIncident[]> {
  if (propertyIds.length === 0) {
    return []
  }

  const incidents = await db
    .select()
    .from(incidentsTable)
    .where(inArray(incidentsTable.propertyId, propertyIds))
    .orderBy(desc(incidentsTable.reportedAt))

  return incidents
}

/**
 * Get open incidents by phone number
 * Returns incidents that are not closed, submitted by the given phone number
 */
export async function getOpenIncidentsByPhoneNumberQuery(
  phoneNumber: string
): Promise<SelectIncident[]> {
  // Normalize phone number (remove +, spaces, dashes, etc.)
  const normalizedPhone = phoneNumber.replace(/\D/g, "").replace(/^0/, "27")
  
  // Query incidents where:
  // - submittedPhone matches (normalized or original format)
  // - status is NOT "closed"
  const incidents = await db
    .select()
    .from(incidentsTable)
    .where(
      and(
        ne(incidentsTable.status, "closed"),
        or(
          eq(incidentsTable.submittedPhone, phoneNumber),
          eq(incidentsTable.submittedPhone, normalizedPhone),
          ilike(incidentsTable.submittedPhone, `%${normalizedPhone}%`)
        )
      )
    )
    .orderBy(desc(incidentsTable.reportedAt))

  return incidents
}

/**
 * Get unified timeline for an incident
 * Aggregates messages, status changes, photo uploads, assignments, and quote activities
 */
export async function getIncidentTimelineQuery(
  incidentId: string,
  sessionId?: string,
  phoneNumber?: string
): Promise<IncidentTimelineItem[]> {
  const timelineItems: IncidentTimelineItem[] = []

  // Get incident creation
  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.id, incidentId))
    .limit(1)

  if (!incident) {
    return []
  }

  // Add incident creation as first timeline item
  timelineItems.push({
    id: `incident-created-${incident.id}`,
    timestamp: incident.reportedAt,
    type: "incident_created",
    actor: {
      type: incident.tenantId ? "tenant" : "user",
      name: incident.submittedName || "Anonymous"
    },
    content: `Incident reported: ${incident.title}`,
    metadata: {
      status: incident.status
    }
  })

  // Track photo URLs to avoid duplicates between messages and attachments
  const photoUrlsFromMessages = new Set<string>()

  // Get WhatsApp messages - prefer explicitly linked messages, fall back to time-window
  if (sessionId && phoneNumber) {
    const { getMessagesForIncidentQuery, getIncidentRelatedMessagesQuery } = await import("@/queries/whatsapp-messages-queries")

    // First try the new explicit linking query
    let messages = await getMessagesForIncidentQuery(incidentId)

    // Fall back to time-window query for backward compatibility (older messages)
    if (messages.length === 0) {
      messages = await getIncidentRelatedMessagesQuery(
        incidentId,
        phoneNumber,
        sessionId,
        incident.reportedAt,
        incident.updatedAt
      )
    }

    for (const message of messages) {
      // Add message to timeline
      const hasImage = message.mediaUrl && message.messageType === "image"
      if (hasImage && message.mediaUrl) {
        photoUrlsFromMessages.add(message.mediaUrl)
      }

      timelineItems.push({
        id: `message-${message.id}`,
        timestamp: message.timestamp,
        type: message.fromMe ? "system_message" : "message",
        actor: {
          type: message.fromMe ? "system" : "tenant",
          name: message.fromMe ? "System" : incident.submittedName || "Tenant"
        },
        content: message.content || (hasImage ? "Photo sent" : "Media attachment"),
        metadata: {
          messageId: message.id,
          fromMe: message.fromMe,
          photoUrl: hasImage ? message.mediaUrl : undefined,
          photoFileName: hasImage ? `attachment-${message.id}` : undefined
        }
      })
    }
  }

  // Get status history
  const statusHistory = await db
    .select()
    .from(incidentStatusHistoryTable)
    .where(eq(incidentStatusHistoryTable.incidentId, incidentId))
    .orderBy(desc(incidentStatusHistoryTable.changedAt))

  // Get users who changed status
  const changedByUserIds = [
    ...new Set(statusHistory.map((h) => h.changedBy).filter(Boolean) as string[])
  ]
  let userMap = new Map()
  if (changedByUserIds.length > 0) {
    const users = await db
      .select()
      .from(userProfilesTable)
      .where(inArray(userProfilesTable.id, changedByUserIds))

    userMap = new Map(users.map((u) => [u.id, u]))
  }

  // Track previous status for status changes
  // Status history is ordered by changedAt DESC, so we need to reverse to get chronological order
  // The first entry in the reversed array is the initial status (reported)
  let previousStatus: string | undefined = undefined
  const reversedHistory = [...statusHistory].reverse()
  
  for (let i = 0; i < reversedHistory.length; i++) {
    const statusEntry = reversedHistory[i]
    
    // For the first entry (initial status), there's no previous status
    if (i === 0) {
      previousStatus = undefined
    } else {
      // Previous status is the status from the previous entry
      previousStatus = reversedHistory[i - 1].status
    }
    const changedByUser = statusEntry.changedBy
      ? userMap.get(statusEntry.changedBy)
      : null

    timelineItems.push({
      id: `status-${statusEntry.id}`,
      timestamp: statusEntry.changedAt,
      type: "status_change",
      actor: changedByUser
        ? {
            type: "user",
            name: `${changedByUser.firstName || ""} ${changedByUser.lastName || ""}`.trim() || changedByUser.email,
            id: changedByUser.id
          }
        : {
            type: "system",
            name: "System"
          },
      content: previousStatus 
        ? statusEntry.notes || `Status changed from ${previousStatus} to ${statusEntry.status}`
        : statusEntry.notes || `Status set to ${statusEntry.status}`,
      metadata: {
        status: statusEntry.status,
        previousStatus: previousStatus
      }
    })

    // If status is "assigned", also add assignment item
    if (statusEntry.status === "assigned" && incident.assignedTo) {
      const assignedUser = userMap.get(incident.assignedTo) || await db
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, incident.assignedTo))
        .limit(1)
        .then(([u]) => u)

      if (assignedUser) {
        timelineItems.push({
          id: `assignment-${statusEntry.id}`,
          timestamp: statusEntry.changedAt,
          type: "assignment",
          actor: {
            type: "user",
            name: `${assignedUser.firstName || ""} ${assignedUser.lastName || ""}`.trim() || assignedUser.email,
            id: assignedUser.id
          },
          content: `Assigned to ${assignedUser.firstName || ""} ${assignedUser.lastName || ""}`.trim() || assignedUser.email,
          metadata: {
            assignedTo: assignedUser.id,
            assignedToName: `${assignedUser.firstName || ""} ${assignedUser.lastName || ""}`.trim() || assignedUser.email
          }
        })
      }
    }

    previousStatus = statusEntry.status
  }

  // Get photo uploads (from incident_attachments)
  // Only add photos that weren't already added from WhatsApp messages
  const attachments = await db
    .select()
    .from(incidentAttachmentsTable)
    .where(eq(incidentAttachmentsTable.incidentId, incidentId))
    .orderBy(desc(incidentAttachmentsTable.uploadedAt))

  for (const attachment of attachments) {
    // Skip if this photo URL was already added from a WhatsApp message
    if (photoUrlsFromMessages.has(attachment.fileUrl)) {
      continue
    }

    timelineItems.push({
      id: `attachment-${attachment.id}`,
      timestamp: attachment.uploadedAt,
      type: "photo_upload",
      actor: {
        type: "tenant",
        name: incident.submittedName || "Tenant"
      },
      content: `Photo uploaded: ${attachment.fileName}`,
      metadata: {
        photoUrl: attachment.fileUrl,
        photoFileName: attachment.fileName
      }
    })
  }

  // Get quote requests
  const quoteRequests = await db
    .select()
    .from(quoteRequestsTable)
    .where(eq(quoteRequestsTable.incidentId, incidentId))
    .orderBy(desc(quoteRequestsTable.requestedAt))

  const requestedByUserIds = [
    ...new Set(quoteRequests.map((qr) => qr.requestedBy).filter(Boolean) as string[])
  ]
  let quoteRequestUserMap = new Map()
  if (requestedByUserIds.length > 0) {
    const quoteRequestUsers = await db
      .select()
      .from(userProfilesTable)
      .where(inArray(userProfilesTable.id, requestedByUserIds))

    quoteRequestUserMap = new Map(quoteRequestUsers.map((u) => [u.id, u]))
  }

  for (const quoteRequest of quoteRequests) {
    const requestedByUser = quoteRequest.requestedBy
      ? quoteRequestUserMap.get(quoteRequest.requestedBy)
      : null

    timelineItems.push({
      id: `quote-request-${quoteRequest.id}`,
      timestamp: quoteRequest.requestedAt,
      type: "quote_request",
      actor: requestedByUser
        ? {
            type: "user",
            name: `${requestedByUser.firstName || ""} ${requestedByUser.lastName || ""}`.trim() || requestedByUser.email,
            id: requestedByUser.id
          }
        : {
            type: "system",
            name: "System"
          },
      content: `Quote requested${quoteRequest.notes ? `: ${quoteRequest.notes}` : ""}`,
      metadata: {
        quoteRequestId: quoteRequest.id
      }
    })

    // Get quotes for this request
    const quotes = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.quoteRequestId, quoteRequest.id))
      .orderBy(desc(quotesTable.submittedAt))

    for (const quote of quotes) {
      timelineItems.push({
        id: `quote-${quote.id}`,
        timestamp: quote.submittedAt,
        type: "quote_approval",
        actor: {
          type: "system",
          name: "Service Provider"
        },
        content: `Quote received: R${quote.amount}${quote.description ? ` - ${quote.description}` : ""}`,
        metadata: {
          quoteId: quote.id,
          quoteRequestId: quoteRequest.id,
          quoteAmount: parseFloat(quote.amount)
        }
      })
    }
  }

  // Sort all items by timestamp (oldest to newest)
  timelineItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return timelineItems
}
