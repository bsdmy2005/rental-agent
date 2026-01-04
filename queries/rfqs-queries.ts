import { db } from "@/db"
import {
  quoteRequestsTable,
  quotesTable,
  propertiesTable,
  serviceProvidersTable,
  incidentsTable,
  type SelectQuoteRequest
} from "@/db/schema"
import { eq, and, or, desc, isNull, inArray, sql } from "drizzle-orm"

export interface RfqWithRelations {
  rfq: SelectQuoteRequest
  property: {
    id: string
    name: string
    suburb: string
    province: string
  } | null
  serviceProvider: {
    id: string
    businessName: string | null
    contactName: string
  } | null
  incident: {
    id: string
    title: string
  } | null
}

export interface RfqGroup {
  groupId: string // The bulkRfqGroupId or the parent RFQ id
  parentRfq: RfqWithRelations
  childRfqs: RfqWithRelations[]
  providerCount: number
  quoteCount: number
  statusAggregation: {
    requested: number
    quoted: number
    approved: number
    rejected: number
    expired: number
  }
}

/**
 * Get RFQs grouped by bulkRfqGroupId
 * Standalone RFQs (bulkRfqGroupId = null) are treated as single-item groups
 */
export async function getRfqGroupsQuery(
  propertyIds: string[]
): Promise<RfqGroup[]> {
  if (propertyIds.length === 0) {
    return []
  }

  // Get all RFQs for these properties
  const rfqs = await db
    .select()
    .from(quoteRequestsTable)
    .where(or(...propertyIds.map((id) => eq(quoteRequestsTable.propertyId, id))))
    .orderBy(desc(quoteRequestsTable.requestedAt))

  if (rfqs.length === 0) {
    return []
  }

  // Get unique IDs for related data
  const uniquePropertyIds = [...new Set(rfqs.map((r) => r.propertyId).filter(Boolean) as string[])]
  const uniqueProviderIds = [...new Set(rfqs.map((r) => r.serviceProviderId))]
  const uniqueIncidentIds = [...new Set(rfqs.map((r) => r.incidentId).filter(Boolean) as string[])]
  const uniqueRfqIds = rfqs.map((r) => r.id)

  // Fetch related data
  const properties =
    uniquePropertyIds.length > 0
      ? await db
          .select({
            id: propertiesTable.id,
            name: propertiesTable.name,
            suburb: propertiesTable.suburb,
            province: propertiesTable.province
          })
          .from(propertiesTable)
          .where(inArray(propertiesTable.id, uniquePropertyIds))
      : []

  const serviceProviders =
    uniqueProviderIds.length > 0
      ? await db
          .select({
            id: serviceProvidersTable.id,
            businessName: serviceProvidersTable.businessName,
            contactName: serviceProvidersTable.contactName
          })
          .from(serviceProvidersTable)
          .where(inArray(serviceProvidersTable.id, uniqueProviderIds))
      : []

  const incidents =
    uniqueIncidentIds.length > 0
      ? await db
          .select({
            id: incidentsTable.id,
            title: incidentsTable.title
          })
          .from(incidentsTable)
          .where(inArray(incidentsTable.id, uniqueIncidentIds))
      : []

  // Get quote counts for all RFQs
  const quoteCounts = await db
    .select({
      quoteRequestId: quotesTable.quoteRequestId,
      count: sql<number>`count(*)::int`
    })
    .from(quotesTable)
    .where(inArray(quotesTable.quoteRequestId, uniqueRfqIds))
    .groupBy(quotesTable.quoteRequestId)

  // Create maps for quick lookup
  const propertyMap = new Map(properties.map((p) => [p.id, p]))
  const providerMap = new Map(serviceProviders.map((p) => [p.id, p]))
  const incidentMap = new Map(incidents.map((i) => [i.id, i]))
  const quoteCountMap = new Map(quoteCounts.map((qc) => [qc.quoteRequestId, qc.count]))

  // Build RfqWithRelations for all RFQs
  const rfqsWithRelations: RfqWithRelations[] = rfqs.map((rfq) => ({
    rfq,
    property: rfq.propertyId ? propertyMap.get(rfq.propertyId) || null : null,
    serviceProvider: providerMap.get(rfq.serviceProviderId) || null,
    incident: rfq.incidentId ? incidentMap.get(rfq.incidentId) || null : null
  }))

  // Group RFQs by bulkRfqGroupId
  // RFQs with the same bulkRfqGroupId belong to the same group
  // RFQs with bulkRfqGroupId = null are standalone (each is its own group)
  const groupsMap = new Map<string, RfqWithRelations[]>()
  const parentMap = new Map<string, RfqWithRelations>() // Maps groupId to parent RFQ

  for (const rfqWithRelations of rfqsWithRelations) {
    const groupId = rfqWithRelations.rfq.bulkRfqGroupId || rfqWithRelations.rfq.id

    if (!groupsMap.has(groupId)) {
      groupsMap.set(groupId, [])
    }

    groupsMap.get(groupId)!.push(rfqWithRelations)

    // Determine parent RFQ: if bulkRfqGroupId is null, this RFQ is its own parent
    // Otherwise, the parent is the RFQ whose id equals bulkRfqGroupId
    if (!rfqWithRelations.rfq.bulkRfqGroupId) {
      // Standalone RFQ - it's its own parent
      parentMap.set(groupId, rfqWithRelations)
    } else {
      // Grouped RFQ - parent is the one with id = bulkRfqGroupId
      if (!parentMap.has(groupId)) {
        // Find the parent RFQ (the one whose id equals bulkRfqGroupId)
        const parent = rfqsWithRelations.find(
          (r) => r.rfq.id === rfqWithRelations.rfq.bulkRfqGroupId
        )
        if (parent) {
          parentMap.set(groupId, parent)
        } else {
          // Fallback: use the first RFQ in the group as parent
          parentMap.set(groupId, rfqWithRelations)
        }
      }
    }
  }

  // Build RfqGroup array
  const groups: RfqGroup[] = []

  for (const [groupId, rfqsInGroup] of groupsMap.entries()) {
    const parent = parentMap.get(groupId) || rfqsInGroup[0]
    const children = rfqsInGroup.filter((r) => r.rfq.id !== parent.rfq.id)

    // Calculate quote count for the group
    const quoteCount = rfqsInGroup.reduce((sum, r) => {
      return sum + (quoteCountMap.get(r.rfq.id) || 0)
    }, 0)

    // Calculate status aggregation
    const statusAggregation = {
      requested: rfqsInGroup.filter((r) => r.rfq.status === "requested").length,
      quoted: rfqsInGroup.filter((r) => r.rfq.status === "quoted").length,
      approved: rfqsInGroup.filter((r) => r.rfq.status === "approved").length,
      rejected: rfqsInGroup.filter((r) => r.rfq.status === "rejected").length,
      expired: rfqsInGroup.filter((r) => r.rfq.status === "expired").length
    }

    groups.push({
      groupId,
      parentRfq: parent,
      childRfqs: children,
      providerCount: rfqsInGroup.length,
      quoteCount,
      statusAggregation
    })
  }

  // Sort groups by most recent requestedAt
  groups.sort((a, b) => {
    const aDate = new Date(a.parentRfq.rfq.requestedAt).getTime()
    const bDate = new Date(b.parentRfq.rfq.requestedAt).getTime()
    return bDate - aDate
  })

  return groups
}

