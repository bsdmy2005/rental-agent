"use server"

import { db } from "@/db"
import {
  rentalInvoiceTemplatesTable,
  type InsertRentalInvoiceTemplate,
  type SelectRentalInvoiceTemplate
} from "@/db/schema"
import { ActionState } from "@/types"
import { type FixedLineItem } from "@/types/invoice-types"
import { eq, and } from "drizzle-orm"

export async function createRentalInvoiceTemplateAction(
  invoiceTemplate: InsertRentalInvoiceTemplate
): Promise<ActionState<SelectRentalInvoiceTemplate>> {
  try {
    // Validate dependencies array exists and is an array (but allow empty array)
    if (
      invoiceTemplate.dependsOnBillTemplateIds !== undefined &&
      invoiceTemplate.dependsOnBillTemplateIds !== null &&
      !Array.isArray(invoiceTemplate.dependsOnBillTemplateIds)
    ) {
      return {
        isSuccess: false,
        message: "Bill template dependencies must be an array"
      }
    }

    // Ensure dependencies is an array (default to empty if not provided)
    if (!invoiceTemplate.dependsOnBillTemplateIds) {
      invoiceTemplate.dependsOnBillTemplateIds = []
    }

    // Validate fixed line items if provided
    if (invoiceTemplate.fixedLineItems !== undefined && invoiceTemplate.fixedLineItems !== null) {
      const fixedLineItems = invoiceTemplate.fixedLineItems as FixedLineItem[]
      if (!Array.isArray(fixedLineItems)) {
        return {
          isSuccess: false,
          message: "Fixed line items must be an array"
        }
      }
      for (const item of fixedLineItems) {
        if (!item.description || item.description.trim() === "") {
          return {
            isSuccess: false,
            message: "Fixed line item description is required"
          }
        }
        if (typeof item.amount !== "number" || item.amount <= 0) {
          return {
            isSuccess: false,
            message: "Fixed line item amount must be a positive number"
          }
        }
        if (!item.id) {
          return {
            isSuccess: false,
            message: "Fixed line item ID is required"
          }
        }
      }
    }

    // Check for existing template for this tenant and property (only one allowed)
    const existing = await db.query.rentalInvoiceTemplates.findFirst({
      where: and(
        eq(rentalInvoiceTemplatesTable.tenantId, invoiceTemplate.tenantId),
        eq(rentalInvoiceTemplatesTable.propertyId, invoiceTemplate.propertyId)
      )
    })

    if (existing) {
      return {
        isSuccess: false,
        message: "A rental invoice template already exists for this tenant. Only one template per tenant is allowed."
      }
    }

    const [newTemplate] = await db
      .insert(rentalInvoiceTemplatesTable)
      .values(invoiceTemplate)
      .returning()

    return {
      isSuccess: true,
      message: "Rental invoice template created successfully",
      data: newTemplate
    }
  } catch (error) {
    console.error("Error creating rental invoice template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create rental invoice template"
    }
  }
}

/**
 * Auto-create ONE rental invoice template for a tenant
 * Creates a template with dependencies on all bill templates that have invoice extraction enabled
 */
