import { numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { variableCostsTable } from "./variable-costs"
import { tenantsTable } from "./tenants"

export const variableCostAllocationsTable = pgTable("variable_cost_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  variableCostId: uuid("variable_cost_id")
    .references(() => variableCostsTable.id, { onDelete: "cascade" })
    .notNull(),
  tenantId: uuid("tenant_id")
    .references(() => tenantsTable.id, { onDelete: "cascade" })
    .notNull(),
  amount: numeric("amount").notNull(), // Allocated amount for this tenant
  rentalAmount: numeric("rental_amount").notNull(), // Tenant's rent at allocation time
  totalRentalAmount: numeric("total_rental_amount").notNull(), // Total rent on property
  allocationRatio: numeric("allocation_ratio").notNull(), // rentalAmount / totalRentalAmount
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertVariableCostAllocation = typeof variableCostAllocationsTable.$inferInsert
export type SelectVariableCostAllocation = typeof variableCostAllocationsTable.$inferSelect

