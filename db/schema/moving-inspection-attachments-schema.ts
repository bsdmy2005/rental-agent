import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { movingInspectionsTable } from "./moving-inspections-schema"
import { movingInspectionItemsTable } from "./moving-inspection-items-schema"
import { movingInspectionDefectsTable } from "./moving-inspection-defects-schema"
import { attachmentTypeEnum } from "./enums"

export const movingInspectionAttachmentsTable = pgTable("moving_inspection_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  inspectionId: uuid("inspection_id")
    .references(() => movingInspectionsTable.id, { onDelete: "cascade" })
    .notNull(),
  itemId: uuid("item_id")
    .references(() => movingInspectionItemsTable.id, { onDelete: "cascade" }),
  defectId: uuid("defect_id")
    .references(() => movingInspectionDefectsTable.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  attachmentType: attachmentTypeEnum("attachment_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertMovingInspectionAttachment = typeof movingInspectionAttachmentsTable.$inferInsert
export type SelectMovingInspectionAttachment = typeof movingInspectionAttachmentsTable.$inferSelect

