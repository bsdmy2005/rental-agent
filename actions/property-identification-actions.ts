"use server"

import { db } from "@/db"
import {
  propertiesTable,
  tenantsTable,
  type SelectProperty
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, ilike, or, and } from "drizzle-orm"

/**
 * Identify property by phone number
 * Matches tenant phone to property
 */
export async function identifyPropertyByPhoneAction(
  phone: string
): Promise<ActionState<{ propertyId: string; propertyName: string; tenantId?: string; tenantName?: string } | null>> {
  try {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "")

    // Search for tenant with matching phone
    const [tenant] = await db
      .select({
        tenant: tenantsTable,
        property: propertiesTable
      })
      .from(tenantsTable)
      .innerJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
      .where(
        and(
          or(
            eq(tenantsTable.phone, phone),
            eq(tenantsTable.phone, normalizedPhone),
            ilike(tenantsTable.phone, `%${normalizedPhone}%`)
          ),
          eq(propertiesTable.incidentSubmissionEnabled, true)
        )
      )
      .limit(1)

    if (!tenant || !tenant.property) {
      return {
        isSuccess: false,
        message: "No property found for this phone number"
      }
    }

    return {
      isSuccess: true,
      message: "Property identified successfully",
      data: {
        propertyId: tenant.property.id,
        propertyName: tenant.property.name,
        tenantId: tenant.tenant.id,
        tenantName: tenant.tenant.name
      }
    }
  } catch (error) {
    console.error("Error identifying property by phone:", error)
    return { isSuccess: false, message: "Failed to identify property" }
  }
}

/**
 * Search properties by address
 * Searches by street address, suburb, or postal code
 */
export async function searchPropertiesByAddressAction(
  searchTerm: string
): Promise<ActionState<Array<{ propertyId: string; propertyName: string; address: string }>>> {
  try {
    const searchPattern = `%${searchTerm}%`

    const properties = await db
      .select({
        id: propertiesTable.id,
        name: propertiesTable.name,
        streetAddress: propertiesTable.streetAddress,
        suburb: propertiesTable.suburb,
        province: propertiesTable.province,
        postalCode: propertiesTable.postalCode
      })
      .from(propertiesTable)
      .where(
        and(
          eq(propertiesTable.incidentSubmissionEnabled, true),
          or(
            ilike(propertiesTable.streetAddress, searchPattern),
            ilike(propertiesTable.suburb, searchPattern),
            ilike(propertiesTable.postalCode, searchPattern)
          )
        )
      )
      .limit(20) // Limit results to prevent abuse

    const results = properties.map((prop) => ({
      propertyId: prop.id,
      propertyName: prop.name,
      address: `${prop.streetAddress}, ${prop.suburb}, ${prop.province}${prop.postalCode ? ` ${prop.postalCode}` : ""}`
    }))

    return {
      isSuccess: true,
      message: "Properties found successfully",
      data: results
    }
  } catch (error) {
    console.error("Error searching properties by address:", error)
    return { isSuccess: false, message: "Failed to search properties" }
  }
}

