"use server"

import { db } from "@/db"
import {
  billTemplatesTable,
  type InsertBillTemplate,
  type SelectBillTemplate
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"

export async function createBillTemplateAction(
  billTemplate: InsertBillTemplate
): Promise<ActionState<SelectBillTemplate>> {
  try {
    const [newTemplate] = await db
      .insert(billTemplatesTable)
      .values(billTemplate)
      .returning()

    return {
      isSuccess: true,
      message: "Bill template created successfully",
      data: newTemplate
    }
  } catch (error) {
    console.error("Error creating bill template:", error)
    return { isSuccess: false, message: "Failed to create bill template" }
  }
}

export async function getBillTemplatesByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectBillTemplate[]>> {
  try {
    const templates = await db.query.billTemplates.findMany({
      where: eq(billTemplatesTable.propertyId, propertyId),
      orderBy: (templates, { asc }) => [asc(templates.createdAt)]
    })

    return {
      isSuccess: true,
      message: "Bill templates retrieved successfully",
      data: templates
    }
  } catch (error) {
    console.error("Error getting bill templates:", error)
    return { isSuccess: false, message: "Failed to get bill templates" }
  }
}

export async function getBillTemplateByIdAction(
  templateId: string
): Promise<ActionState<SelectBillTemplate | null>> {
  try {
    const template = await db.query.billTemplates.findFirst({
      where: eq(billTemplatesTable.id, templateId)
    })

    return {
      isSuccess: true,
      message: "Bill template retrieved successfully",
      data: template || null
    }
  } catch (error) {
    console.error("Error getting bill template:", error)
    return { isSuccess: false, message: "Failed to get bill template" }
  }
}

export async function updateBillTemplateAction(
  templateId: string,
  data: Partial<InsertBillTemplate>
): Promise<ActionState<SelectBillTemplate>> {
  try {
    const [updatedTemplate] = await db
      .update(billTemplatesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(billTemplatesTable.id, templateId))
      .returning()

    if (!updatedTemplate) {
      return { isSuccess: false, message: "Bill template not found" }
    }

    return {
      isSuccess: true,
      message: "Bill template updated successfully",
      data: updatedTemplate
    }
  } catch (error) {
    console.error("Error updating bill template:", error)
    return { isSuccess: false, message: "Failed to update bill template" }
  }
}

export async function deleteBillTemplateAction(
  templateId: string
): Promise<ActionState<void>> {
  try {
    await db.delete(billTemplatesTable).where(eq(billTemplatesTable.id, templateId))

    return {
      isSuccess: true,
      message: "Bill template deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting bill template:", error)
    return { isSuccess: false, message: "Failed to delete bill template" }
  }
}

export async function findBillTemplateByBillTypeAndPropertyAction(
  propertyId: string,
  billType: string
): Promise<ActionState<SelectBillTemplate | null>> {
  try {
    const template = await db.query.billTemplates.findFirst({
      where: and(
        eq(billTemplatesTable.propertyId, propertyId),
        eq(billTemplatesTable.billType, billType as any),
        eq(billTemplatesTable.isActive, true)
      )
    })

    return {
      isSuccess: true,
      message: "Bill template found",
      data: template || null
    }
  } catch (error) {
    console.error("Error finding bill template:", error)
    return { isSuccess: false, message: "Failed to find bill template" }
  }
}

/**
 * Find bill template by extraction rule ID
 * Used to match bills to templates when bills have extraction rules assigned
 */
export async function findBillTemplateByExtractionRuleAction(
  propertyId: string,
  extractionRuleId: string
): Promise<ActionState<SelectBillTemplate | null>> {
  try {
    const template = await db.query.billTemplates.findFirst({
      where: and(
        eq(billTemplatesTable.propertyId, propertyId),
        eq(billTemplatesTable.extractionRuleId, extractionRuleId),
        eq(billTemplatesTable.isActive, true)
      )
    })

    return {
      isSuccess: true,
      message: "Bill template found by extraction rule",
      data: template || null
    }
  } catch (error) {
    console.error("Error finding bill template by extraction rule:", error)
    return { isSuccess: false, message: "Failed to find bill template by extraction rule" }
  }
}

