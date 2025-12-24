import { db } from "@/db"
import {
  rentalInvoiceInstancesTable,
  rentalInvoiceTemplatesTable,
  propertiesTable,
  tenantsTable,
  landlordsTable,
  rentalAgentsTable,
  propertyManagementsTable,
  type SelectRentalInvoiceInstance,
  type SelectRentalInvoiceTemplate,
  type SelectProperty,
  type SelectTenant,
  type SelectLandlord,
  type SelectRentalAgent
} from "@/db/schema"
import { eq, and, inArray, gte, lte, or } from "drizzle-orm"

export interface RentalInvoiceInstanceWithDetails extends SelectRentalInvoiceInstance {
  property: SelectProperty
  tenant: SelectTenant
  landlord?: SelectLandlord | null
  rentalAgent?: SelectRentalAgent | null
  billingAddress?: string | null
  template?: SelectRentalInvoiceTemplate | null
}

/**
 * Get rental invoice instance with all related details
 */
export async function getRentalInvoiceInstanceWithDetailsQuery(
  instanceId: string
): Promise<RentalInvoiceInstanceWithDetails | null> {
  const instance = await db.query.rentalInvoiceInstances.findFirst({
    where: eq(rentalInvoiceInstancesTable.id, instanceId)
  })

  if (!instance) {
    return null
  }

  // Get property
  const property = await db.query.properties.findFirst({
    where: eq(propertiesTable.id, instance.propertyId)
  })

  if (!property) {
    return null
  }

  // Get tenant
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenantsTable.id, instance.tenantId)
  })

  if (!tenant) {
    return null
  }

  // Get landlord
  const landlord = await db.query.landlords.findFirst({
    where: eq(landlordsTable.id, property.landlordId)
  })

  // Get rental agent (if property is managed)
  let rentalAgent: SelectRentalAgent | null = null
  let billingAddress: string | null = null

  const propertyManagement = await db.query.propertyManagements.findFirst({
    where: and(
      eq(propertyManagementsTable.propertyId, instance.propertyId),
      eq(propertyManagementsTable.isActive, true)
    )
  })

  if (propertyManagement) {
    rentalAgent = await db.query.rentalAgents.findFirst({
      where: eq(rentalAgentsTable.id, propertyManagement.rentalAgentId)
    })
    if (rentalAgent?.address) {
      billingAddress = rentalAgent.address
    }
  }

  // Fallback to landlord address if no agent address
  if (!billingAddress && landlord?.address) {
    billingAddress = landlord.address
  }

  // Get rental invoice template
  const template = await db.query.rentalInvoiceTemplates.findFirst({
    where: eq(rentalInvoiceTemplatesTable.id, instance.rentalInvoiceTemplateId)
  })

  return {
    ...instance,
    property,
    tenant,
    landlord: landlord || null,
    rentalAgent: rentalAgent || null,
    billingAddress,
    template: template || null
  }
}

export interface InvoiceFilters {
  propertyId?: string
  tenantId?: string
  status?: string
  startDate?: Date
  endDate?: Date
}

/**
 * Get rental invoice instances filtered by status
 */
export async function getRentalInvoiceInstancesByStatusQuery(
  status: string,
  filters?: InvoiceFilters
): Promise<SelectRentalInvoiceInstance[]> {
  const conditions: any[] = [eq(rentalInvoiceInstancesTable.status, status)]

  if (filters?.propertyId) {
    conditions.push(eq(rentalInvoiceInstancesTable.propertyId, filters.propertyId))
  }

  if (filters?.tenantId) {
    conditions.push(eq(rentalInvoiceInstancesTable.tenantId, filters.tenantId))
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions)

  const instances = await db.query.rentalInvoiceInstances.findMany({
    where: whereClause,
    orderBy: (instances, { desc }) => [
      desc(instances.periodYear),
      desc(instances.periodMonth)
    ]
  })

  return instances
}

/**
 * Get rental invoice instances filtered by date range
 */
