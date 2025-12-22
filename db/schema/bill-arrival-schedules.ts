import { boolean, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { billTemplatesTable } from "./bill-templates"

/**
 * Bill Arrival Schedules Schema
 * 
 * Defines expected arrival day per month for each bill template.
 * Used to track when bills are expected and monitor compliance.
 * 
 * Key relationships:
 * - Bill Template → Bill Arrival Schedule: One-to-one
 * - Property → Bill Arrival Schedules: One-to-many
 */
export const billArrivalSchedulesTable = pgTable("bill_arrival_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  billTemplateId: uuid("bill_template_id")
    .references(() => billTemplatesTable.id, { onDelete: "cascade" })
    .notNull(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  expectedDayOfMonth: integer("expected_day_of_month").notNull(), // 1-31, e.g., 3 for 3rd of month
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertBillArrivalSchedule = typeof billArrivalSchedulesTable.$inferInsert
export type SelectBillArrivalSchedule = typeof billArrivalSchedulesTable.$inferSelect

