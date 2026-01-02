"use server"

import { db } from "@/db"
import {
  propertiesTable,
  tenantsTable,
  fixedCostsTable,
  type InsertTenant,
  type SelectTenant
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, sql, and } from "drizzle-orm"

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
    // Normalize phone: remove non-digits
    const digitsOnly = phone.replace(/\D/g, "")

    // Generate all possible format variations for South African numbers
    // WhatsApp sends 27XXXXXXXXX, database might store 0XXXXXXXXX or +27XXXXXXXXX
    const phoneVariations: string[] = [digitsOnly]

    if (digitsOnly.startsWith("27") && digitsOnly.length >= 11) {
      // 27821234567 -> also try 0821234567
      phoneVariations.push("0" + digitsOnly.substring(2))
      // Also try with + prefix
      phoneVariations.push("+" + digitsOnly)
    } else if (digitsOnly.startsWith("0") && digitsOnly.length >= 10) {
      // 0821234567 -> also try 27821234567
      phoneVariations.push("27" + digitsOnly.substring(1))
      phoneVariations.push("+27" + digitsOnly.substring(1))
    }

    // Try exact match first with all variations
    for (const phoneVar of phoneVariations) {
      const [result] = await db
        .select({
          tenant: tenantsTable,
          propertyName: propertiesTable.name
        })
        .from(tenantsTable)
        .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
        .where(eq(tenantsTable.phone, phoneVar))
        .limit(1)

      if (result) {
        return {
          isSuccess: true,
          message: "Tenant found by phone",
          data: { ...result.tenant, propertyName: result.propertyName || undefined }
        }
      }
    }

    // Try flexible SQL matching (strips special chars and compares)
    // This handles cases like "+27 82 123 4567" stored in database
    const [tenant] = await db
      .select({
        tenant: tenantsTable,
        propertyName: propertiesTable.name
      })
      .from(tenantsTable)
      .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
      .where(
        sql`(
          -- Normalize stored phone: remove +, spaces, dashes, then compare
          REPLACE(REPLACE(REPLACE(REPLACE(${tenantsTable.phone}, '+', ''), ' ', ''), '-', ''), '(', '')
          IN (${digitsOnly}, ${phoneVariations[1] || digitsOnly}, ${phoneVariations[2] || digitsOnly})
          OR
          -- Also try converting stored 0-prefix to 27-prefix for comparison
          CASE
            WHEN ${tenantsTable.phone} LIKE '0%'
            THEN '27' || SUBSTRING(REPLACE(REPLACE(REPLACE(${tenantsTable.phone}, '+', ''), ' ', ''), '-', ''), 2)
            ELSE REPLACE(REPLACE(REPLACE(REPLACE(${tenantsTable.phone}, '+', ''), ' ', ''), '-', ''), '(', '')
          END = ${digitsOnly}
        )`
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

/**
 * Update tenant's rental amount
 * Prefers creating/updating a fixed cost with costType "rent" over updating tenant.rentalAmount
 * This follows the same pattern as the invoice generation logic
 */
export async function updateTenantRentalAmountAction(
  tenantId: string,
  rentalAmount: number
): Promise<ActionState<SelectTenant>> {
  try {
    // Validate tenant exists
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenantsTable.id, tenantId)
    })

    if (!tenant) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    // Validate rental amount
    if (typeof rentalAmount !== "number" || rentalAmount <= 0) {
      return {
        isSuccess: false,
        message: "Rental amount must be a positive number"
      }
    }

    // Check if there's an existing fixed cost with costType "rent"
    const existingRentFixedCost = await db
      .select()
      .from(fixedCostsTable)
      .where(
        and(
          eq(fixedCostsTable.tenantId, tenantId),
          eq(fixedCostsTable.costType, "rent"),
          eq(fixedCostsTable.isActive, true)
        )
      )
      .limit(1)

    if (existingRentFixedCost.length > 0) {
      // Update existing fixed cost
      await db
        .update(fixedCostsTable)
        .set({
          amount: rentalAmount.toString(),
          updatedAt: new Date()
        })
        .where(eq(fixedCostsTable.id, existingRentFixedCost[0].id))
    } else {
      // Create new fixed cost with costType "rent"
      await db.insert(fixedCostsTable).values({
        tenantId,
        costType: "rent",
        amount: rentalAmount.toString(),
        isActive: true
      })
    }

    // Also update tenant.rentalAmount as fallback
    const [updatedTenant] = await db
      .update(tenantsTable)
      .set({ rentalAmount: rentalAmount.toString() })
      .where(eq(tenantsTable.id, tenantId))
      .returning()

    if (!updatedTenant) {
      return { isSuccess: false, message: "Failed to update tenant" }
    }

    return {
      isSuccess: true,
      message: "Rental amount updated successfully",
      data: updatedTenant
    }
  } catch (error) {
    console.error("Error updating tenant rental amount:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to update rental amount"
    }
  }
}

