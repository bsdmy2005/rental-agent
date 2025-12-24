"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import {
  payableTemplatesTable,
  payableInstancesTable,
  propertiesTable,
  type InsertPayableTemplate,
  type SelectPayableTemplate
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, inArray, and } from "drizzle-orm"
import { getPayableInstancesWithDetailsQuery } from "@/queries/payable-instances-queries"

/**
 * Create payable template
 */
export async function createPayableTemplateAction(
  payableTemplate: InsertPayableTemplate
): Promise<ActionState<SelectPayableTemplate>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const [result] = await db.insert(payableTemplatesTable).values(payableTemplate).returning()

    return {
      isSuccess: true,
      message: "Payable template created successfully",
      data: result
    }
  } catch (error) {
    console.error("Error creating payable template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create payable template"
    }
  }
}

/**
 * Get payable templates by property ID
 */
export async function getPayableTemplatesByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectPayableTemplate[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const templates = await db.query.payableTemplates.findMany({
      where: eq(payableTemplatesTable.propertyId, propertyId)
    })

    return {
      isSuccess: true,
      message: "Payable templates retrieved successfully",
      data: templates
    }
  } catch (error) {
    console.error("Error getting payable templates:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get payable templates"
    }
  }
}

/**
 * Get payable template by ID
 */
export async function getPayableTemplateByIdAction(
  templateId: string
): Promise<ActionState<SelectPayableTemplate | null>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const template = await db.query.payableTemplates.findFirst({
      where: eq(payableTemplatesTable.id, templateId)
    })

    return {
      isSuccess: true,
      message: "Payable template retrieved successfully",
      data: template || null
    }
  } catch (error) {
    console.error("Error getting payable template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get payable template"
    }
  }
}

/**
 * Update payable template
 */
export async function updatePayableTemplateAction(
  templateId: string,
  data: Partial<InsertPayableTemplate>
): Promise<ActionState<SelectPayableTemplate>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const [updated] = await db
      .update(payableTemplatesTable)
      .set(data)
      .where(eq(payableTemplatesTable.id, templateId))
      .returning()

    if (!updated) {
      return {
        isSuccess: false,
        message: "Payable template not found"
      }
    }

    return {
      isSuccess: true,
      message: "Payable template updated successfully",
      data: updated
    }
  } catch (error) {
    console.error("Error updating payable template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to update payable template"
    }
  }
}

/**
 * Delete payable template
 */
export async function deletePayableTemplateAction(
  templateId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    await db.delete(payableTemplatesTable).where(eq(payableTemplatesTable.id, templateId))

    return {
      isSuccess: true,
      message: "Payable template deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting payable template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to delete payable template"
    }
  }
}

/**
 * Update payable template dependency (add or remove a bill template dependency)
 * Used when editing dependencies from bill template side
 */
export async function updatePayableTemplateDependencyAction(
  payableTemplateId: string,
  billTemplateId: string,
  add: boolean // true to add, false to remove
): Promise<ActionState<SelectPayableTemplate>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const template = await db.query.payableTemplates.findFirst({
      where: eq(payableTemplatesTable.id, payableTemplateId)
    })

    if (!template) {
      return { isSuccess: false, message: "Payable template not found" }
    }

    const currentDependencies = (template.dependsOnBillTemplateIds as string[]) || []
    let newDependencies: string[]

    if (add) {
      // Add bill template ID if not already present
      if (currentDependencies.includes(billTemplateId)) {
        // Already has this dependency, return success
        return {
          isSuccess: true,
          message: "Dependency already exists",
          data: template
        }
      }
      newDependencies = [...currentDependencies, billTemplateId]
    } else {
      // Remove bill template ID
      newDependencies = currentDependencies.filter((id) => id !== billTemplateId)
      
      // Ensure at least one dependency remains
      if (newDependencies.length === 0) {
        return {
          isSuccess: false,
          message: "At least one bill template dependency is required"
        }
      }
    }

    return await updatePayableTemplateAction(payableTemplateId, {
      dependsOnBillTemplateIds: newDependencies
    })
  } catch (error) {
    console.error("Error updating payable template dependency:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to update payable template dependency"
    }
  }
}

/**
 * Get payable templates with ready count for multiple properties
 */
export async function getPayableTemplatesWithReadyCountAction(
  propertyIds: string[]
): Promise<
  ActionState<
    Array<
      SelectPayableTemplate & {
        propertyName: string
        readyCount: number
        bankAccountLinked: boolean
        beneficiaryLinked: boolean
      }
    >
  >
> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    if (propertyIds.length === 0) {
      return {
        isSuccess: true,
        message: "No properties provided",
        data: []
      }
    }

    // Fetch all payable instances to count ready ones
    const allPayables = await getPayableInstancesWithDetailsQuery(propertyIds)
    const readyPayablesByTemplate = new Map<string, number>()
    allPayables.forEach((payable) => {
      if (payable.status === "ready") {
        const count = readyPayablesByTemplate.get(payable.payableTemplateId) || 0
        readyPayablesByTemplate.set(payable.payableTemplateId, count + 1)
      }
    })

    // Fetch templates for all properties
    const templates = await db.query.payableTemplates.findMany({
      where: inArray(payableTemplatesTable.propertyId, propertyIds)
    })

    // Fetch property names
    const properties = await db.query.properties.findMany({
      where: inArray(propertiesTable.id, propertyIds)
    })
    const propertyMap = new Map(properties.map((p) => [p.id, p.name]))

    // Enrich templates with details
    const enrichedTemplates = templates.map((template) => ({
      ...template,
      propertyName: propertyMap.get(template.propertyId) || "Unknown Property",
      readyCount: readyPayablesByTemplate.get(template.id) || 0,
      bankAccountLinked: !!template.bankAccountId,
      beneficiaryLinked: !!(template as any).beneficiaryId
    }))

    return {
      isSuccess: true,
      message: "Templates retrieved successfully",
      data: enrichedTemplates
    }
  } catch (error) {
    console.error("Error getting templates with ready count:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get templates"
    }
  }
}
