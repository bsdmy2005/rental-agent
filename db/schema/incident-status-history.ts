import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { incidentsTable } from "./incidents"
import { userProfilesTable } from "./user-profiles"
import { incidentStatusEnum } from "./enums"

export const incidentStatusHistoryTable = pgTable("incident_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id")
    .references(() => incidentsTable.id, { onDelete: "cascade" })
    .notNull(),
  status: incidentStatusEnum("status").notNull(),
  changedBy: uuid("changed_by").references(() => userProfilesTable.id, {
    onDelete: "set null"
  }),
  notes: text("notes"), // Optional notes about the status change
  changedAt: timestamp("changed_at").defaultNow().notNull()
})

export type InsertIncidentStatusHistory = typeof incidentStatusHistoryTable.$inferInsert
export type SelectIncidentStatusHistory = typeof incidentStatusHistoryTable.$inferSelect

