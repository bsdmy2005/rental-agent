"use server"

import { db } from "@/db"
import {
  rentalInvoiceInstancesTable,
  propertiesTable,
  tenantsTable,
  landlordsTable,
  rentalAgentsTable,
  propertyManagementsTable,
  fixedCostsTable,
  billsTable,
  billingSchedulesTable,
  type InsertRentalInvoiceInstance,
  type SelectRentalInvoiceInstance
} from "@/db/schema"
import { ActionState, type InvoiceData, type InvoiceLineItem, type PropertyAddress, type BankingDetails } from "@/types"
import { eq, and, inArray } from "drizzle-orm"
import { generatePropertyName } from "@/lib/utils/property-name"
import type { InvoiceExtractionData } from "@/lib/pdf-processing"
import { randomUUID } from "crypto"

export async function createRentalInvoiceInstanceAction(
  invoiceInstance: InsertRentalInvoiceInstance
): Promise<ActionState<SelectRentalInvoiceInstance>> {
  try {
    const [newInstance] = await db
      .insert(rentalInvoiceInstancesTable)
      .values(invoiceInstance)
      .returning()

    return {
      isSuccess: true,
      message: "Rental invoice instance created successfully",
      data: newInstance
    }
  } catch (error) {
    console.error("Error creating rental invoice instance:", error)
    return {
      isSuccess: false,
      message: "Failed to create rental invoice instance"
    }
  }
}

export async function getRentalInvoiceInstancesByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectRentalInvoiceInstance[]>> {
  try {
    const instances = await db.query.rentalInvoiceInstances.findMany({
      where: eq(rentalInvoiceInstancesTable.propertyId, propertyId),
      orderBy: (instances, { desc, asc }) => [
        desc(instances.periodYear),
        desc(instances.periodMonth)
      ]
    })

    return {
      isSuccess: true,
      message: "Rental invoice instances retrieved successfully",
      data: instances
    }
  } catch (error) {
    console.error("Error getting rental invoice instances:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice instances"
    }
  }
}

export async function getRentalInvoiceInstancesByTenantIdAction(
  tenantId: string
): Promise<ActionState<SelectRentalInvoiceInstance[]>> {
  try {
    const instances = await db.query.rentalInvoiceInstances.findMany({
      where: eq(rentalInvoiceInstancesTable.tenantId, tenantId),
      orderBy: (instances, { desc, asc }) => [
        desc(instances.periodYear),
        desc(instances.periodMonth)
      ]
    })

    return {
      isSuccess: true,
      message: "Rental invoice instances retrieved successfully",
      data: instances
    }
  } catch (error) {
    console.error("Error getting rental invoice instances:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice instances"
    }
  }
}

export async function getRentalInvoiceInstancesByTemplateIdAction(
  templateId: string
): Promise<ActionState<SelectRentalInvoiceInstance[]>> {
  try {
    const instances = await db.query.rentalInvoiceInstances.findMany({
      where: eq(rentalInvoiceInstancesTable.rentalInvoiceTemplateId, templateId),
      orderBy: (instances, { desc, asc }) => [
        desc(instances.periodYear),
        desc(instances.periodMonth)
      ]
    })

    return {
      isSuccess: true,
      message: "Rental invoice instances retrieved successfully",
      data: instances
    }
  } catch (error) {
    console.error("Error getting rental invoice instances:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice instances"
    }
  }
}

export async function getRentalInvoiceInstanceByIdAction(
  instanceId: string
): Promise<ActionState<SelectRentalInvoiceInstance | null>> {
  try {
    const instance = await db.query.rentalInvoiceInstances.findFirst({
      where: eq(rentalInvoiceInstancesTable.id, instanceId)
    })

    return {
      isSuccess: true,
      message: "Rental invoice instance retrieved successfully",
      data: instance || null
    }
  } catch (error) {
    console.error("Error getting rental invoice instance:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice instance"
    }
  }
}

