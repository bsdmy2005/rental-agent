import { db } from "@/db"
import {
  billingSchedulesTable,
  type SelectBillingSchedule
} from "@/db/schema"
import { eq, inArray, asc } from "drizzle-orm"

/**
 * Get all billing schedules for properties owned/managed by a user
 */
export async function getBillingSchedulesForUserPropertiesQuery(
  propertyIds: string[]
): Promise<SelectBillingSchedule[]> {
  if (propertyIds.length === 0) {
    return []
  }

  const schedules = await db
    .select()
    .from(billingSchedulesTable)
    .where(inArray(billingSchedulesTable.propertyId, propertyIds))
    .orderBy(
      asc(billingSchedulesTable.propertyId),
      asc(billingSchedulesTable.scheduleType),
      asc(billingSchedulesTable.billType)
    )

  return schedules
}

