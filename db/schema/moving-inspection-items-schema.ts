import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
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
  condition: itemConditionEnum("condition"), // Nullable - user must select condition
  isPresent: boolean("is_present"), // DEPRECATED: Replaced by condition enum. Kept for migration period.
  notes: text("notes"),
  roomInstanceNumber: integer("room_instance_number"), // For expandable rooms (Bedroom 1, Bedroom 2, etc.)
  displayOrder: integer("display_order").notNull(),
  confirmedAsPrevious: boolean("confirmed_as_previous").default(false).notNull(), // For move-out: mark as same as move-in
  moveInItemId: uuid("move_in_item_id"), // Link to move-in item (for move-out inspections only)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertMovingInspectionItem = typeof movingInspectionItemsTable.$inferInsert
export type SelectMovingInspectionItem = typeof movingInspectionItemsTable.$inferSelect

