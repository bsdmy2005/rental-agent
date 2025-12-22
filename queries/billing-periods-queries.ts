import { db } from "@/db"
import { billingPeriodsTable, type SelectBillingPeriod } from "@/db/schema"
import { eq, and, inArray, or, gte, lte } from "drizzle-orm"

export async function getBillingPeriodByIdQuery(
  periodId: string
): Promise<SelectBillingPeriod | null> {
  const [period] = await db
    .select()
    .from(billingPeriodsTable)
    .where(eq(billingPeriodsTable.id, periodId))
    .limit(1)

  return period || null
}

export async function getBillingPeriodsByPropertyIdQuery(
  propertyId: string,
  periodType?: "invoice" | "payable"
): Promise<SelectBillingPeriod[]> {
  const conditions: any[] = [eq(billingPeriodsTable.propertyId, propertyId)]

  if (periodType) {
    conditions.push(eq(billingPeriodsTable.periodType, periodType))
  }

  const periods = await db
    .select()
    .from(billingPeriodsTable)
    .where(and(...conditions))

  // Sort by year and month
  return periods.sort((a, b) => {
    if (a.periodYear !== b.periodYear) {
      return a.periodYear - b.periodYear
    }
    return a.periodMonth - b.periodMonth
  })
}

export async function getBillingPeriodsByLeaseAgreementIdQuery(
  leaseAgreementId: string
): Promise<SelectBillingPeriod[]> {
  const periods = await db
    .select()
    .from(billingPeriodsTable)
    .where(eq(billingPeriodsTable.leaseAgreementId, leaseAgreementId))

  // Sort by year and month
  return periods.sort((a, b) => {
    if (a.periodYear !== b.periodYear) {
      return a.periodYear - b.periodYear
    }
    return a.periodMonth - b.periodMonth
  })
}

export async function findBillingPeriodByYearMonthQuery(
  propertyId: string,
  year: number,
  month: number,
  periodType?: "invoice" | "payable"
): Promise<SelectBillingPeriod | null> {
  const conditions: any[] = [
    eq(billingPeriodsTable.propertyId, propertyId),
    eq(billingPeriodsTable.periodYear, year),
    eq(billingPeriodsTable.periodMonth, month)
  ]

  if (periodType) {
    conditions.push(eq(billingPeriodsTable.periodType, periodType))
  }

  const [period] = await db
    .select()
    .from(billingPeriodsTable)
    .where(and(...conditions))
    .limit(1)

  return period || null
}

export async function getBillingPeriodsByPropertyIdsQuery(
  propertyIds: string[],
  periodType?: "invoice" | "payable"
): Promise<Map<string, SelectBillingPeriod[]>> {
  if (propertyIds.length === 0) {
    return new Map()
  }

  const conditions: any[] = [inArray(billingPeriodsTable.propertyId, propertyIds)]

  if (periodType) {
    conditions.push(eq(billingPeriodsTable.periodType, periodType))
  }

  const periods = await db
    .select()
    .from(billingPeriodsTable)
    .where(and(...conditions))

  // Sort by year and month
  const sortedPeriods = periods.sort((a, b) => {
    if (a.periodYear !== b.periodYear) {
      return a.periodYear - b.periodYear
    }
    return a.periodMonth - b.periodMonth
  })

  // Group by propertyId
  const periodsByProperty = new Map<string, SelectBillingPeriod[]>()
  for (const period of sortedPeriods) {
    if (!periodsByProperty.has(period.propertyId)) {
      periodsByProperty.set(period.propertyId, [])
    }
    periodsByProperty.get(period.propertyId)!.push(period)
  }

  return periodsByProperty
}

export async function getPayablePeriodsForRollingWindowQuery(
  propertyId: string
): Promise<Array<{ periodYear: number; periodMonth: number }>> {
  const periods = await db
    .select({
      periodYear: billingPeriodsTable.periodYear,
      periodMonth: billingPeriodsTable.periodMonth
    })
    .from(billingPeriodsTable)
    .where(
      and(
        eq(billingPeriodsTable.propertyId, propertyId),
        eq(billingPeriodsTable.periodType, "payable"),
        eq(billingPeriodsTable.isActive, true)
      )
    )

  // Sort by year and month
  return periods.sort((a, b) => {
    if (a.periodYear !== b.periodYear) {
      return a.periodYear - b.periodYear
    }
    return a.periodMonth - b.periodMonth
  })
}

