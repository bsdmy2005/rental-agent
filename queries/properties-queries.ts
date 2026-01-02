import { db } from "@/db"
import {
  propertiesTable,
  propertyManagementsTable,
  tenantsTable,
  rentalAgentsTable,
  agencyMembershipsTable,
  type SelectProperty,
  type SelectTenant
} from "@/db/schema"
import { eq, and, inArray, or, isNotNull } from "drizzle-orm"
import { getUserAgencies } from "@/lib/agency-access"

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
  // Get properties directly assigned to the agent (individual assignments only)
  // Rental agents should only see properties individually assigned to them, not all agency properties
  const directManagements = await db
    .select()
    .from(propertyManagementsTable)
    .where(
      and(
        eq(propertyManagementsTable.rentalAgentId, rentalAgentId),
        eq(propertyManagementsTable.isActive, true)
      )
    )

  const propertyIds = directManagements.map((m) => m.propertyId)

  if (propertyIds.length === 0) {
    return []
  }

  const properties = await db
    .select()
    .from(propertiesTable)
    .where(inArray(propertiesTable.id, propertyIds))

  return properties
}

export async function getPropertiesByAgencyIdQuery(
  agencyId: string
): Promise<SelectProperty[]> {
  const managements = await db
    .select()
    .from(propertyManagementsTable)
    .where(
      and(
        eq(propertyManagementsTable.agencyId, agencyId),
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

export async function getPropertiesWithTenantsByAgencyIdQuery(
  agencyId: string
): Promise<PropertyWithDetails[]> {
  const properties = await getPropertiesByAgencyIdQuery(agencyId)
  
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

export async function getAllPropertiesQuery(): Promise<SelectProperty[]> {
  return await db.select().from(propertiesTable)
}

/**
 * Get all properties for an agency owner or admin
 * Returns all properties assigned to their agency(ies)
 */
export async function getPropertiesForAgencyOwnerOrAdminQuery(
  userProfileId: string
): Promise<SelectProperty[]> {
  const userAgencies = await getUserAgencies(userProfileId)
  
  // Get agencies where user is owner or admin (not just member)
  const ownerOrAdminAgencies = userAgencies.filter(
    (agency) => agency.role === "owner" || agency.role === "admin"
  )

  if (ownerOrAdminAgencies.length === 0) {
    return []
  }

  const agencyIds = ownerOrAdminAgencies.map((agency) => agency.agencyId)

  // Get all properties assigned to these agencies
  const managements = await db
    .select()
    .from(propertyManagementsTable)
    .where(
      and(
        inArray(propertyManagementsTable.agencyId, agencyIds),
        eq(propertyManagementsTable.isActive, true)
      )
    )

  const propertyIds = managements.map((m) => m.propertyId)

  if (propertyIds.length === 0) {
    return []
  }

  // Remove duplicates
  const uniquePropertyIds = Array.from(new Set(propertyIds))

  const properties = await db
    .select()
    .from(propertiesTable)
    .where(inArray(propertiesTable.id, uniquePropertyIds))

  return properties
}

/**
 * Get properties with tenants for an agency owner or admin
 */
export async function getPropertiesWithTenantsForAgencyOwnerOrAdminQuery(
  userProfileId: string
): Promise<PropertyWithDetails[]> {
  const properties = await getPropertiesForAgencyOwnerOrAdminQuery(userProfileId)

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
 * Centralized function to get properties for a user based on their role
 * Handles rental agent vs agency owner/admin logic
 */
export async function getPropertiesForUserQuery(
  userProfileId: string,
  userType: string
): Promise<SelectProperty[]> {
  // Check if user is agency owner/admin
  const userAgencies = await getUserAgencies(userProfileId)
  const isAgencyOwnerOrAdmin = userAgencies.some(
    (agency) => agency.role === "owner" || agency.role === "admin"
  )

  if (isAgencyOwnerOrAdmin) {
    // Agency owners/admins see all agency properties
    return await getPropertiesForAgencyOwnerOrAdminQuery(userProfileId)
  }

  // For rental agents, get individually assigned properties
  if (userType === "rental_agent") {
    const [rentalAgent] = await db
      .select()
      .from(rentalAgentsTable)
      .where(eq(rentalAgentsTable.userProfileId, userProfileId))
      .limit(1)

    if (rentalAgent) {
      return await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
    }
  }

  return []
}

/**
 * Get properties with tenants for a user based on their role
 */
export async function getPropertiesWithTenantsForUserQuery(
  userProfileId: string,
  userType: string
): Promise<PropertyWithDetails[]> {
  // Check if user is agency owner/admin
  const userAgencies = await getUserAgencies(userProfileId)
  const isAgencyOwnerOrAdmin = userAgencies.some(
    (agency) => agency.role === "owner" || agency.role === "admin"
  )

  if (isAgencyOwnerOrAdmin) {
    // Agency owners/admins see all agency properties
    return await getPropertiesWithTenantsForAgencyOwnerOrAdminQuery(userProfileId)
  }

  // For rental agents, get individually assigned properties
  if (userType === "rental_agent") {
    const [rentalAgent] = await db
      .select()
      .from(rentalAgentsTable)
      .where(eq(rentalAgentsTable.userProfileId, userProfileId))
      .limit(1)

    if (rentalAgent) {
      return await getPropertiesWithTenantsByRentalAgentIdQuery(rentalAgent.id)
    }
  }

  return []
}

