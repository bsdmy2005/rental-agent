"use server"

import { db } from "@/db"
import {
  propertyCodesTable,
  propertiesTable,
  type InsertPropertyCode,
  type SelectPropertyCode
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, isNull, or, gt, desc } from "drizzle-orm"
import { randomBytes } from "crypto"

/**
 * Generate a unique property code in format PROP-XXXXXX
 * Uses cryptographically secure random generation
 */
function generatePropertyCode(): string {
  // Generate 6 random alphanumeric characters
  const randomPart = randomBytes(3).toString("hex").toUpperCase().slice(0, 6)
  return `PROP-${randomPart}`
}

/**
 * Create a new property code for a property
 */
export async function generatePropertyCodeAction(
  propertyId: string,
  createdBy?: string,
  expiresAt?: Date
): Promise<ActionState<SelectPropertyCode>> {
  try {
    // Deactivate any existing active codes for this property
    await db
      .update(propertyCodesTable)
      .set({ isActive: false })
      .where(
        and(
          eq(propertyCodesTable.propertyId, propertyId),
          eq(propertyCodesTable.isActive, true)
        )
      )

    // Generate a unique code
    let code: string
    let attempts = 0
    const maxAttempts = 10

    do {
      code = generatePropertyCode()
      const [existing] = await db
        .select()
        .from(propertyCodesTable)
        .where(eq(propertyCodesTable.code, code))
        .limit(1)
      if (!existing) break
      attempts++
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      return { isSuccess: false, message: "Failed to generate unique code" }
    }

    const [newCode] = await db
      .insert(propertyCodesTable)
      .values({
        propertyId,
        code,
        isActive: true,
        createdBy: createdBy || null,
        expiresAt: expiresAt || null
      })
      .returning()

    if (!newCode) {
      return { isSuccess: false, message: "Failed to create property code" }
    }

    return {
      isSuccess: true,
      message: "Property code generated successfully",
      data: newCode
    }
  } catch (error) {
    console.error("Error generating property code:", error)
    return { isSuccess: false, message: "Failed to generate property code" }
  }
}

/**
 * Get the active property code for a property
 */
export async function getPropertyCodeAction(
  propertyId: string
): Promise<ActionState<SelectPropertyCode | null>> {
  try {
    const [code] = await db
      .select()
      .from(propertyCodesTable)
      .where(
        and(
          eq(propertyCodesTable.propertyId, propertyId),
          eq(propertyCodesTable.isActive, true),
          or(
            isNull(propertyCodesTable.expiresAt),
            gt(propertyCodesTable.expiresAt, new Date())
          )
        )
      )
      .orderBy(desc(propertyCodesTable.createdAt))
      .limit(1)

    return {
      isSuccess: true,
      message: "Property code retrieved successfully",
      data: code || null
    }
  } catch (error) {
    console.error("Error getting property code:", error)
    return { isSuccess: false, message: "Failed to get property code" }
  }
}

/**
 * Validate a property code and return the property ID
 */
export async function validatePropertyCodeAction(
  code: string
): Promise<ActionState<{ propertyId: string; propertyName: string } | null>> {
  try {
    const [propertyCode] = await db
      .select({
        propertyCode: propertyCodesTable,
        property: propertiesTable
      })
      .from(propertyCodesTable)
      .innerJoin(propertiesTable, eq(propertyCodesTable.propertyId, propertiesTable.id))
      .where(
        and(
          eq(propertyCodesTable.code, code.toUpperCase()),
          eq(propertyCodesTable.isActive, true),
          or(
            isNull(propertyCodesTable.expiresAt),
            gt(propertyCodesTable.expiresAt, new Date())
          )
        )
      )
      .limit(1)

    if (!propertyCode || !propertyCode.property) {
      return {
        isSuccess: false,
        message: "Invalid or expired property code"
      }
    }

    // Check if property has incident submission enabled
    if (!propertyCode.property.incidentSubmissionEnabled) {
      return {
        isSuccess: false,
        message: "Incident submission is disabled for this property"
      }
    }

    return {
      isSuccess: true,
      message: "Property code validated successfully",
      data: {
        propertyId: propertyCode.property.id,
        propertyName: propertyCode.property.name
      }
    }
  } catch (error) {
    console.error("Error validating property code:", error)
    return { isSuccess: false, message: "Failed to validate property code" }
  }
}

/**
 * Deactivate a property code
 */
export async function deactivatePropertyCodeAction(
  codeId: string
): Promise<ActionState<void>> {
  try {
    await db
      .update(propertyCodesTable)
      .set({ isActive: false })
      .where(eq(propertyCodesTable.id, codeId))

    return {
      isSuccess: true,
      message: "Property code deactivated successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deactivating property code:", error)
    return { isSuccess: false, message: "Failed to deactivate property code" }
  }
}

/**
 * Get all property codes for a property (including inactive)
 */
export async function getPropertyCodesByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectPropertyCode[]>> {
  try {
    const codes = await db
      .select()
      .from(propertyCodesTable)
      .where(eq(propertyCodesTable.propertyId, propertyId))
      .orderBy(desc(propertyCodesTable.createdAt))

    return {
      isSuccess: true,
      message: "Property codes retrieved successfully",
      data: codes
    }
  } catch (error) {
    console.error("Error getting property codes:", error)
    return { isSuccess: false, message: "Failed to get property codes" }
  }
}

