import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { payableTemplatesTable } from "./payable-templates"

/**
 * Payable Instances Schema
 * 
 * Actual payables generated from payable templates.
 * Each instance has a scheduled date (single specific date for payment).
 * Instances are generated based on schedule pattern and dependencies.
 * 
 * Key relationships:
 * - Payable Template → Payable Instances: One-to-many
 * - Property → Payable Instances: One-to-many
 * - Bill Instances → Payable Instances: Many-to-many (via contributingBillIds)
 */
export const payableInstancesTable = pgTable("payable_instances", {
  id: uuid("id").defaultRandom().primaryKey(),
  payableTemplateId: uuid("payable_template_id")
    .references(() => payableTemplatesTable.id, { onDelete: "cascade" })
    .notNull(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(), // Single specific date for payment
  periodYear: integer("period_year").notNull(), // e.g., 2025
  periodMonth: integer("period_month").notNull(), // 1-12
  // Status tracking
  status: text("status").default("pending").notNull(), // pending, ready, generated, paid
  // Contributing bills (instances that contributed to this payable)
  contributingBillIds: jsonb("contributing_bill_ids"), // Array of bill instance IDs
  // Generated payable data
  payableData: jsonb("payable_data"), // Extracted payment data from bills
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertPayableInstance = typeof payableInstancesTable.$inferInsert
export type SelectPayableInstance = typeof payableInstancesTable.$inferSelect

