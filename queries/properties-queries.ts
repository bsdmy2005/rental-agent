import { db } from "@/db"
import {
  propertiesTable,
  propertyManagementsTable,
  tenantsTable,
  type SelectProperty,
  type SelectTenant
} from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"

export async function getPropertyByIdQuery(propertyId: string): Promise<SelectProperty | null> {
  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.id, propertyId))
    .limit(1)

  return property || null
}

export async function getPropertiesByLandlordIdQuery(
  landlordId: string
): Promise<SelectProperty[]> {
  const properties = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.landlordId, landlordId))

  return properties
}

import { inArray } from "drizzle-orm"

export async function getPropertiesByRentalAgentIdQuery(
  rentalAgentId: string
): Promise<SelectProperty[]> {
  const managements = await db
    .select()
    .from(propertyManagementsTable)
    .where(
      and(
        eq(propertyManagementsTable.rentalAgentId, rentalAgentId),
        eq(propertyManagementsTable.isActive, true)
      )
    )

  const propertyIds = managements.map((m) => m.propertyId)
  if (propertyIds.length === 0) {
    return []
  }

  const properties = await db
    .select()
    .from(propertiesTable)
    .where(inArray(propertiesTable.id, propertyIds))

  return properties
}

export interface PropertyWithDetails extends SelectProperty {
  tenants: SelectTenant[]
}

export async function getPropertyWithDetailsQuery(
  propertyId: string
): Promise<PropertyWithDetails | null> {
  const property = await getPropertyByIdQuery(propertyId)
  if (!property) {
    return null
  }

  const tenants = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.propertyId, propertyId))

  return {
    ...property,
    tenants
  }
}

