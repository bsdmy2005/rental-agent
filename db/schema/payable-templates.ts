import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"

/**
 * Payable Templates Schema
 * 
 * User-defined templates representing payable types.
 * Templates define the structure/type of payables that need to be generated for a property.
 * Payable instances are created from these templates.
 * 
 * Key relationships:
 * - Property → Payable Templates: One-to-many
 * - Payable Template → Bill Templates: Many-to-many (via dependsOnBillTemplateIds)
 * - Payable Template → Payable Instances: One-to-many
 */
export const payableTemplatesTable = pgTable("payable_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(), // User-defined name, e.g., "Body Corporate Levy Payment"
  description: text("description"), // Optional description
  // Dependencies: which bill templates must arrive before generating payable
  dependsOnBillTemplateIds: jsonb("depends_on_bill_template_ids").notNull(), // Array of bill template IDs
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertPayableTemplate = typeof payableTemplatesTable.$inferInsert
export type SelectPayableTemplate = typeof payableTemplatesTable.$inferSelect

