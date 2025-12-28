import { jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { quoteRequestsTable } from "./quote-requests"
import { quoteStatusEnum, quoteSubmissionMethodEnum } from "./enums"

export const quotesTable = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteRequestId: uuid("quote_request_id")
    .references(() => quoteRequestsTable.id, { onDelete: "cascade" })
    .notNull(),
  amount: numeric("amount").notNull(),
  description: text("description"),
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  status: quoteStatusEnum("status").default("quoted").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  // Submission tracking fields
  submissionCode: text("submission_code"), // Links to RFQ code used for submission
  submittedVia: quoteSubmissionMethodEnum("submitted_via").notNull().default("email"), // How quote was submitted
  extractedFrom: jsonb("extracted_from"), // JSON metadata: { source: "email" | "pdf" | "web", messageId?: string, fileName?: string }
  // Legacy fields for backward compatibility
  emailReplyId: text("email_reply_id"), // Link to email that contained the quote
  whatsappReplyId: text("whatsapp_reply_id") // Link to WhatsApp message that contained the quote
})

export type InsertQuote = typeof quotesTable.$inferInsert
export type SelectQuote = typeof quotesTable.$inferSelect