export async function updateRentalInvoiceInstanceAction(
  instanceId: string,
  data: Partial<InsertRentalInvoiceInstance>
): Promise<ActionState<SelectRentalInvoiceInstance>> {
  try {
    const [updatedInstance] = await db
      .update(rentalInvoiceInstancesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rentalInvoiceInstancesTable.id, instanceId))
      .returning()

    if (!updatedInstance) {
      return { isSuccess: false, message: "Rental invoice instance not found" }
    }

    return {
      isSuccess: true,
      message: "Rental invoice instance updated successfully",
      data: updatedInstance
    }
  } catch (error) {
    console.error("Error updating rental invoice instance:", error)
    return {
      isSuccess: false,
      message: "Failed to update rental invoice instance"
    }
  }
}

export async function deleteRentalInvoiceInstanceAction(
  instanceId: string
): Promise<ActionState<void>> {
  try {
    await db
      .delete(rentalInvoiceInstancesTable)
      .where(eq(rentalInvoiceInstancesTable.id, instanceId))

    return {
      isSuccess: true,
      message: "Rental invoice instance deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting rental invoice instance:", error)
    return {
      isSuccess: false,
      message: "Failed to delete rental invoice instance"
    }
  }
}

export async function findRentalInvoiceInstanceByTemplateAndPeriodAction(
  templateId: string,
  periodYear: number,
  periodMonth: number
): Promise<ActionState<SelectRentalInvoiceInstance | null>> {
  try {
    const instance = await db.query.rentalInvoiceInstances.findFirst({
      where: and(
        eq(rentalInvoiceInstancesTable.rentalInvoiceTemplateId, templateId),
        eq(rentalInvoiceInstancesTable.periodYear, periodYear),
        eq(rentalInvoiceInstancesTable.periodMonth, periodMonth)
      )
    })

    return {
      isSuccess: true,
      message: "Rental invoice instance found",
      data: instance || null
    }
  } catch (error) {
    console.error("Error finding rental invoice instance:", error)
    return {
      isSuccess: false,
      message: "Failed to find rental invoice instance"
    }
  }
}

/**
 * Manually create invoice instance from a billing period
 * This bypasses the generation day check and creates instance immediately if dependencies are met
 */
export async function createInvoiceInstanceFromPeriodAction(
  propertyId: string,
  periodYear: number,
  periodMonth: number,
  templateId: string
): Promise<ActionState<SelectRentalInvoiceInstance>> {
  try {
    // Check if instance already exists
    const existingResult = await findRentalInvoiceInstanceByTemplateAndPeriodAction(
      templateId,
      periodYear,
      periodMonth
    )

    if (existingResult.isSuccess && existingResult.data) {
      return {
        isSuccess: true,
        message: "Invoice instance already exists",
        data: existingResult.data
      }
    }

    // Get template
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
    const { checkInvoiceDependencies } = await import("@/lib/dependency-checker")
    const dependencyResult = await checkInvoiceDependencies(template.id, periodYear, periodMonth)

    if (!dependencyResult.allMet) {
      return {
        isSuccess: false,
        message: `Dependencies not met: ${dependencyResult.missingDependencies?.join(", ") || "Unknown"}`
      }
    }

    // Get contributing bills
    const { getBillsByPropertyIdQuery } = await import("@/queries/bills-queries")
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
    const createResult = await createRentalInvoiceInstanceAction({
      rentalInvoiceTemplateId: template.id,
      propertyId,
      tenantId: template.tenantId,
      periodYear,
      periodMonth,
      status: "ready",
      contributingBillIds: contributingBills.map((b) => b.id) as any,
      invoiceData: null
    })

    if (!createResult.isSuccess || !createResult.data) {
      return {
        isSuccess: false,
        message: createResult.message || "Failed to create invoice instance"
      }
    }

    return {
      isSuccess: true,
      message: "Invoice instance created successfully",
      data: createResult.data
    }
  } catch (error) {
    console.error("Error creating invoice instance from period:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create invoice instance"
    }
  }
}

