import { db } from "@/db"
import {
  rentalAgenciesTable,
  agencyMembershipsTable,
  agencyAdminsTable,
  propertyManagementsTable,
  propertiesTable,
  rentalAgentsTable,
  userProfilesTable,
  type SelectRentalAgency,
  type SelectAgencyMembership,
  type SelectAgencyAdmin,
  type SelectProperty,
  type SelectPropertyManagement,
  type SelectRentalAgent,
  type SelectUserProfile
} from "@/db/schema"
import { eq, and, or } from "drizzle-orm"

export async function getAllRentalAgenciesQuery(): Promise<SelectRentalAgency[]> {
  return await db.select().from(rentalAgenciesTable)
}

export async function getRentalAgencyByIdQuery(
  agencyId: string
): Promise<SelectRentalAgency | null> {
  const [agency] = await db
    .select()
    .from(rentalAgenciesTable)
    .where(eq(rentalAgenciesTable.id, agencyId))
    .limit(1)

  return agency || null
}

export async function getRentalAgenciesByOwnerIdQuery(
  ownerUserProfileId: string
): Promise<SelectRentalAgency[]> {
  return await db
    .select()
    .from(rentalAgenciesTable)
    .where(eq(rentalAgenciesTable.ownerUserProfileId, ownerUserProfileId))
}

export interface AgencyWithMembers extends SelectRentalAgency {
  members: Array<
    SelectAgencyMembership & {
      rentalAgent: SelectRentalAgent & { userProfile: SelectUserProfile }
    }
  >
}

export async function getRentalAgenciesByAgentIdQuery(
  rentalAgentId: string
): Promise<SelectRentalAgency | null> {
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

  return await getRentalAgencyByIdQuery(membership.agencyId)
}

export async function getAgencyMembersQuery(
  agencyId: string,
  status?: "pending" | "approved" | "rejected" | "removed"
): Promise<
  Array<
    SelectAgencyMembership & {
      rentalAgent: SelectRentalAgent & { userProfile: SelectUserProfile }
    }
  >
> {
  const conditions = [eq(agencyMembershipsTable.agencyId, agencyId)]
  if (status) {
    conditions.push(eq(agencyMembershipsTable.status, status))
  }

  const memberships = await db
    .select()
    .from(agencyMembershipsTable)
    .where(and(...conditions))

  const membersWithDetails = await Promise.all(
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

      return {
        ...membership,
        rentalAgent: {
          ...rentalAgent,
          userProfile: userProfile!
        }
      }
    })
  )

  return membersWithDetails.filter(
    (member): member is NonNullable<typeof member> => member !== null
  )
}

export async function getAgencyAdminsQuery(
  agencyId: string
): Promise<
  Array<SelectAgencyAdmin & { userProfile: SelectUserProfile }>
> {
  const admins = await db
    .select()
    .from(agencyAdminsTable)
    .where(eq(agencyAdminsTable.agencyId, agencyId))

  const adminsWithDetails = await Promise.all(
    admins.map(async (admin) => {
      const [userProfile] = await db
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, admin.userProfileId))
        .limit(1)

      return {
        ...admin,
        userProfile: userProfile!
      }
    })
  )

  return adminsWithDetails.filter(
    (admin): admin is NonNullable<typeof admin> => admin.userProfile !== undefined
  )
}

export async function getAgencyPropertiesQuery(
  agencyId: string
): Promise<Array<SelectPropertyManagement & { property: SelectProperty }>> {
  const managements = await db
    .select()
    .from(propertyManagementsTable)
    .where(
      and(
        eq(propertyManagementsTable.agencyId, agencyId),
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

