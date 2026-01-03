"use server"

import { db } from "@/db"
import {
  billingPeriodsTable,
  type InsertBillingPeriod,
  type SelectBillingPeriod
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"
import { getPayablePeriodsForRollingWindowQuery } from "@/queries/billing-periods-queries"

/**
 * Generate monthly periods between two dates
 */
function generateMonthlyPeriods(startDate: Date, endDate: Date): Array<{
  year: number
  month: number
  periodStartDate: Date
  periodEndDate: Date
}> {
  const periods: Array<{
    year: number
    month: number
    periodStartDate: Date
    periodEndDate: Date
  }> = []

  const current = new Date(startDate)
  current.setDate(1) // Start from first day of month

  while (current <= endDate) {
    const year = current.getFullYear()
    const month = current.getMonth() + 1 // 1-12

    // First day of the month
    const periodStartDate = new Date(year, month - 1, 1)

    // Last day of the month
    const periodEndDate = new Date(year, month, 0)

    periods.push({
      year,
      month,
      periodStartDate,
      periodEndDate
    })

    // Move to next month
    current.setMonth(current.getMonth() + 1)
  }

  return periods
}

/**
 * Generate ALL invoice periods for a lease (100% aligned to lease dates)
 * Links periods to the tenant's single rental invoice template
 */
async function generateInvoicePeriodsForLease(
  propertyId: string,
  tenantId: string,
  leaseAgreementId: string,
  leaseStartDate: Date,
  leaseEndDate: Date,
  expectedBillTypes?: string[]
): Promise<InsertBillingPeriod[]> {
  console.log(
    `[Period Generator] Generating invoice periods for lease ${leaseAgreementId}: ${leaseStartDate.toISOString()} to ${leaseEndDate.toISOString()}`
  )

  // Validate dates
  if (leaseEndDate < leaseStartDate) {
    throw new Error("Lease end date must be after start date")
  }

  // Get the tenant's single rental invoice template
  const { getRentalInvoiceTemplateByTenantIdAction } = await import(
    "@/actions/rental-invoice-templates-actions"
  )
  const templateResult = await getRentalInvoiceTemplateByTenantIdAction(tenantId)
  const invoiceTemplate = templateResult.isSuccess ? templateResult.data : null

  if (!invoiceTemplate) {
    console.warn(
      `[Period Generator] No rental invoice template found for tenant ${tenantId}, generating periods without template link`
    )
  }

  // Generate monthly periods from lease start to end
  const monthlyPeriods = generateMonthlyPeriods(leaseStartDate, leaseEndDate)

  // Convert to billing period records
  const periods: InsertBillingPeriod[] = monthlyPeriods.map((period) => ({
    propertyId,
    tenantId,
    leaseAgreementId,
    rentalInvoiceTemplateId: invoiceTemplate?.id || null,
    periodType: "invoice",
    periodYear: period.year,
    periodMonth: period.month,
    periodStartDate: period.periodStartDate,
    periodEndDate: period.periodEndDate,
    scheduledGenerationDay: invoiceTemplate?.generationDayOfMonth || null,
    expectedBillTypes: expectedBillTypes ? (expectedBillTypes as unknown as Record<string, unknown>) : null,
    generationSource: "lease_upload",
    isActive: true
  }))

  console.log(
    `[Period Generator] ✓ Generated ${periods.length} invoice periods${invoiceTemplate ? ` linked to template ${invoiceTemplate.id}` : ""}`
  )

  return periods
}

/**
 * Generate payable periods manually (user-initiated)
 */
function generatePayablePeriodsManually(
  propertyId: string,
  startDate: Date,
  durationMonths: number,
  payableTemplateId: string,
  scheduledDayOfMonth: number
): InsertBillingPeriod[] {
  console.log(
    `[Period Generator] Generating ${durationMonths} payable periods starting from ${startDate.toISOString()}`
  )

  if (durationMonths <= 0) {
    throw new Error("Duration must be greater than 0")
  }

  // Calculate end date
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + durationMonths - 1) // -1 because we include the start month
  endDate.setDate(0) // Last day of the final month

  // Generate monthly periods
  const monthlyPeriods = generateMonthlyPeriods(startDate, endDate)

  // Convert to billing period records
  const periods: InsertBillingPeriod[] = monthlyPeriods.map((period) => ({
    propertyId,
    tenantId: null, // Payables don't have tenant
    leaseAgreementId: null, // Payables are independent of leases
    payableTemplateId,
    periodType: "payable",
    periodYear: period.year,
    periodMonth: period.month,
    periodStartDate: period.periodStartDate,
    periodEndDate: period.periodEndDate,
    scheduledPaymentDay: scheduledDayOfMonth,
    expectedBillTypes: null,
    generationSource: "manual",
    isActive: true
  }))

  console.log(`[Period Generator] ✓ Generated ${periods.length} payable periods`)

  return periods
}

