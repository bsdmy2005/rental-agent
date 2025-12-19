import { db } from "@/db"
import {
  userProfilesTable,
  propertiesTable,
  tenantsTable,
  billsTable,
  extractionRulesTable
} from "@/db/schema"
import { eq, and, sql, inArray } from "drizzle-orm"

export interface SystemStats {
  totalUsers: number
  usersByType: {
    landlord: number
    rental_agent: number
    tenant: number
    admin: number
  }
  totalProperties: number
  totalTenants: number
  totalBills: number
  billsByStatus: {
    pending: number
    processing: number
    processed: number
    error: number
  }
  totalExtractionRules: number
  activeExtractionRules: number
  processingSuccessRate: number
}

export async function getSystemStatsQuery(): Promise<SystemStats> {
  // Get user counts
  const allUsers = await db.select().from(userProfilesTable)
  const usersByType = {
    landlord: allUsers.filter((u) => u.userType === "landlord").length,
    rental_agent: allUsers.filter((u) => u.userType === "rental_agent").length,
    tenant: allUsers.filter((u) => u.userType === "tenant").length,
    admin: allUsers.filter((u) => u.userType === "admin").length
  }

  // Get property count
  const allProperties = await db.select().from(propertiesTable)
  const totalProperties = allProperties.length

  // Get tenant count
  const allTenants = await db.select().from(tenantsTable)
  const totalTenants = allTenants.length

  // Get bill counts
  const allBills = await db.select().from(billsTable)
  const totalBills = allBills.length
  const billsByStatus = {
    pending: allBills.filter((b) => b.status === "pending").length,
    processing: allBills.filter((b) => b.status === "processing").length,
    processed: allBills.filter((b) => b.status === "processed").length,
    error: allBills.filter((b) => b.status === "error").length
  }

  // Get extraction rule counts
  const allRules = await db.select().from(extractionRulesTable)
  const totalExtractionRules = allRules.length
  const activeExtractionRules = allRules.filter((r) => r.isActive).length

  // Calculate processing success rate
  const processedBills = billsByStatus.processed
  const totalProcessedBills = processedBills + billsByStatus.error
  const processingSuccessRate =
    totalProcessedBills > 0 ? (processedBills / totalProcessedBills) * 100 : 0

  return {
    totalUsers: allUsers.length,
    usersByType,
    totalProperties,
    totalTenants,
    totalBills,
    billsByStatus,
    totalExtractionRules,
    activeExtractionRules,
    processingSuccessRate: Math.round(processingSuccessRate * 100) / 100
  }
}

export async function getRecentBillsQuery(limit: number = 10) {
  const recentBills = await db
    .select()
    .from(billsTable)
    .orderBy(sql`${billsTable.createdAt} DESC`)
    .limit(limit)

  return recentBills
}

export async function getFailedBillsQuery() {
  const failedBills = await db
    .select()
    .from(billsTable)
    .where(eq(billsTable.status, "error"))

  return failedBills
}

export interface UserActivity {
  userId: string
  userName: string
  userType: string
  propertiesCount: number
  tenantsCount: number
  billsCount: number
  lastActivity: Date | null
}

export async function getUserActivityQuery(userProfileId: string): Promise<UserActivity | null> {
  const userProfile = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userProfileId))
    .limit(1)

  if (userProfile.length === 0) {
    return null
  }

  const user = userProfile[0]

  // Get user's properties count
  let propertiesCount = 0
  if (user.userType === "landlord") {
    const { getLandlordByUserProfileIdQuery } = await import("@/queries/landlords-queries")
    const landlord = await getLandlordByUserProfileIdQuery(userProfileId)
    if (landlord) {
      const { getPropertiesByLandlordIdQuery } = await import("@/queries/properties-queries")
      const properties = await getPropertiesByLandlordIdQuery(landlord.id)
      propertiesCount = properties.length
    }
  } else if (user.userType === "rental_agent") {
    const { getRentalAgentByUserProfileIdQuery } = await import("@/queries/rental-agents-queries")
    const agent = await getRentalAgentByUserProfileIdQuery(userProfileId)
    if (agent) {
      const { getPropertiesByRentalAgentIdQuery } = await import("@/queries/properties-queries")
      const properties = await getPropertiesByRentalAgentIdQuery(agent.id)
      propertiesCount = properties.length
    }
  }

  // Get tenants count (across all user's properties)
  let propertyIds: string[] = []
  if (user.userType === "landlord") {
    const { getLandlordByUserProfileIdQuery } = await import("@/queries/landlords-queries")
    const landlord = await getLandlordByUserProfileIdQuery(userProfileId)
    if (landlord) {
      const { getPropertiesByLandlordIdQuery } = await import("@/queries/properties-queries")
      const properties = await getPropertiesByLandlordIdQuery(landlord.id)
      propertyIds = properties.map((p) => p.id)
    }
  } else if (user.userType === "rental_agent") {
    const { getRentalAgentByUserProfileIdQuery } = await import("@/queries/rental-agents-queries")
    const agent = await getRentalAgentByUserProfileIdQuery(userProfileId)
    if (agent) {
      const { getPropertiesByRentalAgentIdQuery } = await import("@/queries/properties-queries")
      const properties = await getPropertiesByRentalAgentIdQuery(agent.id)
      propertyIds = properties.map((p) => p.id)
    }
  }

  let tenantsCount = 0
  let billsCount = 0
  if (propertyIds.length > 0) {
    const tenants = await db
      .select()
      .from(tenantsTable)
      .where(inArray(tenantsTable.propertyId, propertyIds))
    tenantsCount = tenants.length

    const bills = await db
      .select()
      .from(billsTable)
      .where(inArray(billsTable.propertyId, propertyIds))
    billsCount = bills.length
  }

  // Get last activity (most recent bill or property creation)
  const lastActivity = user.updatedAt || user.createdAt

  return {
    userId: user.id,
    userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
    userType: user.userType,
    propertiesCount,
    tenantsCount,
    billsCount,
    lastActivity
  }
}

