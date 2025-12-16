import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"
import { statusEnum } from "./enums"

export const emailProcessorsTable = pgTable("email_processors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id")
    .references(() => userProfilesTable.id, { onDelete: "cascade" })
    .notNull(),
  postmarkMessageId: text("postmark_message_id").notNull(),
  from: text("from").notNull(),
  subject: text("subject"),
  receivedAt: timestamp("received_at").notNull(),
  hasAttachments: boolean("has_attachments").default(false).notNull(),
  processedAt: timestamp("processed_at"),
  status: statusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertEmailProcessor = typeof emailProcessorsTable.$inferInsert
export type SelectEmailProcessor = typeof emailProcessorsTable.$inferSelect

