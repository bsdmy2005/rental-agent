import { integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { depreciationMethodEnum } from "./enums"

export const depreciationRecordsTable = pgTable("depreciation_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  assetName: text("asset_name").notNull(),
  assetType: text("asset_type").notNull(), // Custom asset type
  purchaseDate: timestamp("purchase_date").notNull(),
  purchaseCost: numeric("purchase_cost").notNull(),
  depreciationRate: numeric("depreciation_rate").notNull(), // User-defined rate (e.g., 10% = 0.10)
  usefulLifeYears: integer("useful_life_years").notNull(),
  currentValue: numeric("current_value").notNull(), // Calculated current value
  depreciationMethod: depreciationMethodEnum("depreciation_method")
    .default("straight_line")
    .notNull(),
  taxYear: integer("tax_year"), // Tax year for grouping
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertDepreciationRecord = typeof depreciationRecordsTable.$inferInsert
export type SelectDepreciationRecord = typeof depreciationRecordsTable.$inferSelect

