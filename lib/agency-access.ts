import { db } from "@/db"
import {
  agencyAdminsTable,
  rentalAgenciesTable,
  agencyMembershipsTable,
  rentalAgentsTable,
  userProfilesTable
} from "@/db/schema"
import { eq, and, or } from "drizzle-orm"

export async function isAgencyOwner(
  agencyId: string,
  userProfileId: string
): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(agencyAdminsTable)
    .where(
      and(
        eq(agencyAdminsTable.agencyId, agencyId),
        eq(agencyAdminsTable.userProfileId, userProfileId),
        eq(agencyAdminsTable.role, "owner")
      )
    )
    .limit(1)

  return !!admin
}

export async function isAgencyAdmin(
  agencyId: string,
  userProfileId: string
): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(agencyAdminsTable)
    .where(
      and(
        eq(agencyAdminsTable.agencyId, agencyId),
        eq(agencyAdminsTable.userProfileId, userProfileId)
      )
    )
    .limit(1)

  return !!admin
}

export async function canApproveMembership(
  agencyId: string,
  userProfileId: string,
  isSystemAdmin: boolean = false
): Promise<boolean> {
  // System admins can always approve
  if (isSystemAdmin) {
    return true
  }

  // Agency owners and admins can approve
  return await isAgencyAdmin(agencyId, userProfileId)
}

export interface UserAgency {
  agencyId: string
  role: "owner" | "admin" | "member"
}

export async function getUserAgencies(
  userProfileId: string
): Promise<UserAgency[]> {
  // Get agencies where user is owner/admin
  const adminRecords = await db
    .select()
    .from(agencyAdminsTable)
    .where(eq(agencyAdminsTable.userProfileId, userProfileId))

  const adminAgencies: UserAgency[] = adminRecords.map((admin) => ({
    agencyId: admin.agencyId,
    role: admin.role
  }))

  // Get agencies where user is a member (via rental agent)
  const [userProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userProfileId))
    .limit(1)

  if (!userProfile) {
    return adminAgencies
  }

  const [rentalAgent] = await db
    .select()
    .from(rentalAgentsTable)
    .where(eq(rentalAgentsTable.userProfileId, userProfileId))
    .limit(1)

  if (!rentalAgent) {
    return adminAgencies
  }

  const memberships = await db
    .select()
    .from(agencyMembershipsTable)
    .where(
      and(
        eq(agencyMembershipsTable.rentalAgentId, rentalAgent.id),
        eq(agencyMembershipsTable.status, "approved")
      )
    )

  const memberAgencies: UserAgency[] = memberships
    .filter(
      (membership) =>
        !adminAgencies.some((admin) => admin.agencyId === membership.agencyId)
    )
    .map((membership) => ({
      agencyId: membership.agencyId,
      role: "member"
    }))

  return [...adminAgencies, ...memberAgencies]
}

