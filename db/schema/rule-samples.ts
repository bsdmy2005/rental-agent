import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { extractionRulesTable } from "./extraction-rules"

export const ruleSamplesTable = pgTable("rule_samples", {
  id: uuid("id").defaultRandom().primaryKey(),
  extractionRuleId: uuid("extraction_rule_id")
    .references(() => extractionRulesTable.id, { onDelete: "cascade" })
    .notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(), // Supabase storage URL
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertRuleSample = typeof ruleSamplesTable.$inferInsert
export type SelectRuleSample = typeof ruleSamplesTable.$inferSelect

