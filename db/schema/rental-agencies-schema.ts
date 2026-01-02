import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"

export const rentalAgenciesTable = pgTable("rental_agencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerUserProfileId: uuid("owner_user_profile_id")
    .references(() => userProfilesTable.id, { onDelete: "cascade" })
    .notNull(),
  licenseNumber: text("license_number"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertRentalAgency = typeof rentalAgenciesTable.$inferInsert
export type SelectRentalAgency = typeof rentalAgenciesTable.$inferSelect

