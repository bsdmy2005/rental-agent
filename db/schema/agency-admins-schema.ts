import { pgTable, timestamp, uuid, unique } from "drizzle-orm/pg-core"
import { rentalAgenciesTable } from "./rental-agencies-schema"
import { userProfilesTable } from "./user-profiles"
import { agencyAdminRoleEnum } from "./enums"

export const agencyAdminsTable = pgTable(
  "agency_admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id")
      .references(() => rentalAgenciesTable.id, { onDelete: "cascade" })
      .notNull(),
    userProfileId: uuid("user_profile_id")
      .references(() => userProfilesTable.id, { onDelete: "cascade" })
      .notNull(),
    role: agencyAdminRoleEnum("role").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => {
    return {
      uniqueAgencyUser: unique().on(table.agencyId, table.userProfileId)
    }
  }
)

export type InsertAgencyAdmin = typeof agencyAdminsTable.$inferInsert
export type SelectAgencyAdmin = typeof agencyAdminsTable.$inferSelect

