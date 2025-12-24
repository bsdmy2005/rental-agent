import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { tenantsTable } from "./tenants"
import { rentalInvoiceTemplatesTable } from "./rental-invoice-templates"

/**
 * Rental Invoice Instances Schema
 * 
 * Actual invoices generated from rental invoice templates.
 * Instances are generated when dependencies are met and generation day matches.
 * 
 * Key relationships:
 * - Rental Invoice Template → Rental Invoice Instances: One-to-many
 * - Property → Rental Invoice Instances: One-to-many
 * - Tenant → Rental Invoice Instances: One-to-many
 * - Bill Instances → Rental Invoice Instances: Many-to-many (via contributingBillIds)
 */
export const rentalInvoiceInstancesTable = pgTable("rental_invoice_instances", {
  id: uuid("id").defaultRandom().primaryKey(),
  rentalInvoiceTemplateId: uuid("rental_invoice_template_id")
    .references(() => rentalInvoiceTemplatesTable.id, { onDelete: "cascade" })
    .notNull(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  tenantId: uuid("tenant_id")
    .references(() => tenantsTable.id, { onDelete: "cascade" })
    .notNull(),
  periodYear: integer("period_year").notNull(), // e.g., 2025
  periodMonth: integer("period_month").notNull(), // 1-12
  // Status tracking
  status: text("status").default("pending").notNull(), // pending, ready, generated, sent
  // Contributing bills (instances that contributed to this invoice)
  contributingBillIds: jsonb("contributing_bill_ids"), // Array of bill instance IDs
  // Generated invoice data
  invoiceData: jsonb("invoice_data"), // Extracted invoice data from bills
  // PDF storage
  pdfUrl: text("pdf_url"), // URL of the PDF stored in Supabase
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertRentalInvoiceInstance = typeof rentalInvoiceInstancesTable.$inferInsert
export type SelectRentalInvoiceInstance = typeof rentalInvoiceInstancesTable.$inferSelect

