import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"
import { expenseCategoryEnum } from "./enums"

export const expenseCategoriesTable = pgTable("expense_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: expenseCategoryEnum("category"), // Standard category from enum (null for custom categories)
  isStandard: boolean("is_standard").default(false).notNull(), // true for standard SA tax categories
  userId: uuid("user_id").references(() => userProfilesTable.id, {
    onDelete: "cascade"
  }), // For custom categories, null for standard categories
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertExpenseCategory = typeof expenseCategoriesTable.$inferInsert
export type SelectExpenseCategory = typeof expenseCategoriesTable.$inferSelect

