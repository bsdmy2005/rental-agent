import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { movingInspectionsTable } from "./moving-inspections-schema"
import { extractionStatusEnum } from "./enums"

export const movingInspectionDocumentsTable = pgTable("moving_inspection_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  inspectionId: uuid("inspection_id")
    .references(() => movingInspectionsTable.id, { onDelete: "cascade" })
    .notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  extractionStatus: extractionStatusEnum("extraction_status").default("pending").notNull(),
  extractedData: jsonb("extracted_data"), // For extracted checklist data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertMovingInspectionDocument = typeof movingInspectionDocumentsTable.$inferInsert
export type SelectMovingInspectionDocument = typeof movingInspectionDocumentsTable.$inferSelect

