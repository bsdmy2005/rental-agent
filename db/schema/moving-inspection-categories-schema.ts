import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const movingInspectionCategoriesTable = pgTable("moving_inspection_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertMovingInspectionCategory = typeof movingInspectionCategoriesTable.$inferInsert
export type SelectMovingInspectionCategory = typeof movingInspectionCategoriesTable.$inferSelect

