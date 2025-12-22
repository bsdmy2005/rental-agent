import { db } from "@/db"
import { 
  billingPeriodsTable, 
  billsTable, 
  billTemplatesTable,
  rentalInvoiceTemplatesTable,
  payableTemplatesTable,
  type SelectBillingPeriod, 
  type SelectBill, 
  type SelectBillTemplate 
} from "@/db/schema"
import { checkInvoiceDependencies, checkPayableDependencies } from "@/lib/dependency-checker"
import { getMatchesByPeriodIdQuery } from "./period-bill-matches-queries"
import { getBillByIdQuery } from "./bills-queries"
import { eq, inArray } from "drizzle-orm"

export interface PeriodDependencyStatus {
  allMet: boolean
  requiredBillTemplates: Array<{ id: string; name: string }>
  arrivedBills: Array<{
    billId: string
    billTemplateId: string | null
    billTemplateName: string | null
    status: string
    billType: string
    fileName: string
  }>
  missingBillTemplates: Array<{ id: string; name: string }>
  periodType: "invoice" | "payable"
  templateId: string | null
}

/**
 * Get comprehensive dependency status for a billing period
 * Calculates in real-time which required bills have arrived vs missing
 */
export async function getPeriodDependencyStatusQuery(
  periodId: string
): Promise<PeriodDependencyStatus | null> {
  try {
    // Get the period
    const period = await db.query.billingPeriods.findFirst({
      where: eq(billingPeriodsTable.id, periodId)
    })

    if (!period) {
      return null
    }

    const periodType = period.periodType as "invoice" | "payable"
    const templateId = periodType === "invoice" 
      ? period.rentalInvoiceTemplateId 
      : period.payableTemplateId

    if (!templateId) {
      // No template linked, return empty status
      return {
        allMet: true,
        requiredBillTemplates: [],
        arrivedBills: [],
        missingBillTemplates: [],
        periodType,
        templateId: null
      }
    }

    // Get the template to find required bill template IDs
    let requiredBillTemplateIds: string[] = []
    let template: { dependsOnBillTemplateIds: string[] | null } | null = null

    if (periodType === "invoice") {
      template = await db.query.rentalInvoiceTemplates.findFirst({
        where: eq(rentalInvoiceTemplatesTable.id, templateId)
      })
    } else {
      template = await db.query.payableTemplates.findFirst({
        where: eq(payableTemplatesTable.id, templateId)
      })
    }

    if (template && Array.isArray(template.dependsOnBillTemplateIds) && template.dependsOnBillTemplateIds.length > 0) {
      requiredBillTemplateIds = template.dependsOnBillTemplateIds as string[]
    }

    // Get matched bills for this period FIRST
    const matches = await getMatchesByPeriodIdQuery(periodId)
    const billIds = matches.map((m) => m.billId)
    const bills = await Promise.all(billIds.map((id) => getBillByIdQuery(id)))
    const validBills = bills.filter((bill): bill is SelectBill => bill !== null)

    // Check dependencies based on MATCHED bills, not just existing bills
    // A bill template is satisfied if there's a matched bill with that template ID
    const matchedBillTemplateIds = new Set(
      validBills
        .map((b) => b.billTemplateId)
        .filter((id): id is string => id !== null)
    )

    const missingBillTemplateIds: string[] = []
    for (const requiredTemplateId of requiredBillTemplateIds) {
      if (!matchedBillTemplateIds.has(requiredTemplateId)) {
        missingBillTemplateIds.push(requiredTemplateId)
      }
    }

    const dependencyResult = {
      allMet: missingBillTemplateIds.length === 0,
      missingBillTemplates: missingBillTemplateIds
    }

    // Get bill template names for required templates
    const requiredBillTemplates: Array<{ id: string; name: string }> = []
    const missingBillTemplatesWithNames: Array<{ id: string; name: string }> = []

    if (requiredBillTemplateIds.length > 0) {
      const billTemplates = await db.query.billTemplates.findMany({
        where: inArray(billTemplatesTable.id, requiredBillTemplateIds)
      })

      const billTemplateMap = new Map(billTemplates.map((t) => [t.id, t]))

      for (const templateId of requiredBillTemplateIds) {
        const billTemplate = billTemplateMap.get(templateId)
        const templateInfo = {
          id: templateId,
          name: billTemplate?.name || "Unknown Template"
        }
        requiredBillTemplates.push(templateInfo)

        if (dependencyResult.missingBillTemplates.includes(templateId)) {
          missingBillTemplatesWithNames.push(templateInfo)
        }
      }
    }

    // Bills are already fetched above for dependency checking

    // Get bill templates for matched bills
    const billTemplateIds = validBills
      .map((b) => b.billTemplateId)
      .filter((id): id is string => id !== null)
    
    const billTemplatesMap = new Map<string, SelectBillTemplate>()
    if (billTemplateIds.length > 0) {
      const templates = await db.query.billTemplates.findMany({
        where: inArray(billTemplatesTable.id, billTemplateIds)
      })
      templates.forEach((t) => billTemplatesMap.set(t.id, t))
    }

    // Build arrived bills array
    const arrivedBills = validBills.map((bill) => {
      const billTemplate = bill.billTemplateId 
        ? billTemplatesMap.get(bill.billTemplateId) 
        : null

      return {
        billId: bill.id,
        billTemplateId: bill.billTemplateId,
        billTemplateName: billTemplate?.name || null,
        status: bill.status,
        billType: bill.billType,
        fileName: bill.fileName
      }
    })

    return {
      allMet: dependencyResult.allMet,
      requiredBillTemplates,
      arrivedBills,
      missingBillTemplates: missingBillTemplatesWithNames,
      periodType,
      templateId
    }
  } catch (error) {
    console.error("Error getting period dependency status:", error)
    return null
  }
}

/**
 * Batch get dependency status for multiple periods
 */
export async function getPeriodsDependencyStatusQuery(
  periodIds: string[]
): Promise<Map<string, PeriodDependencyStatus>> {
  if (periodIds.length === 0) {
    return new Map()
  }

  const statuses = await Promise.all(
    periodIds.map(async (periodId) => {
      const status = await getPeriodDependencyStatusQuery(periodId)
      return { periodId, status }
    })
  )

  const statusMap = new Map<string, PeriodDependencyStatus>()
  for (const { periodId, status } of statuses) {
    if (status) {
      statusMap.set(periodId, status)
    }
  }

  return statusMap
}