/**
 * Ensure payable periods have a 24-month rolling window - generates periods per payable template
 */
async function ensurePayablePeriodsRollingWindow(
  propertyId: string,
  existingPeriods: Array<{ periodYear: number; periodMonth: number; payableTemplateId: string | null }>
): Promise<InsertBillingPeriod[]> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Calculate target end date (24 months from now)
  const targetEndDate = new Date(now)
  targetEndDate.setMonth(targetEndDate.getMonth() + 24)
  targetEndDate.setDate(0) // Last day of the target month

  // Get all active payable templates and their schedules for this property
  const { getPayableTemplatesByPropertyIdAction } = await import("@/actions/payable-templates-actions")
  const { getPayableScheduleByTemplateIdAction } = await import("@/actions/payable-schedules-actions")
  
  const templatesResult = await getPayableTemplatesByPropertyIdAction(propertyId)
  if (!templatesResult.isSuccess || !templatesResult.data) {
    console.log(`[Period Generator] No payable templates found for property ${propertyId}`)
    return []
  }

  const activeTemplates = templatesResult.data.filter((t) => t.isActive)
  if (activeTemplates.length === 0) {
    console.log(`[Period Generator] No active payable templates for property ${propertyId}`)
    return []
  }

  const allPeriods: InsertBillingPeriod[] = []

  // Generate periods for each template
  for (const template of activeTemplates) {
    // Get schedule for this template
    const scheduleResult = await getPayableScheduleByTemplateIdAction(template.id)
    if (!scheduleResult.isSuccess || !scheduleResult.data || !scheduleResult.data.isActive) {
      console.log(`[Period Generator] No active schedule for template ${template.id}, skipping`)
      continue
    }

    const scheduledPaymentDay = scheduleResult.data.scheduledDayOfMonth

    // Find latest existing period for this template
    const templatePeriods = existingPeriods.filter((p) => p.payableTemplateId === template.id)
    let latestPeriod: { year: number; month: number } | null = null
    
    if (templatePeriods.length > 0) {
      const sorted = [...templatePeriods].sort((a, b) => {
        if (a.periodYear !== b.periodYear) {
          return b.periodYear - a.periodYear
        }
        return b.periodMonth - a.periodMonth
      })
      latestPeriod = {
        year: sorted[0].periodYear,
        month: sorted[0].periodMonth
      }
    }

    // Determine start date for generation
    let generationStartDate: Date
    if (latestPeriod) {
      generationStartDate = new Date(latestPeriod.year, latestPeriod.month, 1)
      generationStartDate.setMonth(generationStartDate.getMonth() + 1)
    } else {
      generationStartDate = new Date(currentYear, currentMonth - 1, 1)
    }

    // Only generate if we need to extend beyond existing periods
    if (generationStartDate > targetEndDate) {
      continue
    }

    // Generate periods from generation start to target end
    const monthlyPeriods = generateMonthlyPeriods(generationStartDate, targetEndDate)

    // Convert to billing period records - one per template per month
    const periods: InsertBillingPeriod[] = monthlyPeriods.map((period) => ({
      propertyId,
      tenantId: null,
      leaseAgreementId: null,
      payableTemplateId: template.id,
      periodType: "payable",
      periodYear: period.year,
      periodMonth: period.month,
      periodStartDate: period.periodStartDate,
      periodEndDate: period.periodEndDate,
      scheduledPaymentDay,
      expectedBillTypes: null,
      generationSource: "cron",
      isActive: true
    }))

    allPeriods.push(...periods)
  }

  console.log(
    `[Period Generator] ✓ Generated ${allPeriods.length} payable periods for rolling window (property ${propertyId})`
  )

  return allPeriods
}

