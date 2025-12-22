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

export async function getPropertiesWithTenantsByLandlordIdQuery(
  landlordId: string
): Promise<PropertyWithDetails[]> {
  const properties = await getPropertiesByLandlordIdQuery(landlordId)
  
  if (properties.length === 0) {
    return []
  }

  // Batch fetch all tenants for all properties (fixes N+1 query)
  const propertyIds = properties.map((p) => p.id)
  const allTenants = await db
    .select()
    .from(tenantsTable)
    .where(inArray(tenantsTable.propertyId, propertyIds))

  // Group tenants by propertyId
  const tenantsByPropertyId = new Map<string, SelectTenant[]>()
  for (const tenant of allTenants) {
    if (!tenantsByPropertyId.has(tenant.propertyId)) {
      tenantsByPropertyId.set(tenant.propertyId, [])
    }
    tenantsByPropertyId.get(tenant.propertyId)!.push(tenant)
  }

  // Map properties with their tenants
  const propertiesWithTenants = properties.map((property) => ({
    ...property,
    tenants: tenantsByPropertyId.get(property.id) || []
  }))
  
  return propertiesWithTenants
}

export async function getPropertiesWithTenantsByRentalAgentIdQuery(
  rentalAgentId: string
): Promise<PropertyWithDetails[]> {
  const properties = await getPropertiesByRentalAgentIdQuery(rentalAgentId)
  
  if (properties.length === 0) {
    return []
  }

  // Batch fetch all tenants for all properties (fixes N+1 query)
  const propertyIds = properties.map((p) => p.id)
  const allTenants = await db
    .select()
    .from(tenantsTable)
    .where(inArray(tenantsTable.propertyId, propertyIds))

  // Group tenants by propertyId
  const tenantsByPropertyId = new Map<string, SelectTenant[]>()
  for (const tenant of allTenants) {
    if (!tenantsByPropertyId.has(tenant.propertyId)) {
      tenantsByPropertyId.set(tenant.propertyId, [])
    }
    tenantsByPropertyId.get(tenant.propertyId)!.push(tenant)
  }

  // Map properties with their tenants
  const propertiesWithTenants = properties.map((property) => ({
    ...property,
    tenants: tenantsByPropertyId.get(property.id) || []
  }))
  
  return propertiesWithTenants
}

/**
 * Batch fetch properties by IDs
 */
export async function getPropertiesByIdsQuery(propertyIds: string[]): Promise<Map<string, SelectProperty>> {
  if (propertyIds.length === 0) {
    return new Map()
  }

  const properties = await db
    .select()
    .from(propertiesTable)
    .where(inArray(propertiesTable.id, propertyIds))

  return new Map(properties.map((property) => [property.id, property]))
}

