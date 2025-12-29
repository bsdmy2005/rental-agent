/**
 * Timeline item types for incident history
 */

export interface IncidentTimelineItem {
  id: string
  timestamp: Date
  type:
    | "message"
    | "status_change"
    | "photo_upload"
    | "assignment"
    | "quote_request"
    | "quote_approval"
    | "system_message"
    | "incident_created"
  actor?: {
    type: "user" | "system" | "tenant"
    name: string
    id?: string
  }
  content: string
  metadata?: {
    status?: string
    previousStatus?: string
    photoUrl?: string
    photoFileName?: string
    assignedTo?: string
    assignedToName?: string
    quoteAmount?: number
    quoteRequestId?: string
    quoteId?: string
    messageId?: string
    fromMe?: boolean
  }
}

