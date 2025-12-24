import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { paymentInstructionsTable } from "./payment-instructions"

/**
 * Bank Accounts Schema
 *
 * Cached bank accounts from payment provider (e.g., Investec).
 * Accounts are synced from the provider API and cached locally.
 */
export const bankAccountsTable = pgTable("bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentInstructionId: uuid("payment_instruction_id")
    .references(() => paymentInstructionsTable.id, { onDelete: "cascade" })
    .notNull(),
  accountId: text("account_id").notNull(), // Investec account ID
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  // Cached from Investec API
  currentBalance: numeric("current_balance"),
  currency: text("currency").default("ZAR").notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertBankAccount = typeof bankAccountsTable.$inferInsert
export type SelectBankAccount = typeof bankAccountsTable.$inferSelect

