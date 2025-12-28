import { db } from "@/db"
import { leaseTemplatesTable } from "@/db/schema"
import { defaultLeaseTemplateData } from "@/lib/lease-templates/default-template"
import { eq } from "drizzle-orm"

/**
 * Seed default lease template
 * This ensures a default template always exists in the database
 */
export async function seedLeaseTemplates() {
  try {
    // Check if default template already exists
    const [existing] = await db
      .select()
      .from(leaseTemplatesTable)
      .where(eq(leaseTemplatesTable.isDefault, true))
      .limit(1)

    if (existing) {
      console.log("✅ Default lease template already exists")
      return
    }

    // Check if template with same name exists (even if not default)
    const [existingByName] = await db
      .select()
      .from(leaseTemplatesTable)
      .where(eq(leaseTemplatesTable.name, defaultLeaseTemplateData.name))
      .limit(1)

    if (existingByName) {
      // Update existing template to be default
      await db
        .update(leaseTemplatesTable)
        .set({ isDefault: true })
        .where(eq(leaseTemplatesTable.id, existingByName.id))
      console.log(`✅ Updated existing template to be default: ${existingByName.name}`)
      return
    }

    // Create default template (createdBy is optional, so we can create without user)
    const [template] = await db
      .insert(leaseTemplatesTable)
      .values({
        name: defaultLeaseTemplateData.name,
        templateData: defaultLeaseTemplateData,
        isDefault: true,
        createdBy: null // System-created template
      })
      .returning()

    console.log(`✅ Created default lease template: ${template.name}`)
  } catch (error) {
    console.error("Error seeding lease templates:", error)
    throw error
  }
}

