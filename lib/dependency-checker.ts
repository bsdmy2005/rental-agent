"use server"

import { db } from "@/db"
import { billsTable, payableTemplatesTable, rentalInvoiceTemplatesTable } from "@/db/schema"
import { eq, and } from "drizzle-orm"

/**
 * Check if all required bill templates have instances (bills) for a given period
 */
export async function checkPayableDependencies(
  payableTemplateId: string,
  periodYear: number,
  periodMonth: number
): Promise<{ allMet: boolean; missingBillTemplates: string[] }> {
  try {
    // Get the payable template
    const payableTemplate = await db.query.payableTemplates.findFirst({
      where: eq(payableTemplatesTable.id, payableTemplateId)
    })

    if (!payableTemplate) {
      return { allMet: false, missingBillTemplates: [] }
    }

    // Get dependencies (bill template IDs)
    const dependsOnBillTemplateIds = payableTemplate.dependsOnBillTemplateIds as string[] | null

    if (!dependsOnBillTemplateIds || dependsOnBillTemplateIds.length === 0) {
      // No dependencies, so all met
      return { allMet: true, missingBillTemplates: [] }
    }

    // Check if bills exist for each required bill template for this period
    const missingBillTemplates: string[] = []

    for (const billTemplateId of dependsOnBillTemplateIds) {
      // Find bills linked to this template for this period
      const bills = await db.query.bills.findMany({
        where: and(
          eq(billsTable.billTemplateId, billTemplateId),
          eq(billsTable.billingYear, periodYear),
          eq(billsTable.billingMonth, periodMonth),
          eq(billsTable.status, "processed")
        ),
        limit: 1
      })

      if (bills.length === 0) {
        missingBillTemplates.push(billTemplateId)
      }
    }

    return {
      allMet: missingBillTemplates.length === 0,
      missingBillTemplates
    }
  } catch (error) {
    console.error("Error checking payable dependencies:", error)
    return { allMet: false, missingBillTemplates: [] }
  }
}

/**
 * Check if all required bill templates have instances (bills) for a given period
 * Similar to checkPayableDependencies but for invoice templates
 */
export async function checkInvoiceDependencies(
  invoiceTemplateId: string,
  periodYear: number,
  periodMonth: number
): Promise<{ allMet: boolean; missingBillTemplates: string[] }> {
  try {
    // Get the invoice template
    const invoiceTemplate = await db.query.rentalInvoiceTemplates.findFirst({
      where: eq(rentalInvoiceTemplatesTable.id, invoiceTemplateId)
    })

    if (!invoiceTemplate) {
      return { allMet: false, missingBillTemplates: [] }
    }

    // Get dependencies (bill template IDs)
    const dependsOnBillTemplateIds = invoiceTemplate.dependsOnBillTemplateIds as string[] | null

    if (!dependsOnBillTemplateIds || dependsOnBillTemplateIds.length === 0) {
      // No dependencies, so all met
      return { allMet: true, missingBillTemplates: [] }
    }

    // Check if bills exist for each required bill template for this period
    const missingBillTemplates: string[] = []

    for (const billTemplateId of dependsOnBillTemplateIds) {
      // Find bills linked to this template for this period
      const bills = await db.query.bills.findMany({
        where: and(
          eq(billsTable.billTemplateId, billTemplateId),
          eq(billsTable.billingYear, periodYear),
          eq(billsTable.billingMonth, periodMonth),
          eq(billsTable.status, "processed")
        ),
        limit: 1
      })

      if (bills.length === 0) {
        missingBillTemplates.push(billTemplateId)
      }
    }

    return {
      allMet: missingBillTemplates.length === 0,
      missingBillTemplates
    }
  } catch (error) {
    console.error("Error checking invoice dependencies:", error)
    return { allMet: false, missingBillTemplates: [] }
  }
}

