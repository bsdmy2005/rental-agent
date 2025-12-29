import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { incidentsTable } from "./incidents"
import { userProfilesTable } from "./user-profiles"
import { incidentAuthorTypeEnum } from "./enums"

/**
 * Table for storing comments on incidents from various authors.
 * Comments can come from tenants, agents, landlords, or the system.
 */
export const incidentCommentsTable = pgTable("incident_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id")
    .references(() => incidentsTable.id, { onDelete: "cascade" })
    .notNull(),
  authorType: incidentAuthorTypeEnum("author_type").notNull(),
  authorId: uuid("author_id").references(() => userProfilesTable.id, {
    onDelete: "set null"
  }),
  authorPhone: text("author_phone"),
  authorName: text("author_name"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertIncidentComment = typeof incidentCommentsTable.$inferInsert
export type SelectIncidentComment = typeof incidentCommentsTable.$inferSelect
