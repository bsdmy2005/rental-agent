import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { incidentsTable } from "./incidents"

export const incidentAttachmentsTable = pgTable("incident_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id")
    .references(() => incidentsTable.id, { onDelete: "cascade" })
    .notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // image, pdf, etc.
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertIncidentAttachment = typeof incidentAttachmentsTable.$inferInsert
export type SelectIncidentAttachment = typeof incidentAttachmentsTable.$inferSelect