/**
 * Generate invoice data from rental amount and contributing bills
 */
export async function generateInvoiceDataAction(
  instanceId: string
): Promise<ActionState<SelectRentalInvoiceInstance>> {
  try {
    // Get rental invoice instance
    const instance = await db.query.rentalInvoiceInstances.findFirst({
      where: eq(rentalInvoiceInstancesTable.id, instanceId)
    })

    if (!instance) {
      return { isSuccess: false, message: "Rental invoice instance not found" }
    }

    if (instance.status !== "ready") {
      return {
        isSuccess: false,
        message: `Invoice instance must be in "ready" status to generate invoice data. Current status: ${instance.status}`
      }
    }

    // Get property with address
    const property = await db.query.properties.findFirst({
      where: eq(propertiesTable.id, instance.propertyId)
    })

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    // Format property address
    const propertyAddress: PropertyAddress = {
      streetAddress: property.streetAddress,
      suburb: property.suburb,
      province: property.province,
      country: property.country,
      postalCode: property.postalCode,
      fullAddress: generatePropertyName(
        property.streetAddress,
        property.suburb,
        property.province,
        property.postalCode
      )
    }

    // Get billing address (from landlord or rental agent)
    let billingAddress: string | null = null

    // Try to get rental agent first (if property is managed by an agent)
    const propertyManagement = await db.query.propertyManagements.findFirst({
      where: and(
        eq(propertyManagementsTable.propertyId, instance.propertyId),
        eq(propertyManagementsTable.isActive, true)
      )
    })

    if (propertyManagement) {
      const rentalAgent = await db.query.rentalAgents.findFirst({
        where: eq(rentalAgentsTable.id, propertyManagement.rentalAgentId)
      })
      if (rentalAgent?.address) {
        billingAddress = rentalAgent.address
      }
    }

    // Fallback to landlord address if no agent address found
    if (!billingAddress) {
      const landlord = await db.query.landlords.findFirst({
        where: eq(landlordsTable.id, property.landlordId)
      })
      if (landlord?.address) {
        billingAddress = landlord.address
      }
    }

    // Extract banking details from property
    let bankingDetails: BankingDetails | null = null
    if (
      property.bankName ||
      property.accountHolderName ||
      property.accountNumber ||
      property.branchCode ||
      property.swiftCode ||
      property.referenceFormat
    ) {
      bankingDetails = {
        bankName: property.bankName || null,
        accountHolderName: property.accountHolderName || null,
        accountNumber: property.accountNumber || null,
        branchCode: property.branchCode || null,
        swiftCode: property.swiftCode || null,
        referenceFormat: property.referenceFormat || null
      }
    }

    // Get tenant and retrieve rental amount
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenantsTable.id, instance.tenantId)
    })

    if (!tenant) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    // Get rental amount from fixed costs (rent type) first, then fall back to tenant.rentalAmount
    const rentFixedCosts = await db
      .select()
      .from(fixedCostsTable)
      .where(
        and(
          eq(fixedCostsTable.tenantId, tenant.id),
          eq(fixedCostsTable.costType, "rent"),
          eq(fixedCostsTable.isActive, true)
        )
      )
      .limit(1)

    const rentalAmount = rentFixedCosts[0]
      ? parseFloat(rentFixedCosts[0].amount)
      : tenant.rentalAmount
      ? parseFloat(tenant.rentalAmount)
      : 0

    if (rentalAmount === 0) {
      return {
        isSuccess: false,
        message: "Rental amount is required but not found. Please set rental amount for tenant or create a fixed cost."
      }
    }

    // Get all contributing bills
    const contributingBillIds = (instance.contributingBillIds as string[]) || []
    if (contributingBillIds.length === 0) {
      return {
        isSuccess: false,
        message: "No contributing bills found for this invoice instance"
      }
    }

    const bills = await db
      .select()
      .from(billsTable)
      .where(inArray(billsTable.id, contributingBillIds))

    // Extract line items from bills
    const lineItems: InvoiceLineItem[] = []

    // Add rental amount as first line item
    lineItems.push({
      id: randomUUID(),
      type: "rental",
      description: "Monthly Rental",
      amount: rentalAmount,
      sourceBillId: null
    })

    // Extract line items from each bill's invoiceExtractionData
    for (const bill of bills) {
      if (!bill.invoiceExtractionData) {
        continue
      }

      const invoiceData = bill.invoiceExtractionData as InvoiceExtractionData
      if (!invoiceData.tenantChargeableItems || invoiceData.tenantChargeableItems.length === 0) {
        continue
      }

      for (const item of invoiceData.tenantChargeableItems) {
        // Map bill item types to invoice line item types
        let lineItemType: InvoiceLineItem["type"] = "other"
        if (item.type === "water") {
          lineItemType = "water"
        } else if (item.type === "electricity") {
          lineItemType = "electricity"
        } else if (item.type === "sewerage") {
          lineItemType = "sewerage"
        }

        const description =
          item.type === "water"
            ? `Water${item.usage ? ` (${item.usage} L)` : ""}`
            : item.type === "electricity"
              ? `Electricity${item.usage ? ` (${item.usage} kWh)` : ""}`
              : item.type === "sewerage"
                ? `Sewerage`
                : `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Charge`

        lineItems.push({
          id: randomUUID(),
          type: lineItemType,
          description,
          amount: item.amount,
          usage: item.usage ?? null,
          sourceBillId: bill.id
        })
      }
    }

    // Calculate period dates from periodYear and periodMonth
    const periodStart = new Date(instance.periodYear, instance.periodMonth - 1, 1)
    const periodEnd = new Date(instance.periodYear, instance.periodMonth, 0) // Last day of month
    periodEnd.setHours(23, 59, 59, 999)

    // Calculate due date (period end + 7 days)
    const dueDate = new Date(periodEnd)
    dueDate.setDate(dueDate.getDate() + 7)

    // Generate invoice number (format: INV-{YYYYMM}-{TENANT_ID_SHORT}-{SEQUENCE})
    const tenantIdShort = tenant.id.substring(0, 8)
    const yearMonth = `${instance.periodYear}${String(instance.periodMonth).padStart(2, "0")}`
    const sequence = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    const invoiceNumber = `INV-${yearMonth}-${tenantIdShort}-${sequence}`

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
    const totalAmount = subtotal

    // Create InvoiceData structure
    const invoiceData: InvoiceData = {
      invoiceNumber,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      dueDate: dueDate.toISOString(),
      rentalAmount,
      lineItems,
      subtotal,
      totalAmount,
      propertyAddress,
      billingAddress,
      bankingDetails,
      generatedAt: new Date().toISOString(),
      sentAt: null
    }

    // Update instance with invoice data and status
    const [updatedInstance] = await db
      .update(rentalInvoiceInstancesTable)
      .set({
        invoiceData: invoiceData as any,
        status: "generated",
        updatedAt: new Date()
      })
      .where(eq(rentalInvoiceInstancesTable.id, instanceId))
      .returning()

    if (!updatedInstance) {
      return { isSuccess: false, message: "Failed to update invoice instance" }
    }

    // Update billing schedule status to "generated"
    try {
      const { createOrUpdateScheduleStatusAction } = await import("@/actions/billing-schedule-status-actions")
      const { calculateExpectedDate } = await import("@/lib/billing-schedule-compliance")
      
      // Find billing schedule with scheduleType = "invoice_output" for this property
      const invoiceSchedule = await db.query.billingSchedules.findFirst({
        where: and(
          eq(billingSchedulesTable.propertyId, instance.propertyId),
          eq(billingSchedulesTable.scheduleType, "invoice_output")
        )
      })

      if (invoiceSchedule) {
        // Calculate expected date from schedule
        const expectedDate = calculateExpectedDate(
          invoiceSchedule,
          instance.periodYear,
          instance.periodMonth
        )

        const actualDate = new Date() // Current timestamp when invoice was generated

        // Update schedule status to "generated"
        await createOrUpdateScheduleStatusAction({
          scheduleId: invoiceSchedule.id,
          periodYear: instance.periodYear,
          periodMonth: instance.periodMonth,
          expectedDate,
          actualDate,
          status: "generated",
          invoiceId: instanceId,
          daysLate: null // Not applicable for "generated" status
        })

        console.log(
          `[Invoice Generation] Updated billing schedule status to "generated" for schedule ${invoiceSchedule.id}, period ${instance.periodYear}-${instance.periodMonth}`
        )
      }
    } catch (scheduleError) {
      console.error("Error updating billing schedule status:", scheduleError)
      // Don't fail the entire operation if schedule update fails
    }

    return {
      isSuccess: true,
      message: "Invoice data generated successfully",
      data: updatedInstance
    }
  } catch (error) {
    console.error("Error generating invoice data:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate invoice data"
    }
  }
}

