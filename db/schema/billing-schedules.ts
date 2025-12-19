import { boolean, integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { extractionRulesTable } from "./extraction-rules"
import { billTypeEnum, scheduleTypeEnum, frequencyEnum, scheduleSourceEnum } from "./enums"

/**
 * Billing Schedules Schema
 * 
 * Defines expected billing patterns per property:
 * - Bill Input Schedules: When bills are expected to arrive (one per bill type)
 * - Invoice Output Schedules: When invoices should be sent to tenants
 * - Payable Output Schedules: When payables should be processed
 * 
 * Each schedule defines:
 * - Frequency (monthly, weekly, once)
 * - Expected day of month/week
 * - Associated extraction rule (for bill inputs)
 * - Email filter (for bill inputs to match incoming emails)
 */
export const billingSchedulesTable = pgTable("billing_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  scheduleType: scheduleTypeEnum("schedule_type").notNull(), // 'bill_input' | 'invoice_output' | 'payable_output'
  billType: billTypeEnum("bill_type"), // Only for 'bill_input' schedules
  source: scheduleSourceEnum("source").default("manual_upload").notNull(), // 'manual_upload' | 'email' | 'agentic'
  frequency: frequencyEnum("frequency").notNull(), // 'monthly' | 'weekly' | 'once'
  expectedDayOfMonth: integer("expected_day_of_month"), // 1-31 for monthly schedules
  expectedDayOfWeek: integer("expected_day_of_week"), // 0-6 for weekly schedules (Sunday=0)
  isActive: boolean("is_active").default(true).notNull(),
  extractionRuleId: uuid("extraction_rule_id").references(() => extractionRulesTable.id), // For bill_input schedules
  emailFilter: jsonb("email_filter"), // JSONB for email matching (from, subject) - only used when source is 'email'
  // Dependency configuration (for invoice_output and payable_output schedules)
  waitForBills: boolean("wait_for_bills").default(false).notNull(), // Whether to wait for bills before generating invoices/payables
  dependsOnBillSchedules: jsonb("depends_on_bill_schedules"), // JSONB array of schedule IDs that this schedule depends on
  dependencyLogic: jsonb("dependency_logic"), // JSONB configuration for dependency rules (e.g., wait for all bills, wait for specific bill types)
  nextExpectedDate: timestamp("next_expected_date"), // Calculated next expected date for this schedule (updated when schedule is created/updated)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertBillingSchedule = typeof billingSchedulesTable.$inferInsert
export type SelectBillingSchedule = typeof billingSchedulesTable.$inferSelect

