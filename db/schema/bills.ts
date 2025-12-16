import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { extractionRulesTable } from "./extraction-rules"
import { billTypeEnum, sourceEnum, statusEnum } from "./enums"

export const billsTable = pgTable("bills", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  billType: billTypeEnum("bill_type").notNull(),
  source: sourceEnum("source").notNull(),
  emailId: text("email_id"),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  rawText: text("raw_text"),
  extractedData: jsonb("extracted_data"),
  status: statusEnum("status").default("pending").notNull(),
  extractionRuleId: uuid("extraction_rule_id").references(() => extractionRulesTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertBill = typeof billsTable.$inferInsert
export type SelectBill = typeof billsTable.$inferSelect