/**
 * Helper function to recalculate invoice totals
 */
function recalculateInvoiceTotals(invoiceData: InvoiceData): InvoiceData {
  const subtotal = invoiceData.lineItems.reduce((sum, item) => sum + item.amount, 0)
  return {
    ...invoiceData,
    subtotal,
    totalAmount: subtotal
  }
}

/**
 * Update a specific line item in the invoice
 */
export async function updateInvoiceLineItemAction(
  instanceId: string,
  lineItemId: string,
  data: Partial<InvoiceLineItem>
): Promise<ActionState<SelectRentalInvoiceInstance>> {
  try {
    const instance = await db.query.rentalInvoiceInstances.findFirst({
      where: eq(rentalInvoiceInstancesTable.id, instanceId)
    })

    if (!instance) {
      return { isSuccess: false, message: "Rental invoice instance not found" }
    }

    if (!instance.invoiceData) {
      return { isSuccess: false, message: "Invoice data not found. Please generate invoice data first." }
    }

    const invoiceData = instance.invoiceData as InvoiceData
    const lineItemIndex = invoiceData.lineItems.findIndex((item) => item.id === lineItemId)

    if (lineItemIndex === -1) {
      return { isSuccess: false, message: "Line item not found" }
    }

    // Update the line item
    invoiceData.lineItems[lineItemIndex] = {
      ...invoiceData.lineItems[lineItemIndex],
      ...data
    }

    // Recalculate totals
    const updatedInvoiceData = recalculateInvoiceTotals(invoiceData)

    // Update instance
    const [updatedInstance] = await db
      .update(rentalInvoiceInstancesTable)
      .set({
        invoiceData: updatedInvoiceData as any,
        updatedAt: new Date()
      })
      .where(eq(rentalInvoiceInstancesTable.id, instanceId))
      .returning()

    if (!updatedInstance) {
      return { isSuccess: false, message: "Failed to update invoice instance" }
    }

    return {
      isSuccess: true,
      message: "Line item updated successfully",
      data: updatedInstance
    }
  } catch (error) {
    console.error("Error updating invoice line item:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to update invoice line item"
    }
  }
}

