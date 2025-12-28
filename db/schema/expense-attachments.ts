import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { expensesTable } from "./expenses"

export const expenseAttachmentsTable = pgTable("expense_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  expenseId: uuid("expense_id")
    .references(() => expensesTable.id, { onDelete: "cascade" })
    .notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // image, pdf, etc.
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertExpenseAttachment = typeof expenseAttachmentsTable.$inferInsert
export type SelectExpenseAttachment = typeof expenseAttachmentsTable.$inferSelect

