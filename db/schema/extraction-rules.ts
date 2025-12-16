import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"
import { propertiesTable } from "./properties"
import { billTypeEnum, channelEnum } from "./enums"

export const extractionRulesTable = pgTable("extraction_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id")
    .references(() => userProfilesTable.id, { onDelete: "cascade" })
    .notNull(),
  propertyId: uuid("property_id").references(() => propertiesTable.id, {
    onDelete: "cascade"
  }),
  name: text("name").notNull(),
  billType: billTypeEnum("bill_type").notNull(),
  channel: channelEnum("channel").notNull(),
  emailFilter: jsonb("email_filter"),
  extractionConfig: jsonb("extraction_config").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertExtractionRule = typeof extractionRulesTable.$inferInsert
export type SelectExtractionRule = typeof extractionRulesTable.$inferSelect

