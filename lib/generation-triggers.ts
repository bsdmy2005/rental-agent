"use server"

import { checkPayableDependencies, checkInvoiceDependencies } from "./dependency-checker"
import { createPayableInstanceAction } from "@/actions/payable-instances-actions"
import { createRentalInvoiceInstanceAction } from "@/actions/rental-invoice-instances-actions"
import { getPayableTemplatesByPropertyIdAction } from "@/actions/payable-templates-actions"
import { getRentalInvoiceTemplatesByPropertyIdAction } from "@/actions/rental-invoice-templates-actions"
import { getPayableScheduleByTemplateIdAction } from "@/actions/payable-schedules-actions"
import { getBillsByPropertyIdQuery } from "@/queries/bills-queries"

/**
 * Check and generate payable instances for a property and period
 */
export async function checkAndGeneratePayables(
  propertyId: string,
  periodYear: number,
  periodMonth: number
): Promise<void> {
  try {
    // Get all payable templates for this property
    const templatesResult = await getPayableTemplatesByPropertyIdAction(propertyId)

    if (!templatesResult.isSuccess || !templatesResult.data) {
      return
    }

    const templates = templatesResult.data.filter((t) => t.isActive)

    for (const template of templates) {
      // Check if schedule exists and is active
      const scheduleResult = await getPayableScheduleByTemplateIdAction(template.id)
      if (!scheduleResult.isSuccess || !scheduleResult.data || !scheduleResult.data.isActive) {
        continue
      }

      // Check dependencies
      const dependencyResult = await checkPayableDependencies(template.id, periodYear, periodMonth)

      if (dependencyResult.allMet) {
        // Calculate scheduled date from schedule pattern
        const scheduledDayOfMonth = scheduleResult.data.scheduledDayOfMonth
        const scheduledDate = new Date(periodYear, periodMonth - 1, scheduledDayOfMonth)

        // Check if instance already exists
        const { findPayableInstanceByTemplateAndPeriodAction } = await import(
          "@/actions/payable-instances-actions"
        )
        const existingResult = await findPayableInstanceByTemplateAndPeriodAction(
          template.id,
          periodYear,
          periodMonth
        )

        if (!existingResult.isSuccess || !existingResult.data) {
          // Get contributing bills
          const bills = await getBillsByPropertyIdQuery(propertyId)
          const contributingBills = bills.filter(
            (b) =>
              b.billTemplateId &&
              (template.dependsOnBillTemplateIds as string[]).includes(b.billTemplateId) &&
              b.billingYear === periodYear &&
              b.billingMonth === periodMonth &&
              b.status === "processed"
          )

          // Create payable instance
          await createPayableInstanceAction({
            payableTemplateId: template.id,
            propertyId,
            scheduledDate,
            periodYear,
            periodMonth,
            status: "ready",
            contributingBillIds: contributingBills.map((b) => b.id) as any,
            payableData: null
          })

          console.log(
            `[Generation] Created payable instance for template ${template.id}, period ${periodYear}-${periodMonth}`
          )
        }
      }
    }
  } catch (error) {
    console.error("Error checking and generating payables:", error)
  }
}

/**
 * Check and generate invoice instances for a property and period
 */
export async function checkAndGenerateInvoices(
  propertyId: string,
  periodYear: number,
  periodMonth: number
): Promise<void> {
  try {
    // Get all invoice templates for this property
    const templatesResult = await getRentalInvoiceTemplatesByPropertyIdAction(propertyId)

    if (!templatesResult.isSuccess || !templatesResult.data) {
      return
    }

    const templates = templatesResult.data.filter((t) => t.isActive)

    // Check if current day matches generation day
    const now = new Date()
    const currentDay = now.getDate()

    for (const template of templates) {
      // Check if current day matches generation day
      if (template.generationDayOfMonth !== currentDay) {
        continue
      }

      // Check dependencies
      const dependencyResult = await checkInvoiceDependencies(template.id, periodYear, periodMonth)

      if (dependencyResult.allMet) {
        // Check if instance already exists
        const { findRentalInvoiceInstanceByTemplateAndPeriodAction } = await import(
          "@/actions/rental-invoice-instances-actions"
        )
        const existingResult = await findRentalInvoiceInstanceByTemplateAndPeriodAction(
          template.id,
          periodYear,
          periodMonth
        )

        if (!existingResult.isSuccess || !existingResult.data) {
          // Get contributing bills - find ALL bills matching the dependent bill templates
          const bills = await getBillsByPropertyIdQuery(propertyId)
          const dependentBillTemplateIds = (template.dependsOnBillTemplateIds as string[]) || []
          
          const contributingBills = bills.filter(
            (b) =>
              b.billTemplateId &&
              dependentBillTemplateIds.includes(b.billTemplateId) &&
              b.billingYear === periodYear &&
              b.billingMonth === periodMonth &&
              b.status === "processed"
          )

          // Create invoice instance
          await createRentalInvoiceInstanceAction({
            rentalInvoiceTemplateId: template.id,
            propertyId,
            tenantId: template.tenantId,
            periodYear,
            periodMonth,
            status: "ready",
            contributingBillIds: contributingBills.map((b) => b.id) as any,
            invoiceData: null
          })

          console.log(
            `[Generation] Created invoice instance for template ${template.id}, period ${periodYear}-${periodMonth} with ${contributingBills.length} contributing bills`
          )
        }
      }
    }
  } catch (error) {
    console.error("Error checking and generating invoices:", error)
  }
}

