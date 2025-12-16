"use server"

import { db } from "@/db"
import { tenantsTable, type InsertTenant, type SelectTenant } from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function createTenantAction(tenant: InsertTenant): Promise<ActionState<SelectTenant>> {
  try {
    const [newTenant] = await db.insert(tenantsTable).values(tenant).returning()

    if (!newTenant) {
      return { isSuccess: false, message: "Failed to create tenant" }
    }

    return {
      isSuccess: true,
      message: "Tenant created successfully",
      data: newTenant
    }
  } catch (error) {
    console.error("Error creating tenant:", error)
    return { isSuccess: false, message: "Failed to create tenant" }
  }
}

export async function updateTenantAction(
  tenantId: string,
  data: Partial<InsertTenant>
): Promise<ActionState<SelectTenant>> {
  try {
    const [updatedTenant] = await db
      .update(tenantsTable)
      .set(data)
      .where(eq(tenantsTable.id, tenantId))
      .returning()

    if (!updatedTenant) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    return {
      isSuccess: true,
      message: "Tenant updated successfully",
      data: updatedTenant
    }
  } catch (error) {
    console.error("Error updating tenant:", error)
    return { isSuccess: false, message: "Failed to update tenant" }
  }
}

export async function deleteTenantAction(tenantId: string): Promise<ActionState<void>> {
  try {
    await db.delete(tenantsTable).where(eq(tenantsTable.id, tenantId))

    return {
      isSuccess: true,
      message: "Tenant deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting tenant:", error)
    return { isSuccess: false, message: "Failed to delete tenant" }
  }
}

export async function linkTenantToUserProfileAction(
  tenantId: string,
  userProfileId: string
): Promise<ActionState<SelectTenant>> {
  try {
    const [updatedTenant] = await db
      .update(tenantsTable)
      .set({ userProfileId })
      .where(eq(tenantsTable.id, tenantId))
      .returning()

    if (!updatedTenant) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    return {
      isSuccess: true,
      message: "Tenant linked to user profile successfully",
      data: updatedTenant
    }
  } catch (error) {
    console.error("Error linking tenant to user profile:", error)
    return { isSuccess: false, message: "Failed to link tenant to user profile" }
  }
}

