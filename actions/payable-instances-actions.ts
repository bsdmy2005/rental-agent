"use server"

import { db } from "@/db"
import {
  payableInstancesTable,
  type InsertPayableInstance,
  type SelectPayableInstance
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"

export async function createPayableInstanceAction(
  payableInstance: InsertPayableInstance
): Promise<ActionState<SelectPayableInstance>> {
  try {
    const [newInstance] = await db
      .insert(payableInstancesTable)
      .values(payableInstance)
      .returning()

    return {
      isSuccess: true,
      message: "Payable instance created successfully",
      data: newInstance
    }
  } catch (error) {
    console.error("Error creating payable instance:", error)
    return { isSuccess: false, message: "Failed to create payable instance" }
  }
}

export async function getPayableInstancesByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectPayableInstance[]>> {
  try {
    const instances = await db.query.payableInstances.findMany({
      where: eq(payableInstancesTable.propertyId, propertyId),
      orderBy: (instances, { desc, asc }) => [
        desc(instances.periodYear),
        desc(instances.periodMonth)
      ]
    })

    return {
      isSuccess: true,
      message: "Payable instances retrieved successfully",
      data: instances
    }
  } catch (error) {
    console.error("Error getting payable instances:", error)
    return { isSuccess: false, message: "Failed to get payable instances" }
  }
}

export async function getPayableInstancesByTemplateIdAction(
  templateId: string
): Promise<ActionState<SelectPayableInstance[]>> {
  try {
    const instances = await db.query.payableInstances.findMany({
      where: eq(payableInstancesTable.payableTemplateId, templateId),
      orderBy: (instances, { desc, asc }) => [
        desc(instances.periodYear),
        desc(instances.periodMonth)
      ]
    })

    return {
      isSuccess: true,
      message: "Payable instances retrieved successfully",
      data: instances
    }
  } catch (error) {
    console.error("Error getting payable instances:", error)
    return { isSuccess: false, message: "Failed to get payable instances" }
  }
}

export async function getPayableInstanceByIdAction(
  instanceId: string
): Promise<ActionState<SelectPayableInstance | null>> {
  try {
    const instance = await db.query.payableInstances.findFirst({
      where: eq(payableInstancesTable.id, instanceId)
    })

    return {
      isSuccess: true,
      message: "Payable instance retrieved successfully",
      data: instance || null
    }
  } catch (error) {
    console.error("Error getting payable instance:", error)
    return { isSuccess: false, message: "Failed to get payable instance" }
  }
}

export async function updatePayableInstanceAction(
  instanceId: string,
  data: Partial<InsertPayableInstance>
): Promise<ActionState<SelectPayableInstance>> {
  try {
    const [updatedInstance] = await db
      .update(payableInstancesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payableInstancesTable.id, instanceId))
      .returning()

    if (!updatedInstance) {
      return { isSuccess: false, message: "Payable instance not found" }
    }

    return {
      isSuccess: true,
      message: "Payable instance updated successfully",
      data: updatedInstance
    }
  } catch (error) {
    console.error("Error updating payable instance:", error)
    return { isSuccess: false, message: "Failed to update payable instance" }
  }
}

export async function deletePayableInstanceAction(
  instanceId: string
): Promise<ActionState<void>> {
  try {
    await db
      .delete(payableInstancesTable)
      .where(eq(payableInstancesTable.id, instanceId))

    return {
      isSuccess: true,
      message: "Payable instance deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting payable instance:", error)
    return { isSuccess: false, message: "Failed to delete payable instance" }
  }
}

export async function findPayableInstanceByTemplateAndPeriodAction(
  templateId: string,
  periodYear: number,
  periodMonth: number
): Promise<ActionState<SelectPayableInstance | null>> {
  try {
    const instance = await db.query.payableInstances.findFirst({
      where: and(
        eq(payableInstancesTable.payableTemplateId, templateId),
        eq(payableInstancesTable.periodYear, periodYear),
        eq(payableInstancesTable.periodMonth, periodMonth)
      )
    })

    return {
      isSuccess: true,
      message: "Payable instance found",
      data: instance || null
    }
  } catch (error) {
    console.error("Error finding payable instance:", error)
    return { isSuccess: false, message: "Failed to find payable instance" }
  }
}

/**
 * Update payable instance with payment data from contributing bills
 * Useful for backfilling payableData for existing instances
 */
export async function refreshPayableInstanceDataAction(
  instanceId: string
): Promise<ActionState<SelectPayableInstance>> {
  try {
    const { updatePayableInstanceFromBills } = await import("@/lib/generation-triggers")
    
    await updatePayableInstanceFromBills(instanceId)
    
    const instance = await db.query.payableInstances.findFirst({
      where: eq(payableInstancesTable.id, instanceId)
    })

    if (!instance) {
      return { isSuccess: false, message: "Payable instance not found" }
    }

    return {
      isSuccess: true,
      message: "Payable instance data refreshed successfully",
      data: instance
    }
  } catch (error) {
    console.error("Error refreshing payable instance data:", error)
    return { isSuccess: false, message: "Failed to refresh payable instance data" }
  }
}

/**
 * Refresh all payable instances for a property that have null payableData
 */
