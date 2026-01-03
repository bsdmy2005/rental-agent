"use server"

import { checkPayableDependencies, checkInvoiceDependencies } from "./dependency-checker"
import { createPayableInstanceAction, updatePayableInstanceAction } from "@/actions/payable-instances-actions"
import { createRentalInvoiceInstanceAction } from "@/actions/rental-invoice-instances-actions"
import { getPayableTemplatesByPropertyIdAction } from "@/actions/payable-templates-actions"
import { getRentalInvoiceTemplatesByPropertyIdAction } from "@/actions/rental-invoice-templates-actions"
import { getPayableScheduleByTemplateIdAction } from "@/actions/payable-schedules-actions"
import { getBillsByPropertyIdQuery } from "@/queries/bills-queries"
import type { PaymentExtractionData, LandlordPayableItem } from "./pdf-processing"
import type { SelectBill, SelectPayableInstance, InsertPayableInstance } from "@/db/schema"
import type { ActionState } from "@/types"

/**
 * Aggregate payment extraction data from contributing bills into payableData
 * Combines all landlordPayableItems and calculates totalAmount
 */
function aggregatePaymentDataFromBills(
  contributingBills: SelectBill[]
): PaymentExtractionData | null {
  const allPayableItems: LandlordPayableItem[] = []
  let totalAmount = 0
  let period: string | undefined

  for (const bill of contributingBills) {
    if (!bill.paymentExtractionData) continue

    const paymentData = bill.paymentExtractionData as PaymentExtractionData | null
    if (!paymentData) continue

    // Extract period from first bill that has it
    if (!period && paymentData.period) {
      period = paymentData.period
    }

    // Aggregate landlordPayableItems
    if (paymentData.landlordPayableItems && Array.isArray(paymentData.landlordPayableItems)) {
      for (const item of paymentData.landlordPayableItems) {
        if (item.amount) {
          allPayableItems.push({
            type: (item.type || "other") as "levy" | "body_corporate" | "municipality" | "other",
            amount: item.amount,
            dueDate: item.dueDate,
            reference: item.reference,
            description: item.description,
            beneficiaryName: item.beneficiaryName,
            beneficiaryBankCode: item.beneficiaryBankCode,
            beneficiaryAccountNumber: item.beneficiaryAccountNumber
          })
          totalAmount += item.amount
        }
      }
    } else if (paymentData.totalAmount) {
      // If no items array but has totalAmount, use that
      totalAmount += paymentData.totalAmount
    }
  }

  // If we have no data, return null
  if (allPayableItems.length === 0 && totalAmount === 0) {
    return null
  }

  // Return aggregated payment data
  return {
    landlordPayableItems: allPayableItems.length > 0 ? allPayableItems : [],
    totalAmount: totalAmount > 0 ? totalAmount : undefined,
    period: period
  }
}

/**
 * Re-discover contributing bills for a payable instance
 * Uses property + period + template dependencies instead of stored IDs
 */
async function rediscoverContributingBills(
  instance: SelectPayableInstance
): Promise<SelectBill[]> {
  const { getPayableTemplateByIdAction } = await import("@/actions/payable-templates-actions")
  const templateResult = await getPayableTemplateByIdAction(instance.payableTemplateId)
  
  if (!templateResult.isSuccess || !templateResult.data) {
    console.log(`[Re-discovery] Template not found for instance ${instance.id}`)
    return []
  }

  const template = templateResult.data
  if (!template.dependsOnBillTemplateIds || !Array.isArray(template.dependsOnBillTemplateIds)) {
    console.log(`[Re-discovery] Template has no bill dependencies`)
    return []
  }

  // Get all bills for the property
  const bills = await getBillsByPropertyIdQuery(instance.propertyId)
  
  // Filter bills matching template dependencies, period, and status
  const matchingBills = bills.filter(
    (b) =>
      b.billTemplateId &&
      (template.dependsOnBillTemplateIds as string[]).includes(b.billTemplateId) &&
      b.billingYear === instance.periodYear &&
      b.billingMonth === instance.periodMonth &&
      b.status === "processed"
  )

  console.log(`[Re-discovery] Found ${matchingBills.length} bills matching criteria for instance ${instance.id}`)
  return matchingBills
}

