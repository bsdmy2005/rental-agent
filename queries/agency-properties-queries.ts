import { db } from "@/db"
import {
  propertyManagementsTable,
  propertiesTable,
  rentalAgentsTable,
  userProfilesTable,
  agencyMembershipsTable,
  type SelectProperty,
  type SelectPropertyManagement,
  type SelectRentalAgent,
  type SelectUserProfile
} from "@/db/schema"
import { eq, and } from "drizzle-orm"

export interface AgencyPropertyWithAgents {
  property: SelectProperty
  managementId: string
  individuallyAssignedAgents: Array<{
    agentId: string
    agentName: string
    userEmail: string
  }>
}

/**
 * Get all properties assigned to an agency with their individually assigned agents
 */
export async function getAgencyPropertiesWithAgentsQuery(
  agencyId: string
): Promise<AgencyPropertyWithAgents[]> {
  // Get all properties assigned to the agency
  const agencyManagements = await db
    .select()
    .from(propertyManagementsTable)
    .where(
      and(
        eq(propertyManagementsTable.agencyId, agencyId),
        eq(propertyManagementsTable.isActive, true)
      )
    )

  const results: AgencyPropertyWithAgents[] = []

  for (const agencyManagement of agencyManagements) {
    // Get the property
    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, agencyManagement.propertyId))
      .limit(1)

    if (!property) {
      continue
    }

    // Get all individual agent assignments for this property (where rentalAgentId is not null)
    const allManagements = await db
      .select()
      .from(propertyManagementsTable)
      .where(
        and(
          eq(propertyManagementsTable.propertyId, agencyManagement.propertyId),
          eq(propertyManagementsTable.isActive, true)
        )
      )

    // Filter to only those with individual agent assignments (rentalAgentId is not null)
    const individualManagements = allManagements.filter((m) => m.rentalAgentId !== null)

    // Get agent details for individually assigned agents (only if they belong to this agency)
    const assignedAgents = await Promise.all(
      individualManagements.map(async (management) => {
        if (!management.rentalAgentId) {
          return null
        }

        // Check if agent belongs to this agency
        const [membership] = await db
          .select()
          .from(agencyMembershipsTable)
          .where(
            and(
              eq(agencyMembershipsTable.rentalAgentId, management.rentalAgentId),
              eq(agencyMembershipsTable.agencyId, agencyId),
              eq(agencyMembershipsTable.status, "approved")
            )
          )
          .limit(1)

        // Only include agents that belong to this agency
        if (!membership) {
          return null
        }

        const [agent] = await db
          .select()
          .from(rentalAgentsTable)
          .where(eq(rentalAgentsTable.id, management.rentalAgentId))
          .limit(1)

        if (!agent) {
          return null
        }

        const [userProfile] = await db
          .select()
          .from(userProfilesTable)
          .where(eq(userProfilesTable.id, agent.userProfileId))
          .limit(1)

        if (!userProfile) {
          return null
        }

        return {
          agentId: agent.id,
          agentName: `${userProfile.firstName} ${userProfile.lastName}`,
          userEmail: userProfile.email
        }
      })
    )

    results.push({
      property,
      managementId: agencyManagement.id,
      individuallyAssignedAgents: assignedAgents.filter(
        (agent): agent is NonNullable<typeof agent> => agent !== null
      )
    })
  }

  return results
}

