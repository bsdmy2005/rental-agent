import { db } from "@/db"
import {
  agencyMembershipsTable,
  rentalAgentsTable,
  rentalAgenciesTable,
  userProfilesTable,
  type SelectAgencyMembership,
  type SelectRentalAgent,
  type SelectRentalAgency,
  type SelectUserProfile
} from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function getAgencyMembershipByAgentAndAgencyQuery(
  rentalAgentId: string,
  agencyId: string
): Promise<SelectAgencyMembership | null> {
  const [membership] = await db
    .select()
    .from(agencyMembershipsTable)
    .where(
      and(
        eq(agencyMembershipsTable.rentalAgentId, rentalAgentId),
        eq(agencyMembershipsTable.agencyId, agencyId)
      )
    )
    .limit(1)

  return membership || null
}

export interface PendingMembershipRequest extends SelectAgencyMembership {
  rentalAgent: SelectRentalAgent & { userProfile: SelectUserProfile }
  agency: SelectRentalAgency
}

export async function getPendingMembershipRequestsQuery(
  agencyId?: string
): Promise<PendingMembershipRequest[]> {
  const conditions = [eq(agencyMembershipsTable.status, "pending")]
  if (agencyId) {
    conditions.push(eq(agencyMembershipsTable.agencyId, agencyId))
  }

  const memberships = await db
    .select()
    .from(agencyMembershipsTable)
    .where(and(...conditions))

  const requestsWithDetails = await Promise.all(
    memberships.map(async (membership) => {
      const [rentalAgent] = await db
        .select()
        .from(rentalAgentsTable)
        .where(eq(rentalAgentsTable.id, membership.rentalAgentId))
        .limit(1)

      if (!rentalAgent) {
        return null
      }

      const [userProfile] = await db
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, rentalAgent.userProfileId))
        .limit(1)

      const [agency] = await db
        .select()
        .from(rentalAgenciesTable)
        .where(eq(rentalAgenciesTable.id, membership.agencyId))
        .limit(1)

      if (!agency || !userProfile) {
        return null
      }

      return {
        ...membership,
        rentalAgent: {
          ...rentalAgent,
          userProfile
        },
        agency
      }
    })
  )

  return requestsWithDetails.filter(
    (request): request is PendingMembershipRequest => request !== null
  )
}

export interface AgentMembershipStatus extends SelectAgencyMembership {
  agency: SelectRentalAgency
}

export async function getAgentMembershipStatusQuery(
  rentalAgentId: string
): Promise<AgentMembershipStatus | null> {
  const [membership] = await db
    .select()
    .from(agencyMembershipsTable)
    .where(
      and(
        eq(agencyMembershipsTable.rentalAgentId, rentalAgentId),
        eq(agencyMembershipsTable.status, "approved")
      )
    )
    .limit(1)

  if (!membership) {
    return null
  }

  const [agency] = await db
    .select()
    .from(rentalAgenciesTable)
    .where(eq(rentalAgenciesTable.id, membership.agencyId))
    .limit(1)

  if (!agency) {
    return null
  }

  return {
    ...membership,
    agency
  }
}

