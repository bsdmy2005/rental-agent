import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { extractionRulesTable } from "./extraction-rules"
import { billTypeEnum } from "./enums"

/**
 * Bill Templates Schema
 * 
 * User-defined templates representing expected input document types.
 * Templates define the structure/type of documents (bills) that are expected for a property.
 * Actual bills are instances of these templates.
 * 
 * Key relationships:
 * - Property → Bill Templates: One-to-many
 * - Bill Template → Extraction Rule: Many-to-one (optional, for organization)
 * - Bill Template → Bills: One-to-many (bills are instances)
 */
export const billTemplatesTable = pgTable("bill_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(), // User-defined name, e.g., "City of Cape Town Water Bill"
  billType: billTypeEnum("bill_type").notNull(), // municipality, levy, utility, other
  extractionRuleId: uuid("extraction_rule_id")
    .references(() => extractionRulesTable.id, { onDelete: "set null" }), // Optional - template references rule
  description: text("description"), // Optional description
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertBillTemplate = typeof billTemplatesTable.$inferInsert
export type SelectBillTemplate = typeof billTemplatesTable.$inferSelect

