import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"

export const rfqAttachmentsTable = pgTable("rfq_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  rfqCode: text("rfq_code").notNull(), // Shared across all quote requests with the same RFQ code
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // "pdf" | "image"
  fileSize: integer("file_size"), // bytes
  uploadedBy: uuid("uploaded_by")
    .references(() => userProfilesTable.id, { onDelete: "set null" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertRfqAttachment = typeof rfqAttachmentsTable.$inferInsert
export type SelectRfqAttachment = typeof rfqAttachmentsTable.$inferSelect