/**
 * Update payable instance with payment data from contributing bills
 * Called when bills are processed and payable instance already exists
 * Now includes fallback re-discovery if stored bill IDs don't work
 */
export async function updatePayableInstanceFromBills(
  instanceId: string
): Promise<void> {
  try {
    const { getPayableInstanceByIdAction, updatePayableInstanceAction } = await import(
      "@/actions/payable-instances-actions"
    )
    
    const instanceResult = await getPayableInstanceByIdAction(instanceId)
    if (!instanceResult.isSuccess || !instanceResult.data) {
      console.error(`[Payable Update] Instance ${instanceId} not found`)
      return
    }

    const instance = instanceResult.data
    console.log(`[Payable Update] Processing instance ${instanceId}`)
    console.log(`[Payable Update] Contributing bill IDs:`, instance.contributingBillIds)
    
    let contributingBills: SelectBill[] = []
    let billsReDiscovered = false

    // Strategy 1: Try to use stored contributingBillIds
    if (instance.contributingBillIds && Array.isArray(instance.contributingBillIds)) {
      const contributingBillIds = instance.contributingBillIds as string[]
      console.log(`[Payable Update] Looking for bill IDs:`, contributingBillIds)
      
      const { getBillByIdQuery } = await import("@/queries/bills-queries")
      
      for (const billId of contributingBillIds) {
        const bill = await getBillByIdQuery(billId)
        if (bill) {
          contributingBills.push(bill)
          console.log(`[Payable Update] Found bill ${billId}`)
        } else {
          console.log(`[Payable Update] Bill ${billId} not found in database`)
        }
      }
      
      console.log(`[Payable Update] Found ${contributingBills.length} contributing bills out of ${contributingBillIds.length} expected`)
    }

    // Strategy 2: If no bills found or bills don't have payment data, re-discover
    const billsWithPaymentData = contributingBills.filter((b) => !!b.paymentExtractionData)
    if (contributingBills.length === 0 || billsWithPaymentData.length === 0) {
      console.log(`[Payable Update] Re-discovering bills using property + period + template dependencies`)
      const reDiscoveredBills = await rediscoverContributingBills(instance)
      
      if (reDiscoveredBills.length > 0) {
        contributingBills = reDiscoveredBills
        billsReDiscovered = true
        console.log(`[Payable Update] Re-discovered ${contributingBills.length} bills`)
        
        // Update contributingBillIds if we found different bills
        const newBillIds = contributingBills.map((b) => b.id)
        const oldBillIds = (instance.contributingBillIds as string[]) || []
        const idsChanged = JSON.stringify(newBillIds.sort()) !== JSON.stringify(oldBillIds.sort())
        
        if (idsChanged) {
          console.log(`[Payable Update] Updating contributingBillIds from ${oldBillIds} to ${newBillIds}`)
        }
      }
    }
    
    // Log payment extraction data from bills
    for (const bill of contributingBills) {
      console.log(`[Payable Update] Bill ${bill.id}:`, {
        hasPaymentData: !!bill.paymentExtractionData,
        paymentData: bill.paymentExtractionData
      })
    }

    // Aggregate payment extraction data
    const payableData = aggregatePaymentDataFromBills(contributingBills)
    console.log(`[Payable Update] Aggregated payable data:`, payableData)

    // Update instance if we have data
    if (payableData) {
      const updateData: Partial<InsertPayableInstance> = {
        payableData: payableData as unknown as Record<string, unknown>
      }
      
      // Update contributingBillIds if we re-discovered bills
      if (billsReDiscovered) {
        updateData.contributingBillIds = contributingBills.map((b) => b.id) as string[]
      }
      
      const updateResult = await updatePayableInstanceAction(instanceId, updateData)
      if (updateResult.isSuccess) {
        console.log(
          `[Payable Update] ✓ Updated payable instance ${instanceId} with payment data from ${contributingBills.length} bills${billsReDiscovered ? " (re-discovered)" : ""}`
        )
      } else {
        console.error(`[Payable Update] ✗ Failed to update:`, updateResult.message)
      }
    } else {
      console.log(`[Payable Update] No payable data to update (all bills have null paymentExtractionData)`)
    }
  } catch (error) {
    console.error(`[Payable Update] Error updating payable instance ${instanceId}:`, error)
  }
}

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

          // Aggregate payment extraction data from contributing bills
          const payableData = aggregatePaymentDataFromBills(contributingBills)

          // Create payable instance
          await createPayableInstanceAction({
            payableTemplateId: template.id,
            propertyId,
            scheduledDate,
            periodYear,
            periodMonth,
            status: "ready",
            contributingBillIds: contributingBills.map((b) => b.id) as string[],
            payableData: payableData as unknown as Record<string, unknown>
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
            contributingBillIds: contributingBills.map((b) => b.id) as string[],
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

/**
 * Manually create invoice instance for a period (bypasses generation day check)
 * Useful for creating instances from ready periods in the billing schedule
 */
export async function manuallyCreateInvoiceInstanceAction(
  propertyId: string,
  periodYear: number,
  periodMonth: number,
  templateId: string
): Promise<ActionState<{ instanceId: string }>> {
  try {
    // Get the template
    const { getRentalInvoiceTemplateByIdAction } = await import(
      "@/actions/rental-invoice-templates-actions"
    )
    const templateResult = await getRentalInvoiceTemplateByIdAction(templateId)

    if (!templateResult.isSuccess || !templateResult.data) {
      return {
        isSuccess: false,
        message: "Rental invoice template not found"
      }
    }

    const template = templateResult.data

    // Check dependencies
    const dependencyResult = await checkInvoiceDependencies(template.id, periodYear, periodMonth)

    if (!dependencyResult.allMet) {
      return {
        isSuccess: false,
        message: `Dependencies not met: ${dependencyResult.missingBillTemplates.join(", ") || "Unknown"}`
      }
    }

    // Check if instance already exists
    const { findRentalInvoiceInstanceByTemplateAndPeriodAction } = await import(
      "@/actions/rental-invoice-instances-actions"
    )
    const existingResult = await findRentalInvoiceInstanceByTemplateAndPeriodAction(
      template.id,
      periodYear,
      periodMonth
    )

    if (existingResult.isSuccess && existingResult.data) {
      return {
        isSuccess: true,
        message: "Invoice instance already exists",
        data: { instanceId: existingResult.data.id }
      }
    }

    // Get contributing bills
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
    const { createRentalInvoiceInstanceAction } = await import(
      "@/actions/rental-invoice-instances-actions"
    )
    const createResult = await createRentalInvoiceInstanceAction({
      rentalInvoiceTemplateId: template.id,
      propertyId,
      tenantId: template.tenantId,
      periodYear,
      periodMonth,
      status: "ready",
      contributingBillIds: contributingBills.map((b) => b.id) as string[],
      invoiceData: null
    })

    if (!createResult.isSuccess || !createResult.data) {
      return {
        isSuccess: false,
        message: createResult.message || "Failed to create invoice instance"
      }
    }

    console.log(
      `[Manual Generation] Created invoice instance for template ${template.id}, period ${periodYear}-${periodMonth} with ${contributingBills.length} contributing bills`
    )

    return {
      isSuccess: true,
      message: "Invoice instance created successfully",
      data: { instanceId: createResult.data.id }
    }
  } catch (error) {
    console.error("Error manually creating invoice instance:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create invoice instance"
    }
  }
}

