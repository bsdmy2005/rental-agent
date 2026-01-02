import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { tenantsTable } from "./tenants"

/**
 * Rental Invoice Templates Schema
 * 
 * ONE template per tenant per property.
 * Independent template that specifies which bill templates must arrive before generating invoices.
 * Each template has a schedule (single day per month for generation).
 * 
 * Key relationships:
 * - Property → Rental Invoice Templates: One-to-many
 * - Tenant → Rental Invoice Templates: One-to-one (unique constraint)
 * - Bill Templates → Rental Invoice Templates: Many-to-many (via dependsOnBillTemplateIds)
 * - Rental Invoice Template → Rental Invoice Instances: One-to-many
 */
export const rentalInvoiceTemplatesTable = pgTable(
  "rental_invoice_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .references(() => propertiesTable.id, { onDelete: "cascade" })
      .notNull(),
    tenantId: uuid("tenant_id")
      .references(() => tenantsTable.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(), // User-defined name, e.g., "Monthly Rental Invoice"
    description: text("description"), // Optional description
    // Dependencies: which bill templates must arrive before generating invoice
    dependsOnBillTemplateIds: jsonb("depends_on_bill_template_ids").notNull(), // Array of bill template IDs
    // Schedule: single day per month for generation
    generationDayOfMonth: integer("generation_day_of_month").notNull(), // 1-31, e.g., 5 for 5th of month
    // PDF Template selection: "classic", "modern", or "minimal"
    pdfTemplate: text("pdf_template").default("classic").notNull(), // PDF template style
    // Fixed line items that appear on every invoice generated from this template
    fixedLineItems: jsonb("fixed_line_items"), // Array of FixedLineItem objects
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => {
    return {
      // Ensure only one template per tenant per property
      uniqueTenantProperty: unique().on(table.tenantId, table.propertyId)
    }
  }
)

export type InsertRentalInvoiceTemplate = typeof rentalInvoiceTemplatesTable.$inferInsert
export type SelectRentalInvoiceTemplate = typeof rentalInvoiceTemplatesTable.$inferSelect

