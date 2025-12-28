import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { emailProcessorsTable } from "./email-processors"
import { extractionRulesTable } from "./extraction-rules"
import { extractionJobStatusEnum, extractionJobLaneEnum } from "./enums"

export const extractionJobsTable = pgTable("extraction_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  emailProcessorId: uuid("email_processor_id")
    .references(() => emailProcessorsTable.id, { onDelete: "cascade" })
    .notNull(),
  extractionRuleId: uuid("extraction_rule_id")
    .references(() => extractionRulesTable.id, { onDelete: "set null" }),
  status: extractionJobStatusEnum("status").default("pending").notNull(),
  lane: extractionJobLaneEnum("lane").default("unknown").notNull(),
  trace: jsonb("trace"), // Detailed step-by-step logs with timestamps, decisions, and intermediate results
  result: jsonb("result"), // Extracted data, PDF URLs, etc.
  error: text("error"), // Error message if failed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertExtractionJob = typeof extractionJobsTable.$inferInsert
export type SelectExtractionJob = typeof extractionJobsTable.$inferSelect