/**
 * Get all RFQs in the same group as the given RFQ
 */
export async function getRfqsInGroupQuery(rfqId: string): Promise<RfqWithRelations[]> {
  // Get the base RFQ
  const [baseRfq] = await db
    .select()
    .from(quoteRequestsTable)
    .where(eq(quoteRequestsTable.id, rfqId))
    .limit(1)

  if (!baseRfq) {
    return []
  }

  // Determine group ID
  const groupId = baseRfq.bulkRfqGroupId || baseRfq.id

  // Get all RFQs in the same group
  const rfqs = await db
    .select()
    .from(quoteRequestsTable)
    .where(
      or(
        eq(quoteRequestsTable.bulkRfqGroupId, groupId),
        eq(quoteRequestsTable.id, groupId) // Include the parent RFQ
      )
    )
    .orderBy(desc(quoteRequestsTable.requestedAt))

  if (rfqs.length === 0) {
    return []
  }

  // Get unique IDs for related data
  const uniquePropertyIds = [...new Set(rfqs.map((r) => r.propertyId).filter(Boolean) as string[])]
  const uniqueProviderIds = [...new Set(rfqs.map((r) => r.serviceProviderId))]
  const uniqueIncidentIds = [...new Set(rfqs.map((r) => r.incidentId).filter(Boolean) as string[])]

  // Fetch related data
  const properties =
    uniquePropertyIds.length > 0
      ? await db
          .select({
            id: propertiesTable.id,
            name: propertiesTable.name,
            suburb: propertiesTable.suburb,
            province: propertiesTable.province
          })
          .from(propertiesTable)
          .where(inArray(propertiesTable.id, uniquePropertyIds))
      : []

  const serviceProviders =
    uniqueProviderIds.length > 0
      ? await db
          .select({
            id: serviceProvidersTable.id,
            businessName: serviceProvidersTable.businessName,
            contactName: serviceProvidersTable.contactName
          })
          .from(serviceProvidersTable)
          .where(inArray(serviceProvidersTable.id, uniqueProviderIds))
      : []

  const incidents =
    uniqueIncidentIds.length > 0
      ? await db
          .select({
            id: incidentsTable.id,
            title: incidentsTable.title
          })
          .from(incidentsTable)
          .where(inArray(incidentsTable.id, uniqueIncidentIds))
      : []

  // Create maps for quick lookup
  const propertyMap = new Map(properties.map((p) => [p.id, p]))
  const providerMap = new Map(serviceProviders.map((p) => [p.id, p]))
  const incidentMap = new Map(incidents.map((i) => [i.id, i]))

  // Build RfqWithRelations
  return rfqs.map((rfq) => ({
    rfq,
    property: rfq.propertyId ? propertyMap.get(rfq.propertyId) || null : null,
    serviceProvider: providerMap.get(rfq.serviceProviderId) || null,
    incident: rfq.incidentId ? incidentMap.get(rfq.incidentId) || null : null
  }))
}

