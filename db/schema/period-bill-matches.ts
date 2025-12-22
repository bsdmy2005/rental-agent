import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { billingPeriodsTable } from "./billing-periods"
import { billsTable } from "./bills"
import { userProfilesTable } from "./user-profiles"

export const periodBillMatchesTable = pgTable("period_bill_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  periodId: uuid("period_id")
    .references(() => billingPeriodsTable.id, { onDelete: "cascade" })
    .notNull(),
  billId: uuid("bill_id")
    .references(() => billsTable.id, { onDelete: "cascade" })
    .notNull(),
  matchType: text("match_type").notNull(), // 'automatic' | 'manual'
  matchedAt: timestamp("matched_at").defaultNow().notNull(),
  matchedBy: uuid("matched_by").references(() => userProfilesTable.id), // User who manually matched
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertPeriodBillMatch = typeof periodBillMatchesTable.$inferInsert
export type SelectPeriodBillMatch = typeof periodBillMatchesTable.$inferSelect

