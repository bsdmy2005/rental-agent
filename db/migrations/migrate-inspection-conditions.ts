/**
 * Migration script to convert existing isPresent values to new condition enum values
 * 
 * This script:
 * - Converts isPresent: true → condition: "good"
 * - Converts isPresent: false → condition: "requires_repair"
 * - Leaves items with isPresent: null unchanged (they keep their existing condition)
 * 
 * Run this script manually after updating the database schema:
 * npx tsx db/migrations/migrate-inspection-conditions.ts
 */

import { db } from "../db"
import { movingInspectionItemsTable } from "../schema"
import { isNotNull, sql } from "drizzle-orm"

async function migrateInspectionConditions() {
  try {
    console.log("Starting migration of inspection item conditions...")

    // Update items where isPresent is true → condition: "good"
    const updateTrueToGood = await db
      .update(movingInspectionItemsTable)
      .set({
        condition: "good"
      })
      .where(
        sql`${movingInspectionItemsTable.isPresent} = true AND ${movingInspectionItemsTable.condition} != 'good'`
      )

    console.log(`Updated items with isPresent=true to condition="good"`)

    // Update items where isPresent is false → condition: "requires_repair"
    const updateFalseToRepair = await db
      .update(movingInspectionItemsTable)
      .set({
        condition: "requires_repair"
      })
      .where(
        sql`${movingInspectionItemsTable.isPresent} = false AND ${movingInspectionItemsTable.condition} != 'requires_repair'`
      )

    console.log(`Updated items with isPresent=false to condition="requires_repair"`)

    // Get summary of remaining items
    const itemsWithNull = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(movingInspectionItemsTable)
      .where(sql`${movingInspectionItemsTable.isPresent} IS NULL`)

    console.log(`Items with isPresent=null (unchanged): ${itemsWithNull[0]?.count || 0}`)

    console.log("Migration completed successfully!")
  } catch (error) {
    console.error("Error during migration:", error)
    throw error
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateInspectionConditions()
    .then(() => {
      console.log("Migration script finished")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Migration failed:", error)
      process.exit(1)
    })
}

export { migrateInspectionConditions }

