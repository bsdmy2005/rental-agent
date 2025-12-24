import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { paymentInstructionsTable } from "./payment-instructions"

/**
 * Beneficiaries Schema
 *
 * Cached beneficiaries from payment provider (e.g., Investec).
 * Beneficiaries are synced from the provider API and cached locally.
 * Only beneficiaries that have been set up via online banking can be used for payments.
 */
export const beneficiariesTable = pgTable("beneficiaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentInstructionId: uuid("payment_instruction_id")
    .references(() => paymentInstructionsTable.id, { onDelete: "cascade" })
    .notNull(),
  beneficiaryId: text("beneficiary_id").notNull(), // Investec beneficiary ID - this is the key field for payments
  name: text("name").notNull(),
  bankAccountNumber: text("bank_account_number"), // Optional - beneficiary is already authenticated by Investec
  bankCode: text("bank_code"), // Optional - beneficiary is already authenticated by Investec
  beneficiaryType: text("beneficiary_type"),
  // Cached from Investec API
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertBeneficiary = typeof beneficiariesTable.$inferInsert
export type SelectBeneficiary = typeof beneficiariesTable.$inferSelect