/**
 * Generate invoice periods for selected templates with their generation days
 */
export async function generateInvoicePeriodsForTemplatesAction(
  propertyId: string,
  tenantId: string,
  startDate: Date,
  endDate: Date,
  templateConfigs: Array<{ templateId: string; generationDay: number }>
): Promise<ActionState<SelectBillingPeriod[]>> {
  try {
    if (templateConfigs.length === 0) {
      return {
        isSuccess: false,
        message: "No templates selected"
      }
    }

    // Get tenant and lease info
    const { getTenantByIdQuery } = await import("@/queries/tenants-queries")
    const tenant = await getTenantByIdQuery(tenantId)
    if (!tenant) {
      return {
        isSuccess: false,
        message: "Tenant not found"
      }
    }

    const leaseAgreementId = tenant.leaseAgreementId || null

    // Generate monthly periods
    const monthlyPeriods = generateMonthlyPeriods(startDate, endDate)

    // Generate periods for each template
    const allPeriods: InsertBillingPeriod[] = []

    for (const config of templateConfigs) {
      const periods: InsertBillingPeriod[] = monthlyPeriods.map((period) => ({
        propertyId,
        tenantId,
        leaseAgreementId,
        rentalInvoiceTemplateId: config.templateId,
        periodType: "invoice",
        periodYear: period.year,
        periodMonth: period.month,
        periodStartDate: period.periodStartDate,
        periodEndDate: period.periodEndDate,
        scheduledGenerationDay: config.generationDay,
        expectedBillTypes: null,
        generationSource: "manual",
        isActive: true
      }))

      allPeriods.push(...periods)
    }

    // Check for duplicates before inserting
    const existingPeriods = await db
      .select()
      .from(billingPeriodsTable)
      .where(
        and(
          eq(billingPeriodsTable.propertyId, propertyId),
          eq(billingPeriodsTable.periodType, "invoice"),
          eq(billingPeriodsTable.tenantId, tenantId)
        )
      )

    const existingSet = new Set(
      existingPeriods.map((p) => `${p.periodYear}-${p.periodMonth}-${p.rentalInvoiceTemplateId || 'null'}`)
    )

    const uniquePeriods = allPeriods.filter(
      (p) => !existingSet.has(`${p.periodYear}-${p.periodMonth}-${p.rentalInvoiceTemplateId || 'null'}`)
    )

    if (uniquePeriods.length === 0) {
      return {
        isSuccess: true,
        message: "All periods already exist",
        data: []
      }
    }

    // Insert new periods
    const insertedPeriods = await db.insert(billingPeriodsTable).values(uniquePeriods).returning()

    return {
      isSuccess: true,
      message: `Generated ${insertedPeriods.length} invoice periods`,
      data: insertedPeriods
    }
  } catch (error) {
    console.error("Error generating invoice periods:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate invoice periods"
    }
  }
}

export async function generateInvoicePeriodsForLeaseAction(
  propertyId: string,
  tenantId: string,
  leaseAgreementId: string,
  leaseStartDate: Date,
  leaseEndDate: Date,
  expectedBillTypes?: string[]
): Promise<ActionState<SelectBillingPeriod[]>> {
  try {
    // Delete existing invoice periods for this lease (regeneration)
    await db
      .delete(billingPeriodsTable)
      .where(
        and(
          eq(billingPeriodsTable.leaseAgreementId, leaseAgreementId),
          eq(billingPeriodsTable.periodType, "invoice")
        )
      )

    // Generate new periods (now async to fetch template)
    const periods = await generateInvoicePeriodsForLease(
      propertyId,
      tenantId,
      leaseAgreementId,
      leaseStartDate,
      leaseEndDate,
      expectedBillTypes
    )

    // Insert all periods
    const insertedPeriods = await db.insert(billingPeriodsTable).values(periods).returning()

    return {
      isSuccess: true,
      message: `Generated ${insertedPeriods.length} invoice periods`,
      data: insertedPeriods
    }
  } catch (error) {
    console.error("Error generating invoice periods:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate invoice periods"
    }
  }
}

/**
 * Generate payable periods for selected templates with their payment days
 */
