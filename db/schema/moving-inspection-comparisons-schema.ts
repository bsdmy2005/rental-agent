import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { movingInspectionsTable } from "./moving-inspections-schema"
import { movingInspectionItemsTable } from "./moving-inspection-items-schema"
import { conditionChangeEnum } from "./enums"

export const movingInspectionComparisonsTable = pgTable("moving_inspection_comparisons", {
  id: uuid("id").defaultRandom().primaryKey(),
  movingInInspectionId: uuid("moving_in_inspection_id")
    .references(() => movingInspectionsTable.id, { onDelete: "cascade" })
    .notNull(),
  movingOutInspectionId: uuid("moving_out_inspection_id")
    .references(() => movingInspectionsTable.id, { onDelete: "cascade" })
    .notNull(),
  itemId: uuid("item_id")
    .references(() => movingInspectionItemsTable.id, { onDelete: "cascade" })
    .notNull(),
  conditionChange: conditionChangeEnum("condition_change").notNull(),
  comparisonNotes: text("comparison_notes"),
  damageChargeApplicable: boolean("damage_charge_applicable").default(false).notNull(),
  damageChargeAmount: numeric("damage_charge_amount"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertMovingInspectionComparison = typeof movingInspectionComparisonsTable.$inferInsert
export type SelectMovingInspectionComparison = typeof movingInspectionComparisonsTable.$inferSelect

