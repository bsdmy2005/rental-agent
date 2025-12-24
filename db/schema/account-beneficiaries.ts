import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { bankAccountsTable } from "./bank-accounts"
import { beneficiariesTable } from "./beneficiaries"

/**
 * Account-Beneficiary Associations Schema
 *
 * Links bank accounts to beneficiaries.
 * Payable templates select a bank account, which then determines available beneficiaries.
 */
export const accountBeneficiariesTable = pgTable("account_beneficiaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  bankAccountId: uuid("bank_account_id")
    .references(() => bankAccountsTable.id, { onDelete: "cascade" })
    .notNull(),
  beneficiaryId: uuid("beneficiary_id")
    .references(() => beneficiariesTable.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertAccountBeneficiary = typeof accountBeneficiariesTable.$inferInsert
export type SelectAccountBeneficiary = typeof accountBeneficiariesTable.$inferSelect