export async function generatePayablePeriodsForTemplatesAction(
  propertyId: string,
  startDate: Date,
  durationMonths: number,
  templateConfigs: Array<{ templateId: string; paymentDay: number }>
): Promise<ActionState<SelectBillingPeriod[]>> {
  try {
    if (templateConfigs.length === 0) {
      return {
        isSuccess: false,
        message: "No templates selected"
      }
    }

    // Calculate end date
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + durationMonths - 1)
    endDate.setDate(0) // Last day of the final month

    // Generate monthly periods
    const monthlyPeriods = generateMonthlyPeriods(startDate, endDate)

    // Generate periods for each template
    const allPeriods: InsertBillingPeriod[] = []

    for (const config of templateConfigs) {
      const periods: InsertBillingPeriod[] = monthlyPeriods.map((period) => ({
        propertyId,
        tenantId: null,
        leaseAgreementId: null,
        payableTemplateId: config.templateId,
        periodType: "payable",
        periodYear: period.year,
        periodMonth: period.month,
        periodStartDate: period.periodStartDate,
        periodEndDate: period.periodEndDate,
        scheduledPaymentDay: config.paymentDay,
        expectedBillTypes: null,
        generationSource: "manual",
        isActive: true
      }))

      allPeriods.push(...periods)
    }

    // Check for duplicates before inserting
    const existingPeriods = await db
      .select()
      .from(billingPeriodsTable)
      .where(
        and(
          eq(billingPeriodsTable.propertyId, propertyId),
          eq(billingPeriodsTable.periodType, "payable")
        )
      )

    const existingSet = new Set(
      existingPeriods.map((p) => `${p.periodYear}-${p.periodMonth}-${p.payableTemplateId || 'null'}`)
    )

    const uniquePeriods = allPeriods.filter(
      (p) => !existingSet.has(`${p.periodYear}-${p.periodMonth}-${p.payableTemplateId || 'null'}`)
    )

    if (uniquePeriods.length === 0) {
      return {
        isSuccess: true,
        message: "All periods already exist",
        data: []
      }
    }

    // Insert new periods
    const insertedPeriods = await db.insert(billingPeriodsTable).values(uniquePeriods).returning()

    return {
      isSuccess: true,
      message: `Generated ${insertedPeriods.length} payable periods`,
      data: insertedPeriods
    }
  } catch (error) {
    console.error("Error generating payable periods:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate payable periods"
    }
  }
}

