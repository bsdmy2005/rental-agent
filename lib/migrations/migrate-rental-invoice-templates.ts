/**
 * Migration script to convert rental invoice templates from old structure to new structure
 * 
 * Old structure: Multiple templates per tenant (one per bill template)
 * New structure: Single template per tenant with dependencies array
 * 
 * This script:
 * 1. Groups existing templates by tenant
 * 2. Merges multiple templates per tenant into ONE template
 * 3. Collects all billTemplateIds as dependencies
 * 4. Generates a name based on tenant name
 * 5. Uses the first template's generationDayOfMonth
 * 
 * IMPORTANT: Run this script BEFORE applying the schema migration (while billTemplateId still exists)
 * The script will convert existing data, then you can apply the schema migration to remove billTemplateId
 */

"use server"

import { db } from "@/db"
import { rentalInvoiceTemplatesTable, tenantsTable } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function migrateRentalInvoiceTemplates(): Promise<{
  success: boolean
  message: string
  migrated: number
  errors: string[]
}> {
  const errors: string[] = []
  let migrated = 0

  try {
    // Get all existing templates (old structure with billTemplateId)
    // Note: This must be run BEFORE schema migration while billTemplateId still exists
    const allTemplates = await db.query.rentalInvoiceTemplates.findMany()

    // Group by tenant
    const templatesByTenant = new Map<string, typeof allTemplates>()
    for (const template of allTemplates) {
      if (!templatesByTenant.has(template.tenantId)) {
        templatesByTenant.set(template.tenantId, [])
      }
      templatesByTenant.get(template.tenantId)!.push(template)
    }

    // Process each tenant
    for (const [tenantId, templates] of templatesByTenant.entries()) {
      if (templates.length === 0) continue

      try {
        // Get tenant info for naming
        const tenant = await db.query.tenants.findFirst({
          where: eq(tenantsTable.id, tenantId)
        })

        const tenantName = tenant?.name || "Tenant"

        // Collect all bill template IDs as dependencies
        const dependsOnBillTemplateIds: string[] = []
        let generationDayOfMonth = 5 // Default
        let isActive = true

        for (const template of templates) {
          // @ts-expect-error - billTemplateId exists in old schema
          if (template.billTemplateId) {
            // @ts-expect-error - billTemplateId exists in old schema
            dependsOnBillTemplateIds.push(template.billTemplateId)
          }
          // Use first template's generation day
          if (templates.indexOf(template) === 0) {
            generationDayOfMonth = template.generationDayOfMonth
            isActive = template.isActive
          }
        }

        if (dependsOnBillTemplateIds.length === 0) {
          errors.push(`Tenant ${tenantId}: No bill template dependencies found, skipping`)
          continue
        }

        // Delete old templates
        await db
          .delete(rentalInvoiceTemplatesTable)
          .where(eq(rentalInvoiceTemplatesTable.tenantId, tenantId))

        // Create new single template
        const [newTemplate] = await db
          .insert(rentalInvoiceTemplatesTable)
          .values({
            propertyId: templates[0].propertyId,
            tenantId,
            name: `${tenantName} Rental Invoice`,
            description: null,
            dependsOnBillTemplateIds: dependsOnBillTemplateIds,
            generationDayOfMonth,
            isActive
          })
          .returning()

        if (newTemplate) {
          migrated++
          console.log(
            `✓ Migrated tenant ${tenantId}: Merged ${templates.length} templates into 1 template with ${dependsOnBillTemplateIds.length} dependencies`
          )
        }
      } catch (error) {
        const errorMsg = `Error migrating tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    return {
      success: errors.length === 0,
      message: `Migration completed. Migrated ${migrated} tenant(s).`,
      migrated,
      errors
    }
  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`
    errors.push(errorMsg)
    return {
      success: false,
      message: errorMsg,
      migrated,
      errors
    }
  }
}

