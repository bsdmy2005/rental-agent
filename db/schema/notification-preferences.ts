import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"

export const notificationPreferencesTable = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id")
    .references(() => userProfilesTable.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  notifyEmail: boolean("notify_email").default(true).notNull(),
  notifyWhatsapp: boolean("notify_whatsapp").default(true).notNull(),
  notifyNewIncidents: boolean("notify_new_incidents").default(true).notNull(),
  notifyUpdates: boolean("notify_updates").default(true).notNull(),
  notifyUrgentOnly: boolean("notify_urgent_only").default(false).notNull(),
  whatsappPhone: text("whatsapp_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertNotificationPreference = typeof notificationPreferencesTable.$inferInsert
export type SelectNotificationPreference = typeof notificationPreferencesTable.$inferSelect
