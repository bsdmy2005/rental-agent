import { boolean, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { payableTemplatesTable } from "./payable-templates"

/**
 * Payable Schedules Schema
 * 
 * Defines recurring schedule pattern (day per month) for each payable template.
 * Used to generate payable instances with scheduled dates.
 * 
 * Key relationships:
 * - Payable Template → Payable Schedule: One-to-one
 * - Property → Payable Schedules: One-to-many
 */
export const payableSchedulesTable = pgTable("payable_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  payableTemplateId: uuid("payable_template_id")
    .references(() => payableTemplatesTable.id, { onDelete: "cascade" })
    .notNull(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  scheduledDayOfMonth: integer("scheduled_day_of_month").notNull(), // 1-31, e.g., 15 for 15th of each month
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertPayableSchedule = typeof payableSchedulesTable.$inferInsert
export type SelectPayableSchedule = typeof payableSchedulesTable.$inferSelect

