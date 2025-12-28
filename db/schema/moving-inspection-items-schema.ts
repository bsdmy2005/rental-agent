import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { movingInspectionsTable } from "./moving-inspections-schema"
import { movingInspectionCategoriesTable } from "./moving-inspection-categories-schema"
import { itemConditionEnum } from "./enums"

export const movingInspectionItemsTable = pgTable("moving_inspection_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  inspectionId: uuid("inspection_id")
    .references(() => movingInspectionsTable.id, { onDelete: "cascade" })
    .notNull(),
  categoryId: uuid("category_id")
    .references(() => movingInspectionCategoriesTable.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  condition: itemConditionEnum("condition").default("good").notNull(),
  notes: text("notes"),
  displayOrder: integer("display_order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertMovingInspectionItem = typeof movingInspectionItemsTable.$inferInsert
export type SelectMovingInspectionItem = typeof movingInspectionItemsTable.$inferSelect

