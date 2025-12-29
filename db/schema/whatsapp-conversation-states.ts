import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { whatsappSessionsTable } from "./whatsapp-sessions"
import { incidentsTable } from "./incidents"
import { whatsappConversationStateEnum } from "./enums"

/**
 * Tracks conversation state for WhatsApp incident reporting flow.
 * Each phone number can have one active conversation state at a time.
 * The state machine guides users through the incident reporting process.
 */
export const whatsappConversationStatesTable = pgTable(
  "whatsapp_conversation_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Unique identifier - one state per phone number
    phoneNumber: text("phone_number").notNull().unique(),

    // Link to the WhatsApp session handling this conversation
    sessionId: uuid("session_id").references(() => whatsappSessionsTable.id, {
      onDelete: "cascade"
    }),

    // Current state in the conversation flow
    state: whatsappConversationStateEnum("state").default("idle").notNull(),

    // Link to incident being created/managed (if applicable)
    incidentId: uuid("incident_id").references(() => incidentsTable.id, {
      onDelete: "set null"
    }),

    // Contextual data for the conversation (varies by state)
    context: jsonb("context").$type<{
      tenantId?: string
      propertyId?: string
      propertyName?: string
      tenantName?: string
      partialDescription?: string
      pendingAttachments?: Array<{ url: string; type: string; fileName: string }>
      email?: string
      otpCode?: string
      otpExpiresAt?: string
    }>(),

    // Auto-expiration for abandoned conversations
    expiresAt: timestamp("expires_at").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  }
)

export type InsertWhatsappConversationState =
  typeof whatsappConversationStatesTable.$inferInsert
export type SelectWhatsappConversationState =
  typeof whatsappConversationStatesTable.$inferSelect
