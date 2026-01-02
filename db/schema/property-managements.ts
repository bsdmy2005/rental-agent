import { boolean, numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { rentalAgentsTable } from "./rental-agents"
import { rentalAgenciesTable } from "./rental-agencies-schema"

export const propertyManagementsTable = pgTable("property_managements", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  rentalAgentId: uuid("rental_agent_id").references(() => rentalAgentsTable.id, {
    onDelete: "cascade"
  }),
  agencyId: uuid("agency_id").references(() => rentalAgenciesTable.id, {
    onDelete: "cascade"
  }),
  managementFee: numeric("management_fee"),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertPropertyManagement = typeof propertyManagementsTable.$inferInsert
export type SelectPropertyManagement = typeof propertyManagementsTable.$inferSelect

