import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"
import { propertiesTable } from "./properties"
import { billTypeEnum, channelEnum } from "./enums"

/**
 * Extraction Rules Schema
 * 
 * Rules are property-specific. Each property has its own set of rules for different bill types.
 * Each rule can extract for invoice generation, payment processing, or both.
 * A single rule processes one bill type and can produce both outputs.
 * 
 * Key relationships:
 * - Property → Rules: One-to-many, property-specific only
 * - Rule → Outputs: One rule can produce invoice output, payment output, or both
 * - Each output type has its own extraction configuration
 */
export const extractionRulesTable = pgTable("extraction_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id")
    .references(() => userProfilesTable.id, { onDelete: "cascade" })
    .notNull(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(), // Property-specific only
  name: text("name").notNull(),
  // Output type flags: at least one must be true
  extractForInvoice: boolean("extract_for_invoice").default(false).notNull(),
  extractForPayment: boolean("extract_for_payment").default(false).notNull(),
  billType: billTypeEnum("bill_type").notNull(),
  channel: channelEnum("channel").notNull(),
  emailFilter: jsonb("email_filter"),
  // Separate extraction configs for each output type
  invoiceExtractionConfig: jsonb("invoice_extraction_config"), // Used if extractForInvoice = true
  paymentExtractionConfig: jsonb("payment_extraction_config"), // Used if extractForPayment = true
  // Custom instructions/prompts for extraction (optional, falls back to defaults if not provided)
  invoiceInstruction: text("invoice_instruction"), // Custom instruction for invoice extraction
  paymentInstruction: text("payment_instruction"), // Custom instruction for payment extraction
  emailProcessingInstruction: text("email_processing_instruction"), // Custom instruction for AI to guide email processing (attachments vs links, file selection)
  isActive: boolean("is_active").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertExtractionRule = typeof extractionRulesTable.$inferInsert
export type SelectExtractionRule = typeof extractionRulesTable.$inferSelect

