import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { tenantsTable } from "./tenants"
import { fixedCostTypeEnum } from "./enums"

export const fixedCostsTable = pgTable("fixed_costs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenantsTable.id, { onDelete: "cascade" })
    .notNull(),
  costType: fixedCostTypeEnum("cost_type").notNull(),
  amount: numeric("amount").notNull(), // Monthly amount (pre-calculated by user)
  description: text("description"), // For "other" type or additional notes
  isActive: boolean("is_active").default(true).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"), // Optional end date
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertFixedCost = typeof fixedCostsTable.$inferInsert
export type SelectFixedCost = typeof fixedCostsTable.$inferSelect