export async function refreshAllPayableInstancesForPropertyAction(
  propertyId: string
): Promise<ActionState<{ updated: number; repaired: number }>> {
  try {
    console.log(`[Refresh All] Starting refresh for property ${propertyId}`)
    const instances = await db.query.payableInstances.findMany({
      where: eq(payableInstancesTable.propertyId, propertyId)
    })

    console.log(`[Refresh All] Found ${instances.length} payable instances`)

    const { updatePayableInstanceFromBills } = await import("@/lib/generation-triggers")
    
    let updated = 0
    let repaired = 0
    
    for (const instance of instances) {
      // Check if instance has data
      const hasData = instance.payableData && 
        typeof instance.payableData === 'object' && 
        Object.keys(instance.payableData).length > 0
      
      const hasValidAmount = hasData && 
        ((instance.payableData as any)?.totalAmount > 0 || 
         ((instance.payableData as any)?.landlordPayableItems?.length > 0))
      
      console.log(`[Refresh All] Instance ${instance.id}:`, {
        hasData,
        hasValidAmount,
        hasContributingBills: !!(instance.contributingBillIds && Array.isArray(instance.contributingBillIds)),
        contributingBillCount: Array.isArray(instance.contributingBillIds) ? instance.contributingBillIds.length : 0
      })
      
      // Update if no data OR if amount is 0 OR if no contributing bills (will trigger re-discovery)
      const needsUpdate = !hasValidAmount
      const needsRepair = !instance.contributingBillIds || !Array.isArray(instance.contributingBillIds) || instance.contributingBillIds.length === 0
      
      if (needsUpdate || needsRepair) {
        console.log(`[Refresh All] ${needsRepair ? 'Repairing' : 'Updating'} instance ${instance.id}`)
        await updatePayableInstanceFromBills(instance.id)
        updated++
        if (needsRepair) {
          repaired++
        }
      }
    }

    console.log(`[Refresh All] Updated ${updated} instance(s), repaired ${repaired} instance(s)`)

    return {
      isSuccess: true,
      message: `Refreshed ${updated} payable instance(s)${repaired > 0 ? `, repaired ${repaired} with re-discovered bills` : ''}`,
      data: { updated, repaired }
    }
  } catch (error) {
    console.error("Error refreshing payable instances:", error)
    return { isSuccess: false, message: "Failed to refresh payable instances" }
  }
}

/**
 * Diagnose payable instance to understand bill linkage issues
 */
export async function diagnosePayableInstanceAction(
  instanceId: string
): Promise<ActionState<{
  instance: SelectPayableInstance
  contributingBillIds: string[]
  billsFound: Array<{
    id: string
    exists: boolean
    hasPaymentData: boolean
    propertyId: string
    billingYear: number | null
    billingMonth: number | null
    status: string
  }>
  reDiscoveredBills: Array<{
    id: string
    hasPaymentData: boolean
  }>
  recommendedAction: string
}>> {
  try {
    const instance = await db.query.payableInstances.findFirst({
      where: eq(payableInstancesTable.id, instanceId)
    })

    if (!instance) {
      return { isSuccess: false, message: "Payable instance not found" }
    }

    // Get template to understand dependencies
    const { getPayableTemplateByIdAction } = await import("@/actions/payable-templates-actions")
    const templateResult = await getPayableTemplateByIdAction(instance.payableTemplateId)
    const template = templateResult.isSuccess ? templateResult.data : null

    const contributingBillIds = (instance.contributingBillIds as string[]) || []
    const billsFound: Array<{
      id: string
      exists: boolean
      hasPaymentData: boolean
      propertyId: string
      billingYear: number | null
      billingMonth: number | null
      status: string
    }> = []

    // Check each stored bill ID
    const { getBillByIdQuery } = await import("@/queries/bills-queries")
    for (const billId of contributingBillIds) {
      const bill = await getBillByIdQuery(billId)
      if (bill) {
        billsFound.push({
          id: billId,
          exists: true,
          hasPaymentData: !!bill.paymentExtractionData,
          propertyId: bill.propertyId,
          billingYear: bill.billingYear,
          billingMonth: bill.billingMonth,
          status: bill.status
        })
      } else {
        billsFound.push({
          id: billId,
          exists: false,
          hasPaymentData: false,
          propertyId: "",
          billingYear: null,
          billingMonth: null,
          status: ""
        })
      }
    }

    // Re-discover bills using property + period + template dependencies
    const reDiscoveredBills: Array<{ id: string; hasPaymentData: boolean }> = []
    if (template && template.dependsOnBillTemplateIds && Array.isArray(template.dependsOnBillTemplateIds)) {
      const { getBillsByPropertyIdQuery } = await import("@/queries/bills-queries")
      const allBills = await getBillsByPropertyIdQuery(instance.propertyId)
      
      const matchingBills = allBills.filter(
        (b) =>
          b.billTemplateId &&
          (template.dependsOnBillTemplateIds as string[]).includes(b.billTemplateId) &&
          b.billingYear === instance.periodYear &&
          b.billingMonth === instance.periodMonth &&
          b.status === "processed"
      )

      reDiscoveredBills.push(
        ...matchingBills.map((b) => ({
          id: b.id,
          hasPaymentData: !!b.paymentExtractionData
        }))
      )
    }

    // Determine recommended action
    const existingBillsWithData = billsFound.filter((b) => b.exists && b.hasPaymentData).length
    const reDiscoveredBillsWithData = reDiscoveredBills.filter((b) => b.hasPaymentData).length

    let recommendedAction = "No action needed"
    if (existingBillsWithData === 0 && reDiscoveredBillsWithData > 0) {
      recommendedAction = "Re-link bills: Re-discovered bills found with payment data"
    } else if (existingBillsWithData === 0 && reDiscoveredBillsWithData === 0) {
      recommendedAction = "Process bills: No bills found with payment extraction data"
    } else if (existingBillsWithData > 0) {
      recommendedAction = "Refresh data: Bills exist, refresh payable data"
    }

    return {
      isSuccess: true,
      message: "Diagnosis complete",
      data: {
        instance,
        contributingBillIds,
        billsFound,
        reDiscoveredBills,
        recommendedAction
      }
    }
  } catch (error) {
    console.error("Error diagnosing payable instance:", error)
    return { isSuccess: false, message: "Failed to diagnose payable instance" }
  }
}

