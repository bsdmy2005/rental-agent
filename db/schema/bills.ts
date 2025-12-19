import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { extractionRulesTable } from "./extraction-rules"
import { billTypeEnum, sourceEnum, statusEnum } from "./enums"

/**
 * Bills Schema
 * 
 * Bills represent input documents (municipality bills, levy statements, utility bills) 
 * that are processed to extract data for two purposes:
 * 1. Invoice Generation: Tenant-chargeable items (water, electricity, etc.)
 * 2. Payment Processing: Landlord-payable items (levies, fees, etc.)
 * 
 * Dual-purpose extraction:
 * - Each bill can be processed by one or two rules
 * - invoiceRuleId and paymentRuleId can be the SAME rule if that rule extracts for both purposes
 * - Each rule uses its respective extraction config (invoiceExtractionConfig or paymentExtractionConfig)
 * 
 * Key relationships:
 * - Property → Bills: One-to-many, multiple bill types per property
 * - Bill → Rules: Many-to-many (one invoice rule + one payment rule, can be same rule)
 * - Bill → Outputs: One-to-two (invoice data + payment data)
 */
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
  extractedData: jsonb("extracted_data"), // Legacy field, kept for backward compatibility
  invoiceExtractionData: jsonb("invoice_extraction_data"), // Tenant-chargeable items
  paymentExtractionData: jsonb("payment_extraction_data"), // Landlord-payable items
  status: statusEnum("status").default("pending").notNull(),
  // Track which rules were used for extraction (can be same rule for both purposes)
  invoiceRuleId: uuid("invoice_rule_id").references(() => extractionRulesTable.id), // Rule used for invoice extraction
  paymentRuleId: uuid("payment_rule_id").references(() => extractionRulesTable.id), // Rule used for payment extraction
  extractionRuleId: uuid("extraction_rule_id").references(() => extractionRulesTable.id), // Legacy field, kept for backward compatibility
  // Billing period: year and month (1-12) for monthly bills
  // Used to prevent duplicate uploads and organize bills by period
  billingYear: integer("billing_year"), // e.g. 2025
  billingMonth: integer("billing_month"), // 1-12 (January = 1, December = 12)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertBill = typeof billsTable.$inferInsert
export type SelectBill = typeof billsTable.$inferSelect

