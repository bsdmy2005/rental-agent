"use server"

import { db } from "@/db"
import { leaseTemplatesTable } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { ActionState } from "@/types"
import type { InsertLeaseTemplate, SelectLeaseTemplate } from "@/db/schema"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { seedLeaseTemplates } from "@/db/seed/data/lease-templates"

/**
 * Ensure default template exists (call this on app startup or when needed)
 */
export async function ensureDefaultTemplateAction(): Promise<void> {
  try {
    await seedLeaseTemplates()
  } catch (error) {
    console.error("Error ensuring default template:", error)
    // Don't throw - this is a background operation
  }
}

/**
 * Get all lease templates
 */
export async function getLeaseTemplatesAction(): Promise<ActionState<SelectLeaseTemplate[]>> {
  try {
    // Ensure default template exists
    await ensureDefaultTemplateAction()

    const templates = await db
      .select()
      .from(leaseTemplatesTable)
      .orderBy(desc(leaseTemplatesTable.createdAt))

    return {
      isSuccess: true,
      message: "Templates retrieved successfully",
      data: templates
    }
  } catch (error) {
    console.error("Error getting lease templates:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get templates"
    }
  }
}

/**
 * Get lease template by ID
 */
export async function getLeaseTemplateByIdAction(
  templateId: string
): Promise<ActionState<SelectLeaseTemplate>> {
  try {
    const [template] = await db
      .select()
      .from(leaseTemplatesTable)
      .where(eq(leaseTemplatesTable.id, templateId))
      .limit(1)

    if (!template) {
      return {
        isSuccess: false,
        message: "Template not found"
      }
    }

    return {
      isSuccess: true,
      message: "Template retrieved successfully",
      data: template
    }
  } catch (error) {
    console.error("Error getting lease template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get template"
    }
  }
}

/**
 * Create lease template
 */
export async function createLeaseTemplateAction(
  template: Omit<InsertLeaseTemplate, "createdBy" | "createdAt" | "updatedAt">
): Promise<ActionState<SelectLeaseTemplate>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const userProfile = await getUserProfileByClerkIdQuery(userId)
    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // If setting as default, unset other defaults
    if (template.isDefault) {
      await db
        .update(leaseTemplatesTable)
        .set({ isDefault: false })
        .where(eq(leaseTemplatesTable.isDefault, true))
    }

    const [newTemplate] = await db
      .insert(leaseTemplatesTable)
      .values({
        ...template,
        createdBy: userProfile.id
      })
      .returning()

    return {
      isSuccess: true,
      message: "Template created successfully",
      data: newTemplate
    }
  } catch (error) {
    console.error("Error creating lease template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create template"
    }
  }
}

/**
 * Update lease template
 */
export async function updateLeaseTemplateAction(
  templateId: string,
  updates: Partial<Omit<InsertLeaseTemplate, "id" | "createdBy" | "createdAt" | "updatedAt">>
): Promise<ActionState<SelectLeaseTemplate>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      await db
        .update(leaseTemplatesTable)
        .set({ isDefault: false })
        .where(eq(leaseTemplatesTable.isDefault, true))
    }

    const [updatedTemplate] = await db
      .update(leaseTemplatesTable)
      .set(updates)
      .where(eq(leaseTemplatesTable.id, templateId))
      .returning()

    if (!updatedTemplate) {
      return {
        isSuccess: false,
        message: "Template not found"
      }
    }

    return {
      isSuccess: true,
      message: "Template updated successfully",
      data: updatedTemplate
    }
  } catch (error) {
    console.error("Error updating lease template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to update template"
    }
  }
}

/**
 * Delete lease template
 */
export async function deleteLeaseTemplateAction(
  templateId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    await db.delete(leaseTemplatesTable).where(eq(leaseTemplatesTable.id, templateId))

    return {
      isSuccess: true,
      message: "Template deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting lease template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to delete template"
    }
  }
}

/**
 * Get default lease template
 */
export async function getDefaultLeaseTemplateAction(): Promise<ActionState<SelectLeaseTemplate | null>> {
  try {
    // Ensure default template exists
    await ensureDefaultTemplateAction()

    const [template] = await db
      .select()
      .from(leaseTemplatesTable)
      .where(eq(leaseTemplatesTable.isDefault, true))
      .limit(1)

    return {
      isSuccess: true,
      message: template ? "Default template found" : "No default template set",
      data: template || null
    }
  } catch (error) {
    console.error("Error getting default lease template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get default template"
    }
  }
}
