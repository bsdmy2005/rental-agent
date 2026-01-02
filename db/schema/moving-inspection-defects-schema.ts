import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { movingInspectionItemsTable } from "./moving-inspection-items-schema"
import { defectSeverityEnum } from "./enums"

export const movingInspectionDefectsTable = pgTable("moving_inspection_defects", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id")
    .references(() => movingInspectionItemsTable.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  severity: defectSeverityEnum("severity").default("minor").notNull(),
  isRepairable: boolean("is_repairable").default(true).notNull(), // true = requires repair, false = as-is
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertMovingInspectionDefect = typeof movingInspectionDefectsTable.$inferInsert
export type SelectMovingInspectionDefect = typeof movingInspectionDefectsTable.$inferSelect

