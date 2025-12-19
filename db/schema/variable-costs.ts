import { numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { billsTable } from "./bills"
import { extractionRulesTable } from "./extraction-rules"
import { variableCostTypeEnum } from "./enums"

export const variableCostsTable = pgTable("variable_costs", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  billId: uuid("bill_id")
    .references(() => billsTable.id, { onDelete: "cascade" })
    .notNull(), // Source document
  costType: variableCostTypeEnum("cost_type").notNull(),
  amount: numeric("amount").notNull(), // Extracted amount
  usage: numeric("usage"), // Optional: kWh, liters, etc.
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  readingDate: timestamp("reading_date"),
  extractionRuleId: uuid("extraction_rule_id").references(() => extractionRulesTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertVariableCost = typeof variableCostsTable.$inferInsert
export type SelectVariableCost = typeof variableCostsTable.$inferSelect