export async function autoCreateRentalInvoiceTemplateForTenantAction(
  tenantId: string,
  propertyId: string,
  defaultGenerationDay: number = 5,
  tenantName?: string
): Promise<ActionState<SelectRentalInvoiceTemplate>> {
  try {
    // Check if template already exists
    const existing = await db.query.rentalInvoiceTemplates.findFirst({
      where: and(
        eq(rentalInvoiceTemplatesTable.tenantId, tenantId),
        eq(rentalInvoiceTemplatesTable.propertyId, propertyId)
      )
    })

    if (existing) {
      return {
        isSuccess: true,
        message: "Rental invoice template already exists for this tenant",
        data: existing
      }
    }

    // Get all bill templates for the property
    const { getBillTemplatesByPropertyIdAction } = await import("@/actions/bill-templates-actions")
    const billTemplatesResult = await getBillTemplatesByPropertyIdAction(propertyId)

    if (!billTemplatesResult.isSuccess || !billTemplatesResult.data) {
      return {
        isSuccess: false,
        message: "Failed to retrieve bill templates"
      }
    }

    // Get extraction rules for the property
    const { getExtractionRulesByPropertyIdQuery } = await import("@/queries/extraction-rules-queries")
    const extractionRules = await getExtractionRulesByPropertyIdQuery(propertyId)

    // Find bill templates with invoice extraction enabled
    const invoiceBillTemplateIds: string[] = []
    for (const rule of extractionRules) {
      if (rule.extractForInvoice && rule.isActive) {
        // Find bill templates that use this rule
        const templates = billTemplatesResult.data.filter(
          (bt) => bt.extractionRuleId === rule.id && bt.isActive
        )
        for (const template of templates) {
          if (!invoiceBillTemplateIds.includes(template.id)) {
            invoiceBillTemplateIds.push(template.id)
          }
        }
      }
    }

    // If no bill templates with invoice extraction, create template with empty dependencies
    // User can add dependencies later
    const name = tenantName ? `${tenantName} Rental Invoice` : "Rental Invoice"

    const newTemplate: InsertRentalInvoiceTemplate = {
      propertyId,
      tenantId,
      name,
      description: null,
      dependsOnBillTemplateIds: invoiceBillTemplateIds.length > 0 ? invoiceBillTemplateIds : [],
      generationDayOfMonth: defaultGenerationDay,
      pdfTemplate: "classic", // Default to classic template
      isActive: true
    }

    const [createdTemplate] = await db.insert(rentalInvoiceTemplatesTable).values(newTemplate).returning()

    return {
      isSuccess: true,
      message: `Auto-created rental invoice template with ${invoiceBillTemplateIds.length} dependencies`,
      data: createdTemplate
    }
  } catch (error) {
    console.error("Error auto-creating rental invoice template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to auto-create rental invoice template"
    }
  }
}

export async function getRentalInvoiceTemplatesByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectRentalInvoiceTemplate[]>> {
  try {
    const templates = await db.query.rentalInvoiceTemplates.findMany({
      where: eq(rentalInvoiceTemplatesTable.propertyId, propertyId),
      orderBy: (templates, { asc }) => [asc(templates.createdAt)]
    })

    return {
      isSuccess: true,
      message: "Rental invoice templates retrieved successfully",
      data: templates
    }
  } catch (error) {
    console.error("Error getting rental invoice templates:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice templates"
    }
  }
}

/**
 * Get rental invoice template by tenant ID (returns single template or null)
 */
export async function getRentalInvoiceTemplateByTenantIdAction(
  tenantId: string
): Promise<ActionState<SelectRentalInvoiceTemplate | null>> {
  try {
    const template = await db.query.rentalInvoiceTemplates.findFirst({
      where: eq(rentalInvoiceTemplatesTable.tenantId, tenantId)
    })

    return {
      isSuccess: true,
      message: "Rental invoice template retrieved successfully",
      data: template || null
    }
  } catch (error) {
    console.error("Error getting rental invoice template:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice template"
    }
  }
}

/**
 * @deprecated Use getRentalInvoiceTemplateByTenantIdAction instead (returns single template)
 */
export async function getRentalInvoiceTemplatesByTenantIdAction(
  tenantId: string
): Promise<ActionState<SelectRentalInvoiceTemplate[]>> {
  try {
    const template = await db.query.rentalInvoiceTemplates.findFirst({
      where: eq(rentalInvoiceTemplatesTable.tenantId, tenantId)
    })

    return {
      isSuccess: true,
      message: "Rental invoice templates retrieved successfully",
      data: template ? [template] : []
    }
  } catch (error) {
    console.error("Error getting rental invoice templates:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice templates"
    }
  }
}

