"use server"

import { db } from "@/db"
import {
  payableTemplatesTable,
  type InsertPayableTemplate,
  type SelectPayableTemplate
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function createPayableTemplateAction(
  payableTemplate: InsertPayableTemplate
): Promise<ActionState<SelectPayableTemplate>> {
  try {
    const [newTemplate] = await db
      .insert(payableTemplatesTable)
      .values(payableTemplate)
      .returning()

    return {
      isSuccess: true,
      message: "Payable template created successfully",
      data: newTemplate
    }
  } catch (error) {
    console.error("Error creating payable template:", error)
    return { isSuccess: false, message: "Failed to create payable template" }
  }
}

export async function getPayableTemplatesByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectPayableTemplate[]>> {
  try {
    const templates = await db.query.payableTemplates.findMany({
      where: eq(payableTemplatesTable.propertyId, propertyId),
      orderBy: (templates, { asc }) => [asc(templates.createdAt)]
    })

    return {
      isSuccess: true,
      message: "Payable templates retrieved successfully",
      data: templates
    }
  } catch (error) {
    console.error("Error getting payable templates:", error)
    return { isSuccess: false, message: "Failed to get payable templates" }
  }
}

export async function getPayableTemplateByIdAction(
  templateId: string
): Promise<ActionState<SelectPayableTemplate | null>> {
  try {
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
    return { isSuccess: false, message: "Failed to get payable template" }
  }
}

export async function updatePayableTemplateAction(
  templateId: string,
  data: Partial<InsertPayableTemplate>
): Promise<ActionState<SelectPayableTemplate>> {
  try {
    // Validate dependencies if provided
    if (data.dependsOnBillTemplateIds !== undefined) {
      if (
        !Array.isArray(data.dependsOnBillTemplateIds) ||
        data.dependsOnBillTemplateIds.length === 0
      ) {
        return {
          isSuccess: false,
          message: "At least one bill template dependency is required"
        }
      }
    }

    const [updatedTemplate] = await db
      .update(payableTemplatesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payableTemplatesTable.id, templateId))
      .returning()

    if (!updatedTemplate) {
      return { isSuccess: false, message: "Payable template not found" }
    }

    return {
      isSuccess: true,
      message: "Payable template updated successfully",
      data: updatedTemplate
    }
  } catch (error) {
    console.error("Error updating payable template:", error)
    return { isSuccess: false, message: "Failed to update payable template" }
  }
}

export async function deletePayableTemplateAction(
  templateId: string
): Promise<ActionState<void>> {
  try {
    await db
      .delete(payableTemplatesTable)
      .where(eq(payableTemplatesTable.id, templateId))

    return {
      isSuccess: true,
      message: "Payable template deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting payable template:", error)
    return { isSuccess: false, message: "Failed to delete payable template" }
  }
}

