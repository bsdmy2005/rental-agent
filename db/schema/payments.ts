import { jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { payableInstancesTable } from "./payable-instances"
import { bankAccountsTable } from "./bank-accounts"
import { beneficiariesTable } from "./beneficiaries"

/**
 * Payments Schema
 *
 * Tracks executed payments for payable instances.
 * Links to bank account, beneficiary, and payable instance.
 */
export const paymentsTable = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  payableInstanceId: uuid("payable_instance_id")
    .references(() => payableInstancesTable.id, { onDelete: "cascade" })
    .notNull(),
  bankAccountId: uuid("bank_account_id")
    .references(() => bankAccountsTable.id, { onDelete: "cascade" })
    .notNull(),
  beneficiaryId: uuid("beneficiary_id")
    .references(() => beneficiariesTable.id, { onDelete: "cascade" })
    .notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").default("ZAR").notNull(),
  myReference: text("my_reference").notNull(),
  theirReference: text("their_reference").notNull(),
  status: text("status").default("pending").notNull(), // pending, processing, completed, failed
  investecTransactionId: text("investec_transaction_id"),
  investecResponse: jsonb("investec_response"), // Full API response
  errorMessage: text("error_message"),
  executedAt: timestamp("executed_at"),
  executedBy: text("executed_by"), // User ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertPayment = typeof paymentsTable.$inferInsert
export type SelectPayment = typeof paymentsTable.$inferSelect

