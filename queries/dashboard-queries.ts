import { db } from "@/db"
import {
  billsTable,
  propertiesTable,
  tenantsTable,
  extractionRulesTable,
  propertyManagementsTable
} from "@/db/schema"
import { eq, and, inArray, isNotNull, sql } from "drizzle-orm"
import { getLandlordByUserProfileIdQuery } from "./landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "./rental-agents-queries"

export interface DashboardStats {
  properties: number
  tenants: number
  pendingBills: number
  processingBills: number
  processedBills: number
  errorBills: number
  billsWithInvoices: number // Bills that have invoiceExtractionData
  billsWithPayables: number // Bills that have paymentExtractionData
  activeRules: number
  totalBills: number
}

export async function getDashboardStatsQuery(userProfileId: string, userType: string): Promise<DashboardStats> {
  let propertyIds: string[] = []

  // Get property IDs based on user type
  if (userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfileId)
    if (landlord) {
      const properties = await db
        .select({ id: propertiesTable.id })
        .from(propertiesTable)
        .where(eq(propertiesTable.landlordId, landlord.id))
      propertyIds = properties.map((p) => p.id)
    }
  } else if (userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfileId)
    if (rentalAgent) {
      const managements = await db
        .select({ propertyId: propertyManagementsTable.propertyId })
        .from(propertyManagementsTable)
        .where(
          and(
            eq(propertyManagementsTable.rentalAgentId, rentalAgent.id),
            eq(propertyManagementsTable.isActive, true)
          )
        )
      propertyIds = managements.map((m) => m.propertyId)
    }
  }

  // If no properties, return zeros
  if (propertyIds.length === 0) {
    return {
      properties: 0,
      tenants: 0,
      pendingBills: 0,
      processingBills: 0,
      processedBills: 0,
      errorBills: 0,
      billsWithInvoices: 0,
      billsWithPayables: 0,
      activeRules: 0,
      totalBills: 0
    }
  }

  // Get properties count
  const propertiesCount = propertyIds.length

  // Get tenants count
  const tenants = await db
    .select()
    .from(tenantsTable)
    .where(inArray(tenantsTable.propertyId, propertyIds))
  const tenantsCount = tenants.length

  // Get bills for these properties
  const allBills = await db
    .select()
    .from(billsTable)
    .where(inArray(billsTable.propertyId, propertyIds))

  // Count bills by status
  const pendingBills = allBills.filter((b) => b.status === "pending").length
  const processingBills = allBills.filter((b) => b.status === "processing").length
  const processedBills = allBills.filter((b) => b.status === "processed").length
  const errorBills = allBills.filter((b) => b.status === "error").length

  // Count bills with invoice/payment data
  const billsWithInvoices = allBills.filter((b) => b.invoiceExtractionData !== null).length
  const billsWithPayables = allBills.filter((b) => b.paymentExtractionData !== null).length

  // Get active extraction rules for these properties
  const rules = await db
    .select()
    .from(extractionRulesTable)
    .where(inArray(extractionRulesTable.propertyId, propertyIds))
  const activeRules = rules.filter((r) => r.isActive).length

  return {
    properties: propertiesCount,
    tenants: tenantsCount,
    pendingBills,
    processingBills,
    processedBills,
    errorBills,
    billsWithInvoices,
    billsWithPayables,
    activeRules,
    totalBills: allBills.length
  }
}

