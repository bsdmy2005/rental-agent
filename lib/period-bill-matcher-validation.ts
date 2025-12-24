"use server"

import { db } from "@/db"
import { type SelectBill, type SelectBillingPeriod, rentalInvoiceTemplatesTable, payableTemplatesTable } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Check if a bill can be matched to a period based on template dependencies
 * A bill can only be matched if:
 * - The bill has a billTemplateId (REQUIRED - no backward compatibility)
 * - The period has a template (invoice or payable)
 * - The template's dependsOnBillTemplateIds includes the bill's billTemplateId
 */
export async function canBillMatchToPeriod(
  bill: SelectBill,
  period: SelectBillingPeriod
): Promise<{ canMatch: boolean; reason?: string }> {
  // REQUIRE billTemplateId - all bills must have templates
  if (!bill.billTemplateId) {
    return { canMatch: false, reason: "Bill has no template ID - template linking required before matching" }
  }

  // Get the template for this period
  let dependsOnBillTemplateIds: string[] | null = null

  if (period.periodType === "invoice" && period.rentalInvoiceTemplateId) {
    const invoiceTemplate = await db.query.rentalInvoiceTemplates.findFirst({
      where: eq(rentalInvoiceTemplatesTable.id, period.rentalInvoiceTemplateId)
    })
    if (invoiceTemplate) {
      dependsOnBillTemplateIds = invoiceTemplate.dependsOnBillTemplateIds as string[] | null
    }
  } else if (period.periodType === "payable" && period.payableTemplateId) {
    const payableTemplate = await db.query.payableTemplates.findFirst({
      where: eq(payableTemplatesTable.id, period.payableTemplateId)
    })
    if (payableTemplate) {
      dependsOnBillTemplateIds = payableTemplate.dependsOnBillTemplateIds as string[] | null
    }
  }

  // If period has no template, we can't validate - disallow match
  if (!dependsOnBillTemplateIds) {
    return {
      canMatch: false,
      reason: period.periodType === "invoice"
        ? "Period has no invoice template"
        : "Period has no payable template"
    }
  }

  // Check if bill's template ID is in the template's dependencies
  if (dependsOnBillTemplateIds.length === 0) {
    // Template has no dependencies - allow match (template doesn't require specific bills)
    return { canMatch: true, reason: "Template has no specific dependencies" }
  }

  const canMatch = dependsOnBillTemplateIds.includes(bill.billTemplateId)

  if (!canMatch) {
    return {
      canMatch: false,
      reason: `Bill template (${bill.billTemplateId}) is not in the ${period.periodType} template's dependencies`
    }
  }

  return { canMatch: true }
}

/**
 * Filter periods to only those that can accept the given bill
 */
export async function filterCompatiblePeriods(
  bill: SelectBill,
  periods: SelectBillingPeriod[]
): Promise<SelectBillingPeriod[]> {
  const compatiblePeriods: SelectBillingPeriod[] = []

  for (const period of periods) {
    const validation = await canBillMatchToPeriod(bill, period)
    if (validation.canMatch) {
      compatiblePeriods.push(period)
    }
  }

  return compatiblePeriods
}