/**
 * Add a new line item to the invoice
 */
export async function addInvoiceLineItemAction(
  instanceId: string,
  lineItem: Omit<InvoiceLineItem, "id">
): Promise<ActionState<SelectRentalInvoiceInstance>> {
  try {
    const instance = await db.query.rentalInvoiceInstances.findFirst({
      where: eq(rentalInvoiceInstancesTable.id, instanceId)
    })

    if (!instance) {
      return { isSuccess: false, message: "Rental invoice instance not found" }
    }

    if (!instance.invoiceData) {
      return { isSuccess: false, message: "Invoice data not found. Please generate invoice data first." }
    }

    const invoiceData = instance.invoiceData as InvoiceData

    // Add new line item with generated ID
    const newLineItem: InvoiceLineItem = {
      ...lineItem,
      id: randomUUID()
    }

    invoiceData.lineItems.push(newLineItem)

    // Recalculate totals
    const updatedInvoiceData = recalculateInvoiceTotals(invoiceData)

    // Update instance
    const [updatedInstance] = await db
      .update(rentalInvoiceInstancesTable)
      .set({
        invoiceData: updatedInvoiceData as any,
        updatedAt: new Date()
      })
      .where(eq(rentalInvoiceInstancesTable.id, instanceId))
      .returning()

    if (!updatedInstance) {
      return { isSuccess: false, message: "Failed to update invoice instance" }
    }

    return {
      isSuccess: true,
      message: "Line item added successfully",
      data: updatedInstance
    }
  } catch (error) {
    console.error("Error adding invoice line item:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to add invoice line item"
    }
  }
}

