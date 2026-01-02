import { db } from "@/db"
import {
  propertyManagementsTable,
  propertiesTable,
  rentalAgenciesTable,
  agencyMembershipsTable,
  type SelectProperty,
  type SelectPropertyManagement,
  type SelectRentalAgency
} from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"

/**
 * Get properties individually assigned to an agent (not via agency)
 */
export async function getPropertiesIndividuallyAssignedToAgentQuery(
  rentalAgentId: string
): Promise<Array<SelectPropertyManagement & { property: SelectProperty }>> {
  const managements = await db
    .select()
    .from(propertyManagementsTable)
    .where(
      and(
        eq(propertyManagementsTable.rentalAgentId, rentalAgentId),
        eq(propertyManagementsTable.isActive, true)
      )
    )

  const properties = await Promise.all(
    managements.map(async (management) => {
      const [property] = await db
        .select()
        .from(propertiesTable)
        .where(eq(propertiesTable.id, management.propertyId))
        .limit(1)
      return { ...management, property: property! }
    })
  )

  return properties.filter(
    (p): p is SelectPropertyManagement & { property: SelectProperty } =>
      p.property !== undefined
  )
}

export interface AgentPropertyWithAssignment {
  property: SelectProperty
  assignmentType: "individual" | "agency"
  agencyId?: string
  agencyName?: string
  managementId: string
}

/**
 * Get all properties managed by an agent, with assignment type metadata
 * Only returns individually assigned properties (not agency properties)
 * Rental agents should only see properties individually assigned to them
 */
export async function getAgentPropertiesWithAssignmentsQuery(
  rentalAgentId: string
): Promise<AgentPropertyWithAssignment[]> {
  const results: AgentPropertyWithAssignment[] = []

  // Get properties individually assigned to the agent only
  const individualManagements = await db
    .select()
    .from(propertyManagementsTable)
    .where(
      and(
        eq(propertyManagementsTable.rentalAgentId, rentalAgentId),
        eq(propertyManagementsTable.isActive, true)
      )
    )

  for (const management of individualManagements) {
    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, management.propertyId))
      .limit(1)

    if (property) {
      results.push({
        property,
        assignmentType: "individual",
        managementId: management.id
      })
    }
  }

  return results
}

