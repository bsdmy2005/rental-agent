import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { expenseCategoriesTable } from "./expense-categories"
import { userProfilesTable } from "./user-profiles"

export const expensesTable = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  categoryId: uuid("category_id")
    .references(() => expenseCategoriesTable.id, { onDelete: "restrict" })
    .notNull(),
  amount: numeric("amount").notNull(),
  description: text("description").notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  paidBy: uuid("paid_by").references(() => userProfilesTable.id, {
    onDelete: "set null"
  }), // Landlord or agent who paid
  paymentMethod: text("payment_method"), // cash, bank_transfer, credit_card, etc.
  isTaxDeductible: boolean("is_tax_deductible").default(true).notNull(),
  taxYear: integer("tax_year"), // Tax year for grouping (e.g., 2025)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertExpense = typeof expensesTable.$inferInsert
export type SelectExpense = typeof expensesTable.$inferSelect