export async function getRentalInvoiceInstancesByDateRangeQuery(
  startDate: Date,
  endDate: Date,
  filters?: InvoiceFilters
): Promise<SelectRentalInvoiceInstance[]> {
  const startYear = startDate.getFullYear()
  const startMonth = startDate.getMonth() + 1
  const endYear = endDate.getFullYear()
  const endMonth = endDate.getMonth() + 1

  const conditions: any[] = []

  // Date range filter: period is within or overlaps the date range
  // Period is within range if: (periodYear > startYear OR (periodYear === startYear AND periodMonth >= startMonth))
  // AND (periodYear < endYear OR (periodYear === endYear AND periodMonth <= endMonth))
  const dateConditions: any[] = []

  // Start date condition: period >= start date
  dateConditions.push(
    or(
      // Period year > start year
      gte(rentalInvoiceInstancesTable.periodYear, startYear + 1),
      // OR period year === start year AND period month >= start month
      and(
        eq(rentalInvoiceInstancesTable.periodYear, startYear),
        gte(rentalInvoiceInstancesTable.periodMonth, startMonth)
      )
    )
  )

  // End date condition: period <= end date
  dateConditions.push(
    or(
      // Period year < end year
      lte(rentalInvoiceInstancesTable.periodYear, endYear - 1),
      // OR period year === end year AND period month <= end month
      and(
        eq(rentalInvoiceInstancesTable.periodYear, endYear),
        lte(rentalInvoiceInstancesTable.periodMonth, endMonth)
      )
    )
  )

  if (dateConditions.length > 0) {
    conditions.push(and(...dateConditions))
  }

  if (filters?.propertyId) {
    conditions.push(eq(rentalInvoiceInstancesTable.propertyId, filters.propertyId))
  }

  if (filters?.tenantId) {
    conditions.push(eq(rentalInvoiceInstancesTable.tenantId, filters.tenantId))
  }

  if (filters?.status) {
    conditions.push(eq(rentalInvoiceInstancesTable.status, filters.status))
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions)

  const instances = await db.query.rentalInvoiceInstances.findMany({
    where: whereClause,
    orderBy: (instances, { desc }) => [
      desc(instances.periodYear),
      desc(instances.periodMonth)
    ]
  })

  return instances
}

/**
 * Get all rental invoice instances for a property
 */
export async function getRentalInvoiceInstancesByPropertyIdQuery(
  propertyId: string,
  filters?: InvoiceFilters
): Promise<SelectRentalInvoiceInstance[]> {
  const conditions: any[] = [eq(rentalInvoiceInstancesTable.propertyId, propertyId)]

  if (filters?.tenantId) {
    conditions.push(eq(rentalInvoiceInstancesTable.tenantId, filters.tenantId))
  }

  if (filters?.status) {
    conditions.push(eq(rentalInvoiceInstancesTable.status, filters.status))
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions)

  const instances = await db.query.rentalInvoiceInstances.findMany({
    where: whereClause,
    orderBy: (instances, { desc }) => [
      desc(instances.periodYear),
      desc(instances.periodMonth)
    ]
  })

  return instances
}

/**
 * Get all rental invoice instances for a tenant
 */
export async function getRentalInvoiceInstancesByTenantIdQuery(
  tenantId: string,
  filters?: InvoiceFilters
): Promise<SelectRentalInvoiceInstance[]> {
  const conditions: any[] = [eq(rentalInvoiceInstancesTable.tenantId, tenantId)]

  if (filters?.status) {
    conditions.push(eq(rentalInvoiceInstancesTable.status, filters.status))
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions)

  const instances = await db.query.rentalInvoiceInstances.findMany({
    where: whereClause,
    orderBy: (instances, { desc }) => [
      desc(instances.periodYear),
      desc(instances.periodMonth)
    ]
  })

  return instances
}

/**
 * Get overdue invoices (status is "sent" and due date has passed)
 */
export async function getOverdueInvoicesQuery(
  filters?: InvoiceFilters
): Promise<SelectRentalInvoiceInstance[]> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const conditions: any[] = [eq(rentalInvoiceInstancesTable.status, "sent")]

  // Get all sent invoices and filter in memory for due date check
  // (since due date is in JSONB invoiceData, we can't filter in SQL easily)
  const sentInstances = await db.query.rentalInvoiceInstances.findMany({
    where: conditions.length === 1 ? conditions[0] : and(...conditions),
    orderBy: (instances, { desc }) => [
      desc(instances.periodYear),
      desc(instances.periodMonth)
    ]
  })

  // Filter by due date from invoiceData
  const overdueInstances = sentInstances.filter((instance) => {
    if (!instance.invoiceData) {
      return false
    }

    const invoiceData = instance.invoiceData as any
    if (!invoiceData.dueDate) {
      return false
    }

    const dueDate = new Date(invoiceData.dueDate)
    return dueDate < now
  })

  // Apply additional filters
  let filtered = overdueInstances

  if (filters?.propertyId) {
    filtered = filtered.filter((i) => i.propertyId === filters.propertyId)
  }

  if (filters?.tenantId) {
    filtered = filtered.filter((i) => i.tenantId === filters.tenantId)
  }

  return filtered
}

