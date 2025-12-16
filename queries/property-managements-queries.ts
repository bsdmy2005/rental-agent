import { db } from "@/db"
import {
  propertyManagementsTable,
  type SelectPropertyManagement
} from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function getPropertyManagementsByPropertyIdQuery(
  propertyId: string
): Promise<SelectPropertyManagement[]> {
  const managements = await db
    .select()
    .from(propertyManagementsTable)
    .where(eq(propertyManagementsTable.propertyId, propertyId))

  return managements
}

export async function getPropertyManagementsByRentalAgentIdQuery(
  rentalAgentId: string
): Promise<SelectPropertyManagement[]> {
  const managements = await db
    .select()
    .from(propertyManagementsTable)
    .where(eq(propertyManagementsTable.rentalAgentId, rentalAgentId))

  return managements
}

export async function getActivePropertyManagementsQuery(
  propertyId: string
): Promise<SelectPropertyManagement[]> {
  const managements = await db
    .select()
    .from(propertyManagementsTable)
    .where(
      and(
        eq(propertyManagementsTable.propertyId, propertyId),
        eq(propertyManagementsTable.isActive, true)
      )
    )

  return managements
}

