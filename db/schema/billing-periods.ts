import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { tenantsTable } from "./tenants"
import { leaseAgreementsTable } from "./lease-agreements"
import { payableTemplatesTable } from "./payable-templates"
import { rentalInvoiceTemplatesTable } from "./rental-invoice-templates"

export const billingPeriodsTable = pgTable("billing_periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  tenantId: uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }), // Null for payables
  leaseAgreementId: uuid("lease_agreement_id").references(() => leaseAgreementsTable.id, {
    onDelete: "cascade"
  }), // For invoice periods
  payableTemplateId: uuid("payable_template_id").references(() => payableTemplatesTable.id, {
    onDelete: "cascade"
  }), // For payable periods - links to specific payable template
  rentalInvoiceTemplateId: uuid("rental_invoice_template_id").references(() => rentalInvoiceTemplatesTable.id, {
    onDelete: "cascade"
  }), // For invoice periods - links to specific rental invoice template
  periodType: text("period_type").notNull(), // 'invoice' | 'payable'
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(), // 1-12
  periodStartDate: timestamp("period_start_date").notNull(), // First day of period
  periodEndDate: timestamp("period_end_date").notNull(), // Last day of period
  scheduledPaymentDay: integer("scheduled_payment_day"), // 1-31, specific day of month for payment (for payables)
  scheduledGenerationDay: integer("scheduled_generation_day"), // 1-31, specific day of month for generation (for invoices)
  expectedBillTypes: jsonb("expected_bill_types"), // Array of bill types expected for this period
  generationSource: text("generation_source").notNull(), // 'lease_upload' | 'manual' | 'cron'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertBillingPeriod = typeof billingPeriodsTable.$inferInsert
export type SelectBillingPeriod = typeof billingPeriodsTable.$inferSelect