/**
 * Delete a line item from the invoice
 */
export async function deleteInvoiceLineItemAction(
  instanceId: string,
  lineItemId: string
): Promise<ActionState<SelectRentalInvoiceInstance>> {
  try {
    const instance = await db.query.rentalInvoiceInstances.findFirst({
      where: eq(rentalInvoiceInstancesTable.id, instanceId)
    })

    if (!instance) {
      return { isSuccess: false, message: "Rental invoice instance not found" }
    }

    if (!instance.invoiceData) {
      return { isSuccess: false, message: "Invoice data not found. Please generate invoice data first." }
    }

    const invoiceData = instance.invoiceData as InvoiceData

    // Don't allow deleting the rental line item
    const lineItem = invoiceData.lineItems.find((item) => item.id === lineItemId)
    if (lineItem?.type === "rental") {
      return { isSuccess: false, message: "Cannot delete the rental line item" }
    }

    // Remove line item
    invoiceData.lineItems = invoiceData.lineItems.filter((item) => item.id !== lineItemId)

    // Recalculate totals
    const updatedInvoiceData = recalculateInvoiceTotals(invoiceData)

    // Update instance
    const [updatedInstance] = await db
      .update(rentalInvoiceInstancesTable)
      .set({
        invoiceData: updatedInvoiceData as any,
        updatedAt: new Date()
      })
      .where(eq(rentalInvoiceInstancesTable.id, instanceId))
      .returning()

    if (!updatedInstance) {
      return { isSuccess: false, message: "Failed to update invoice instance" }
    }

    return {
      isSuccess: true,
      message: "Line item deleted successfully",
      data: updatedInstance
    }
  } catch (error) {
    console.error("Error deleting invoice line item:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to delete invoice line item"
    }
  }
}

/**
 * Update invoice notes
 */
export async function updateInvoiceNotesAction(
  instanceId: string,
  notes: string
): Promise<ActionState<SelectRentalInvoiceInstance>> {
  try {
    const instance = await db.query.rentalInvoiceInstances.findFirst({
      where: eq(rentalInvoiceInstancesTable.id, instanceId)
    })

    if (!instance) {
      return { isSuccess: false, message: "Rental invoice instance not found" }
    }

    if (!instance.invoiceData) {
      return { isSuccess: false, message: "Invoice data not found. Please generate invoice data first." }
    }

    const invoiceData = instance.invoiceData as InvoiceData
    invoiceData.notes = notes

    // Update instance
    const [updatedInstance] = await db
      .update(rentalInvoiceInstancesTable)
      .set({
        invoiceData: invoiceData as any,
        updatedAt: new Date()
      })
      .where(eq(rentalInvoiceInstancesTable.id, instanceId))
      .returning()

    if (!updatedInstance) {
      return { isSuccess: false, message: "Failed to update invoice instance" }
    }

    return {
      isSuccess: true,
      message: "Invoice notes updated successfully",
      data: updatedInstance
    }
  } catch (error) {
    console.error("Error updating invoice notes:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to update invoice notes"
    }
  }
}