export async function generatePayablePeriodsManuallyAction(
  propertyId: string,
  startDate: Date,
  durationMonths: number,
  payableTemplateId?: string
): Promise<ActionState<SelectBillingPeriod[]>> {
  try {
    // If no template specified, generate for all active templates with schedules
    if (!payableTemplateId) {
      const { getPayableTemplatesByPropertyIdAction } = await import("@/actions/payable-templates-actions")
      const { getPayableScheduleByTemplateIdAction } = await import("@/actions/payable-schedules-actions")
      
      const templatesResult = await getPayableTemplatesByPropertyIdAction(propertyId)
      if (!templatesResult.isSuccess || !templatesResult.data) {
        return {
          isSuccess: false,
          message: "No payable templates found for this property"
        }
      }

      const activeTemplates = templatesResult.data.filter((t) => t.isActive)
      const allPeriods: InsertBillingPeriod[] = []

      for (const template of activeTemplates) {
        const scheduleResult = await getPayableScheduleByTemplateIdAction(template.id)
        if (!scheduleResult.isSuccess || !scheduleResult.data || !scheduleResult.data.isActive) {
          continue
        }

        const periods = await generatePayablePeriodsManually(
          propertyId,
          startDate,
          durationMonths,
          template.id,
          scheduleResult.data.scheduledDayOfMonth
        )
        allPeriods.push(...periods)
      }

      // Check for duplicates before inserting
      const existingPeriods = await db
        .select()
        .from(billingPeriodsTable)
        .where(
          and(
            eq(billingPeriodsTable.propertyId, propertyId),
            eq(billingPeriodsTable.periodType, "payable")
          )
        )

      const existingSet = new Set(
        existingPeriods.map((p) => `${p.periodYear}-${p.periodMonth}-${p.payableTemplateId || 'null'}`)
      )

      const uniquePeriods = allPeriods.filter(
        (p) => !existingSet.has(`${p.periodYear}-${p.periodMonth}-${p.payableTemplateId || 'null'}`)
      )

      if (uniquePeriods.length === 0) {
        return {
          isSuccess: true,
          message: "All periods already exist",
          data: []
        }
      }

      const insertedPeriods = await db.insert(billingPeriodsTable).values(uniquePeriods).returning()

      return {
        isSuccess: true,
        message: `Generated ${insertedPeriods.length} payable periods`,
        data: insertedPeriods
      }
    } else {
      // Generate for specific template
      const { getPayableScheduleByTemplateIdAction } = await import("@/actions/payable-schedules-actions")
      const scheduleResult = await getPayableScheduleByTemplateIdAction(payableTemplateId)
      
      if (!scheduleResult.isSuccess || !scheduleResult.data || !scheduleResult.data.isActive) {
        return {
          isSuccess: false,
          message: "No active schedule found for this payable template"
        }
      }

      const periods = await generatePayablePeriodsManually(
        propertyId,
        startDate,
        durationMonths,
        payableTemplateId,
        scheduleResult.data.scheduledDayOfMonth
      )

      // Check for duplicates before inserting
      const existingPeriods = await db
        .select()
        .from(billingPeriodsTable)
        .where(
          and(
            eq(billingPeriodsTable.propertyId, propertyId),
            eq(billingPeriodsTable.periodType, "payable"),
            eq(billingPeriodsTable.payableTemplateId, payableTemplateId)
          )
        )

      const existingSet = new Set(
        existingPeriods.map((p) => `${p.periodYear}-${p.periodMonth}`)
      )

      const uniquePeriods = periods.filter(
        (p) => !existingSet.has(`${p.periodYear}-${p.periodMonth}`)
      )

      if (uniquePeriods.length === 0) {
        return {
          isSuccess: true,
          message: "All periods already exist",
          data: []
        }
      }

      const insertedPeriods = await db.insert(billingPeriodsTable).values(uniquePeriods).returning()

      return {
        isSuccess: true,
        message: `Generated ${insertedPeriods.length} payable periods`,
        data: insertedPeriods
      }
    }
  } catch (error) {
    console.error("Error generating payable periods:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate payable periods"
    }
  }
}

export async function regenerateInvoicePeriodsAction(
  leaseAgreementId: string,
  leaseStartDate: Date,
  leaseEndDate: Date
): Promise<ActionState<SelectBillingPeriod[]>> {
  try {
    // Get the lease agreement to find property and tenant
    const { getLeaseAgreementByIdQuery } = await import("@/queries/lease-agreements-queries")
    const lease = await getLeaseAgreementByIdQuery(leaseAgreementId)

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    // CRITICAL: Always use effective dates (which account for manual overrides)
    // The parameters are kept for backward compatibility but we use effective dates from the lease
    const effectiveStartDate = lease.effectiveStartDate
    const effectiveEndDate = lease.effectiveEndDate

    if (!effectiveStartDate || !effectiveEndDate) {
      return {
        isSuccess: false,
        message: "Lease agreement missing effective dates"
      }
    }

    // Get existing periods to preserve expectedBillTypes
    const existingPeriods = await db
      .select()
      .from(billingPeriodsTable)
      .where(eq(billingPeriodsTable.leaseAgreementId, leaseAgreementId))
      .limit(1)

    const expectedBillTypes =
      existingPeriods.length > 0 && existingPeriods[0].expectedBillTypes
        ? (existingPeriods[0].expectedBillTypes as unknown as string[])
        : undefined

    // Regenerate periods using effective dates
    return await generateInvoicePeriodsForLeaseAction(
      lease.propertyId,
      lease.tenantId,
      leaseAgreementId,
      effectiveStartDate,
      effectiveEndDate,
      expectedBillTypes
    )
  } catch (error) {
    console.error("Error regenerating invoice periods:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to regenerate invoice periods"
    }
  }
}

