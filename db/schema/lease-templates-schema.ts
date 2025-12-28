import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"

export const leaseTemplatesTable = pgTable("lease_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  templateData: jsonb("template_data").notNull(), // Template structure/fields
  isDefault: boolean("is_default").default(false).notNull(),
  createdBy: uuid("created_by")
    .references(() => userProfilesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertLeaseTemplate = typeof leaseTemplatesTable.$inferInsert
export type SelectLeaseTemplate = typeof leaseTemplatesTable.$inferSelect

