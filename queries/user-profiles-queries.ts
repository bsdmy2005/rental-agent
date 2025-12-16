import { db } from "@/db"
import { userProfilesTable, type SelectUserProfile } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getUserProfileByClerkIdQuery(
  clerkUserId: string
): Promise<SelectUserProfile | null> {
  const [userProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.clerkUserId, clerkUserId))
    .limit(1)

  return userProfile || null
}

export async function getUserProfileByIdQuery(
  userProfileId: string
): Promise<SelectUserProfile | null> {
  const [userProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userProfileId))
    .limit(1)

  return userProfile || null
}

export async function getUserProfilesByTypeQuery(
  userType: "landlord" | "rental_agent" | "tenant" | "admin"
): Promise<SelectUserProfile[]> {
  const userProfiles = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userType, userType))

  return userProfiles
}

export interface UserProfileFilters {
  userType?: "landlord" | "rental_agent" | "tenant" | "admin"
  isActive?: boolean
  onboardingCompleted?: boolean
}

export async function getAllUserProfilesQuery(
  filters?: UserProfileFilters
): Promise<SelectUserProfile[]> {
  let query = db.select().from(userProfilesTable)

  if (filters?.userType) {
    query = query.where(eq(userProfilesTable.userType, filters.userType)) as any
  }

  const allProfiles = await query

  if (!filters) {
    return allProfiles
  }

  return allProfiles.filter((profile) => {
    if (filters.isActive !== undefined && profile.isActive !== filters.isActive) {
      return false
    }
    if (
      filters.onboardingCompleted !== undefined &&
      profile.onboardingCompleted !== filters.onboardingCompleted
    ) {
      return false
    }
    return true
  })
}

