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

  // Get tenants count (optimized - count in SQL)
  const tenantsCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tenantsTable)
    .where(inArray(tenantsTable.propertyId, propertyIds))
  const tenantsCount = Number(tenantsCountResult[0]?.count || 0)

  // Count bills by status (optimized - count in SQL instead of loading all bills)
  const [pendingBillsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(billsTable)
    .where(
      and(
        inArray(billsTable.propertyId, propertyIds),
        eq(billsTable.status, "pending")
      )
    )
  const pendingBills = Number(pendingBillsResult?.count || 0)

  const [processingBillsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(billsTable)
    .where(
      and(
        inArray(billsTable.propertyId, propertyIds),
        eq(billsTable.status, "processing")
      )
    )
  const processingBills = Number(processingBillsResult?.count || 0)

  const [processedBillsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(billsTable)
    .where(
      and(
        inArray(billsTable.propertyId, propertyIds),
        eq(billsTable.status, "processed")
      )
    )
  const processedBills = Number(processedBillsResult?.count || 0)

  const [errorBillsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(billsTable)
    .where(
      and(
        inArray(billsTable.propertyId, propertyIds),
        eq(billsTable.status, "error")
      )
    )
  const errorBills = Number(errorBillsResult?.count || 0)

  // Count bills with invoice/payment data (optimized - count in SQL)
  const [billsWithInvoicesResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(billsTable)
    .where(
      and(
        inArray(billsTable.propertyId, propertyIds),
        isNotNull(billsTable.invoiceExtractionData)
      )
    )
  const billsWithInvoices = Number(billsWithInvoicesResult?.count || 0)

  const [billsWithPayablesResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(billsTable)
    .where(
      and(
        inArray(billsTable.propertyId, propertyIds),
        isNotNull(billsTable.paymentExtractionData)
      )
    )
  const billsWithPayables = Number(billsWithPayablesResult?.count || 0)

  // Get total bills count (optimized)
  const [totalBillsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(billsTable)
    .where(inArray(billsTable.propertyId, propertyIds))
  const totalBills = Number(totalBillsResult?.count || 0)

  // Get active extraction rules count (optimized - count in SQL)
  const [activeRulesResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(extractionRulesTable)
    .where(
      and(
        inArray(extractionRulesTable.propertyId, propertyIds),
        eq(extractionRulesTable.isActive, true)
      )
    )
  const activeRules = Number(activeRulesResult?.count || 0)

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
    totalBills
  }
}