export async function getRentalInvoiceTemplateByIdAction(
  templateId: string
): Promise<ActionState<SelectRentalInvoiceTemplate | null>> {
  try {
    const template = await db.query.rentalInvoiceTemplates.findFirst({
      where: eq(rentalInvoiceTemplatesTable.id, templateId)
    })

    return {
      isSuccess: true,
      message: "Rental invoice template retrieved successfully",
      data: template || null
    }
  } catch (error) {
    console.error("Error getting rental invoice template:", error)
    return {
      isSuccess: false,
      message: "Failed to get rental invoice template"
    }
  }
}

export async function updateRentalInvoiceTemplateAction(
  templateId: string,
  data: Partial<InsertRentalInvoiceTemplate>
): Promise<ActionState<SelectRentalInvoiceTemplate>> {
  try {
    // Validate dependencies if provided (but allow empty array)
    if (data.dependsOnBillTemplateIds !== undefined && data.dependsOnBillTemplateIds !== null) {
      if (!Array.isArray(data.dependsOnBillTemplateIds)) {
        return {
          isSuccess: false,
          message: "Bill template dependencies must be an array"
        }
      }
      // Allow empty array - no minimum requirement
    }

    // Validate fixed line items if provided
    if (data.fixedLineItems !== undefined && data.fixedLineItems !== null) {
      const fixedLineItems = data.fixedLineItems as FixedLineItem[]
      if (!Array.isArray(fixedLineItems)) {
        return {
          isSuccess: false,
          message: "Fixed line items must be an array"
        }
      }
      for (const item of fixedLineItems) {
        if (!item.description || item.description.trim() === "") {
          return {
            isSuccess: false,
            message: "Fixed line item description is required"
          }
        }
        if (typeof item.amount !== "number" || item.amount <= 0) {
          return {
            isSuccess: false,
            message: "Fixed line item amount must be a positive number"
          }
        }
        if (!item.id) {
          return {
            isSuccess: false,
            message: "Fixed line item ID is required"
          }
        }
      }
    }

    const [updatedTemplate] = await db
      .update(rentalInvoiceTemplatesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rentalInvoiceTemplatesTable.id, templateId))
      .returning()

    if (!updatedTemplate) {
      return { isSuccess: false, message: "Rental invoice template not found" }
    }

    return {
      isSuccess: true,
      message: "Rental invoice template updated successfully",
      data: updatedTemplate
    }
  } catch (error) {
    console.error("Error updating rental invoice template:", error)
    return {
      isSuccess: false,
      message: "Failed to update rental invoice template"
    }
  }
}

export async function deleteRentalInvoiceTemplateAction(
  templateId: string
): Promise<ActionState<void>> {
  try {
    await db.delete(rentalInvoiceTemplatesTable).where(eq(rentalInvoiceTemplatesTable.id, templateId))

    return {
      isSuccess: true,
      message: "Rental invoice template deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting rental invoice template:", error)
    return {
      isSuccess: false,
      message: "Failed to delete rental invoice template"
    }
  }
}

/**
 * Update invoice template dependencies by adding or removing a bill template ID
 * Used when editing dependencies from bill template side
 */
export async function updateInvoiceTemplateDependencyAction(
  invoiceTemplateId: string,
  billTemplateId: string,
  add: boolean // true to add, false to remove
): Promise<ActionState<SelectRentalInvoiceTemplate>> {
  try {
    const template = await db.query.rentalInvoiceTemplates.findFirst({
      where: eq(rentalInvoiceTemplatesTable.id, invoiceTemplateId)
    })

    if (!template) {
      return { isSuccess: false, message: "Invoice template not found" }
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
      // Allow empty array - no minimum requirement
    }

    return await updateRentalInvoiceTemplateAction(invoiceTemplateId, {
      dependsOnBillTemplateIds: newDependencies
    })
  } catch (error) {
    console.error("Error updating invoice template dependency:", error)
    return {
      isSuccess: false,
      message: "Failed to update invoice template dependency"
    }
  }
}
