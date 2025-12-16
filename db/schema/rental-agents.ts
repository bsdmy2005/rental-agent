import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"

export const rentalAgentsTable = pgTable("rental_agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id")
    .references(() => userProfilesTable.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  agencyName: text("agency_name"),
  licenseNumber: text("license_number"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertRentalAgent = typeof rentalAgentsTable.$inferInsert
export type SelectRentalAgent = typeof rentalAgentsTable.$inferSelect

