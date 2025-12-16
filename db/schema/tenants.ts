import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { userProfilesTable } from "./user-profiles"

export const tenantsTable = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, {
    onDelete: "set null"
  }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  leaseStartDate: timestamp("lease_start_date"),
  leaseEndDate: timestamp("lease_end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertTenant = typeof tenantsTable.$inferInsert
export type SelectTenant = typeof tenantsTable.$inferSelect

