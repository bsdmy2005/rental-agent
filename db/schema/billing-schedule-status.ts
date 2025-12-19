import { integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { billingSchedulesTable } from "./billing-schedules"
import { billsTable } from "./bills"
import { scheduleStatusEnum } from "./enums"

/**
 * Billing Schedule Status Schema
 * 
 * Tracks compliance for each billing schedule per period (year/month).
 * Links actual bills/invoices/payables to their expected schedules.
 * 
 * Status flow:
 * - pending: Expected date hasn't arrived yet
 * - on_time: Bill/invoice/payable arrived/generated on or before expected date
 * - late: Bill/invoice/payable arrived/generated after expected date
 * - missed: Expected date passed and no bill/invoice/payable was received/generated
 */
export const billingScheduleStatusTable = pgTable("billing_schedule_status", {
  id: uuid("id").defaultRandom().primaryKey(),
  scheduleId: uuid("schedule_id")
    .references(() => billingSchedulesTable.id, { onDelete: "cascade" })
    .notNull(),
  periodYear: integer("period_year").notNull(), // e.g. 2025
  periodMonth: integer("period_month").notNull(), // 1-12 (January = 1, December = 12)
  expectedDate: timestamp("expected_date").notNull(), // Calculated from schedule's expectedDayOfMonth/Week
  actualDate: timestamp("actual_date"), // When bill was received/uploaded or invoice/payable was generated
  status: scheduleStatusEnum("status").default("pending").notNull(),
  billId: uuid("bill_id").references(() => billsTable.id), // For bill_input schedules
  invoiceId: uuid("invoice_id"), // Future: FK to invoices table
  payableId: uuid("payable_id"), // Future: FK to payables table
  daysLate: integer("days_late"), // Calculated: difference in days between actualDate and expectedDate
  blockedBy: jsonb("blocked_by"), // JSONB array of schedule IDs that are blocking this schedule (when status is 'blocked')
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertBillingScheduleStatus = typeof billingScheduleStatusTable.$inferInsert
export type SelectBillingScheduleStatus = typeof billingScheduleStatusTable.$inferSelect

