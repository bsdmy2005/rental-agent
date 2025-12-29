import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { whatsappSessionsTable } from "./whatsapp-sessions"

export const whatsappContactsTable = pgTable("whatsapp_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => whatsappSessionsTable.id, { onDelete: "cascade" })
    .notNull(),

  // Contact information
  phoneNumber: text("phone_number").notNull(), // Normalized format: 27...
  displayName: text("display_name"),
  notes: text("notes"),

  // Organization
  isFavorite: boolean("is_favorite").default(false).notNull(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertWhatsappContact = typeof whatsappContactsTable.$inferInsert
export type SelectWhatsappContact = typeof whatsappContactsTable.$inferSelect

