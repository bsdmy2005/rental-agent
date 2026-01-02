import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core"
import { rentalAgenciesTable } from "./rental-agencies-schema"
import { rentalAgentsTable } from "./rental-agents"
import { userProfilesTable } from "./user-profiles"
import { agencyMembershipStatusEnum } from "./enums"

export const agencyMembershipsTable = pgTable(
  "agency_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id")
      .references(() => rentalAgenciesTable.id, { onDelete: "cascade" })
      .notNull(),
    rentalAgentId: uuid("rental_agent_id")
      .references(() => rentalAgentsTable.id, { onDelete: "cascade" })
      .notNull(),
    status: agencyMembershipStatusEnum("status").notNull().default("pending"),
    requestedBy: uuid("requested_by")
      .references(() => userProfilesTable.id, { onDelete: "cascade" })
      .notNull(),
    approvedBy: uuid("approved_by").references(() => userProfilesTable.id, {
      onDelete: "set null"
    }),
    rejectedBy: uuid("rejected_by").references(() => userProfilesTable.id, {
      onDelete: "set null"
    }),
    rejectionReason: text("rejection_reason"),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => {
    return {
      uniqueAgencyAgent: unique().on(table.agencyId, table.rentalAgentId)
    }
  }
)

export type InsertAgencyMembership = typeof agencyMembershipsTable.$inferInsert
export type SelectAgencyMembership = typeof agencyMembershipsTable.$inferSelect