export async function updateBillingPeriodAction(
  periodId: string,
  data: Partial<InsertBillingPeriod>
): Promise<ActionState<SelectBillingPeriod>> {
  try {
    const [updatedPeriod] = await db
      .update(billingPeriodsTable)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(billingPeriodsTable.id, periodId))
      .returning()

    if (!updatedPeriod) {
      return { isSuccess: false, message: "Period not found" }
    }

    return {
      isSuccess: true,
      message: "Period updated successfully",
      data: updatedPeriod
    }
  } catch (error) {
    console.error("Error updating period:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to update period"
    }
  }
}

export async function deleteAllPeriodsByTypeAction(
  propertyId: string,
  periodType: "invoice" | "payable"
): Promise<ActionState<number>> {
  try {
    const result = await db
      .delete(billingPeriodsTable)
      .where(
        and(
          eq(billingPeriodsTable.propertyId, propertyId),
          eq(billingPeriodsTable.periodType, periodType)
        )
      )
      .returning({ id: billingPeriodsTable.id })

    return {
      isSuccess: true,
      message: `Deleted ${result.length} ${periodType} periods`,
      data: result.length
    }
  } catch (error) {
    console.error(`Error deleting ${periodType} periods:`, error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : `Failed to delete ${periodType} periods`
    }
  }
}

/**
 * Delete ALL billing periods from the entire system (DEV ONLY)
 * This will also cascade delete period_bill_matches
 */
export async function deleteAllBillingPeriodsAction(): Promise<ActionState<number>> {
  try {
    // Delete all billing periods - this will cascade delete period_bill_matches
    const result = await db.delete(billingPeriodsTable).returning({ id: billingPeriodsTable.id })

    return {
      isSuccess: true,
      message: `Deleted ${result.length} billing periods from the entire system`,
      data: result.length
    }
  } catch (error) {
    console.error("Error deleting all billing periods:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to delete all billing periods"
    }
  }
}

export async function getPeriodsForPropertyAction(
  propertyId: string,
  periodType?: "invoice" | "payable"
): Promise<ActionState<SelectBillingPeriod[]>> {
  try {
    const { getBillingPeriodsByPropertyIdQuery } = await import("@/queries/billing-periods-queries")
    const periods = await getBillingPeriodsByPropertyIdQuery(propertyId, periodType)

    return {
      isSuccess: true,
      message: "Periods retrieved successfully",
      data: periods
    }
  } catch (error) {
    console.error("Error getting periods:", error)
    return { isSuccess: false, message: "Failed to get periods" }
  }
}

export async function ensurePayablePeriodsRollingWindowAction(
  propertyId: string
): Promise<ActionState<SelectBillingPeriod[]>> {
  try {
    // Get existing payable periods (now includes payableTemplateId)
    const existingPeriods = await db
      .select({
        periodYear: billingPeriodsTable.periodYear,
        periodMonth: billingPeriodsTable.periodMonth,
        payableTemplateId: billingPeriodsTable.payableTemplateId
      })
      .from(billingPeriodsTable)
      .where(
        and(
          eq(billingPeriodsTable.propertyId, propertyId),
          eq(billingPeriodsTable.periodType, "payable")
        )
      )

    // Generate missing periods (now async and per template)
    const newPeriods = await ensurePayablePeriodsRollingWindow(propertyId, existingPeriods)

    if (newPeriods.length === 0) {
      return {
        isSuccess: true,
        message: "Rolling window already complete",
        data: []
      }
    }

    // Check for duplicates before inserting (per template)
    const existingSet = new Set(
      existingPeriods.map((p) => 
        `${p.periodYear}-${p.periodMonth}-${p.payableTemplateId || 'null'}`
      )
    )

    const uniquePeriods = newPeriods.filter(
      (p) => !existingSet.has(`${p.periodYear}-${p.periodMonth}-${p.payableTemplateId || 'null'}`)
    )

    if (uniquePeriods.length === 0) {
      return {
        isSuccess: true,
        message: "All periods already exist",
        data: []
      }
    }

    // Insert new periods
    const insertedPeriods = await db.insert(billingPeriodsTable).values(uniquePeriods).returning()

    return {
      isSuccess: true,
      message: `Generated ${insertedPeriods.length} payable periods for rolling window`,
      data: insertedPeriods
    }
  } catch (error) {
    console.error("Error ensuring payable periods rolling window:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to ensure rolling window"
    }
  }
}

