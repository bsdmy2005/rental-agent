"use server"

import { db } from "@/db"
import {
  propertiesTable,
  tenantsTable,
  type InsertTenant,
  type SelectTenant
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, sql } from "drizzle-orm"

export async function createTenantAction(
  tenant: InsertTenant,
  autoCreateInvoiceTemplates: boolean = true
): Promise<ActionState<SelectTenant>> {
  try {
    const [newTenant] = await db.insert(tenantsTable).values(tenant).returning()

    if (!newTenant) {
      return { isSuccess: false, message: "Failed to create tenant" }
    }

    // Auto-create ONE rental invoice template for bill templates with invoice extraction
    if (autoCreateInvoiceTemplates) {
      try {
        const { autoCreateRentalInvoiceTemplateForTenantAction } = await import(
          "@/actions/rental-invoice-templates-actions"
        )
        const templateResult = await autoCreateRentalInvoiceTemplateForTenantAction(
          newTenant.id,
          tenant.propertyId,
          5, // Default generation day
          newTenant.name // Pass tenant name for template naming
        )
        if (templateResult.isSuccess && templateResult.data) {
          console.log(
            `[Tenant Creation] Auto-created rental invoice template for tenant ${newTenant.id}`
          )
        }
      } catch (templateError) {
        // Log but don't fail tenant creation if template creation fails
        console.error("Error auto-creating rental invoice template:", templateError)
      }
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

export async function linkLeaseAgreementToTenantAction(
  tenantId: string,
  leaseAgreementId: string
): Promise<ActionState<SelectTenant>> {
  try {
    const [updatedTenant] = await db
      .update(tenantsTable)
      .set({ leaseAgreementId })
      .where(eq(tenantsTable.id, tenantId))
      .returning()

    if (!updatedTenant) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    return {
      isSuccess: true,
      message: "Lease agreement linked to tenant successfully",
      data: updatedTenant
    }
  } catch (error) {
    console.error("Error linking lease agreement to tenant:", error)
    return { isSuccess: false, message: "Failed to link lease agreement" }
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

/**
 * Find tenant by phone number
 * Normalizes phone numbers for comparison by removing non-digit characters
 */
export async function getTenantByPhoneAction(
  phone: string
): Promise<ActionState<SelectTenant & { propertyName?: string }>> {
  try {
    // Normalize phone for comparison
    const normalizedPhone = phone.replace(/\D/g, "")

    const tenants = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.phone, normalizedPhone))
      .limit(1)

    if (tenants.length === 0) {
      // Try with different formats
      const [tenant] = await db
        .select({
          tenant: tenantsTable,
          propertyName: propertiesTable.name
        })
        .from(tenantsTable)
        .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
        .where(
          sql`REPLACE(REPLACE(REPLACE(${tenantsTable.phone}, '+', ''), ' ', ''), '-', '') = ${normalizedPhone}`
        )
        .limit(1)

      if (!tenant) {
        return { isSuccess: false, message: "Tenant not found" }
      }

      return {
        isSuccess: true,
        message: "Tenant found by phone",
        data: { ...tenant.tenant, propertyName: tenant.propertyName || undefined }
      }
    }

    // Get property name
    const [result] = await db
      .select({
        tenant: tenantsTable,
        propertyName: propertiesTable.name
      })
      .from(tenantsTable)
      .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
      .where(eq(tenantsTable.id, tenants[0].id))
      .limit(1)

    return {
      isSuccess: true,
      message: "Tenant found by phone",
      data: { ...result.tenant, propertyName: result.propertyName || undefined }
    }
  } catch (error) {
    console.error("Error finding tenant by phone:", error)
    return { isSuccess: false, message: "Failed to find tenant" }
  }
}

/**
 * Find tenant by email address
 * Normalizes email to lowercase and trims whitespace
 */
export async function getTenantByEmailAction(
  email: string
): Promise<ActionState<SelectTenant & { propertyName?: string }>> {
  try {
    const [result] = await db
      .select({
        tenant: tenantsTable,
        propertyName: propertiesTable.name
      })
      .from(tenantsTable)
      .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
      .where(eq(tenantsTable.email, email.toLowerCase().trim()))
      .limit(1)

    if (!result) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    return {
      isSuccess: true,
      message: "Tenant found by email",
      data: { ...result.tenant, propertyName: result.propertyName || undefined }
    }
  } catch (error) {
    console.error("Error finding tenant by email:", error)
    return { isSuccess: false, message: "Failed to find tenant" }
  }
}

/**
 * Update tenant's phone number (for linking after OTP verification)
 * Normalizes phone by removing non-digit characters
 */
export async function updateTenantPhoneAction(
  tenantId: string,
  phone: string
): Promise<ActionState<SelectTenant>> {
  try {
    const normalizedPhone = phone.replace(/\D/g, "")

    const [updated] = await db
      .update(tenantsTable)
      .set({ phone: normalizedPhone })
      .where(eq(tenantsTable.id, tenantId))
      .returning()

    if (!updated) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    return {
      isSuccess: true,
      message: "Tenant phone updated",
      data: updated
    }
  } catch (error) {
    console.error("Error updating tenant phone:", error)
    return { isSuccess: false, message: "Failed to update tenant phone" }
  }
}

