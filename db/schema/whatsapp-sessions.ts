import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"
import { incidentsTable } from "./incidents"
import { whatsappConnectionStatusEnum } from "./enums"

export const whatsappSessionsTable = pgTable("whatsapp_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id")
    .references(() => userProfilesTable.id, { onDelete: "cascade" })
    .notNull(),

  // Session identification
  sessionName: text("session_name").notNull().default("default"),
  phoneNumber: text("phone_number"),

  // Connection state
  connectionStatus: whatsappConnectionStatusEnum("connection_status")
    .notNull()
    .default("disconnected"),
  lastConnectedAt: timestamp("last_connected_at"),
  lastDisconnectedAt: timestamp("last_disconnected_at"),

  // Auth state (Baileys credentials and keys - stored as JSON)
  authState: jsonb("auth_state"),

  // Configuration
  isActive: boolean("is_active").notNull().default(true),
  // Auto-connect on server startup (only for primary sessions)
  autoConnect: boolean("auto_connect").notNull().default(true),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export const whatsappExplorerMessagesTable = pgTable("whatsapp_explorer_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => whatsappSessionsTable.id, { onDelete: "cascade" })
    .notNull(),

  // Message details
  messageId: text("message_id").notNull(),
  remoteJid: text("remote_jid").notNull(),
  fromMe: boolean("from_me").notNull(),
  messageType: text("message_type").notNull(),
  content: text("content"),
  mediaUrl: text("media_url"),

  // Status tracking
  status: text("status"),
  statusUpdatedAt: timestamp("status_updated_at"),

  // Timestamps
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),

  // Explicit incident linking (user-confirmed)
  incidentId: uuid("incident_id").references(() => incidentsTable.id, {
    onDelete: "set null"
  }),

  // Message classification for audit/display
  // Values: "incident_report", "follow_up", "closure_confirmation", "general", null
  messageClassification: text("message_classification"),

  // When classification was set
  classifiedAt: timestamp("classified_at")
})

export type InsertWhatsappSession = typeof whatsappSessionsTable.$inferInsert
export type SelectWhatsappSession = typeof whatsappSessionsTable.$inferSelect
export type InsertWhatsappExplorerMessage =
  typeof whatsappExplorerMessagesTable.$inferInsert
export type SelectWhatsappExplorerMessage =
  typeof whatsappExplorerMessagesTable.$inferSelect
