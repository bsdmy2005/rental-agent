"use server"

import { db } from "@/db"
import {
  rfqCodesTable,
  quoteRequestsTable,
  type InsertRfqCode,
  type SelectRfqCode
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, isNull, or, gt, desc, sql } from "drizzle-orm"
import { randomBytes, randomUUID } from "crypto"

/**
 * Generate a unique RFQ code in format RFQ-XXXXXX
 * Uses cryptographically secure random generation
 */
function generateRfqCode(): string {
  // Generate 6 random alphanumeric characters
  const randomPart = randomBytes(3).toString("hex").toUpperCase().slice(0, 6)
  return `RFQ-${randomPart}`
}

/**
 * Generate a unique RFQ code for a quote request
 */
export async function generateRfqCodeAction(
  rfqId: string,
  expiresAt?: Date,
  usageLimit?: number
): Promise<ActionState<SelectRfqCode>> {
  try {
    // Check if RFQ exists
    const [rfq] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.id, rfqId))
      .limit(1)

    if (!rfq) {
      return { isSuccess: false, message: "Quote request not found" }
    }

    // Deactivate any existing active codes for this RFQ
    await db
      .update(rfqCodesTable)
      .set({ isActive: false })
      .where(
        and(
          eq(rfqCodesTable.rfqId, rfqId),
          eq(rfqCodesTable.isActive, true)
        )
      )

    // Generate a unique code
    let code: string
    let attempts = 0
    const maxAttempts = 10

    do {
      code = generateRfqCode()
      attempts++

      // Check if code already exists
      const [existing] = await db
        .select()
        .from(rfqCodesTable)
        .where(eq(rfqCodesTable.code, code))
        .limit(1)

      if (!existing) {
        break
      }

      if (attempts >= maxAttempts) {
        return { isSuccess: false, message: "Failed to generate unique code after multiple attempts" }
      }
    } while (true)

    // Create new code
    const [newCode] = await db
      .insert(rfqCodesTable)
      .values({
        rfqId,
        code,
        isActive: true,
        expiresAt: expiresAt || null,
        usageLimit: usageLimit || null,
        usageCount: 0
      })
      .returning()

    if (!newCode) {
      return { isSuccess: false, message: "Failed to create RFQ code" }
    }

    // Update quote request with the code
    await db
      .update(quoteRequestsTable)
      .set({ rfqCode: code })
      .where(eq(quoteRequestsTable.id, rfqId))

    return {
      isSuccess: true,
      message: "RFQ code generated successfully",
      data: newCode
    }
  } catch (error) {
    console.error("Error generating RFQ code:", error)
    return { isSuccess: false, message: "Failed to generate RFQ code" }
  }
}

/**
 * Validate an RFQ code and check if it's active
 */
export async function validateRfqCodeAction(
  code: string
): Promise<ActionState<{ rfqCode: SelectRfqCode; rfqId: string }>> {
  try {
    // First try to find in rfqCodesTable
    const [rfqCode] = await db
      .select()
      .from(rfqCodesTable)
      .where(eq(rfqCodesTable.code, code))
      .limit(1)

    let quoteRequestId: string | null = null

    if (rfqCode) {
      // Check if code is active
      if (!rfqCode.isActive) {
        return { isSuccess: false, message: "RFQ code is no longer active" }
      }

      // Check if code has expired
      if (rfqCode.expiresAt && new Date(rfqCode.expiresAt) < new Date()) {
        return { isSuccess: false, message: "RFQ code has expired" }
      }

      // Check if usage limit has been reached
      if (rfqCode.usageLimit !== null && rfqCode.usageCount >= rfqCode.usageLimit) {
        return { isSuccess: false, message: "RFQ code usage limit has been reached" }
      }

      quoteRequestId = rfqCode.rfqId
    } else {
      // Fallback: check if code exists in quoteRequestsTable.rfqCode
      const [quoteRequest] = await db
        .select({ id: quoteRequestsTable.id })
        .from(quoteRequestsTable)
        .where(eq(quoteRequestsTable.rfqCode, code))
        .limit(1)

      if (!quoteRequest) {
        return { isSuccess: false, message: "Invalid RFQ code" }
      }

      quoteRequestId = quoteRequest.id

      // Create a synthetic rfqCode object for consistency
      // Note: This is a fallback - ideally all codes should be in rfqCodesTable
      const syntheticRfqCode: SelectRfqCode = {
        id: randomUUID(),
        rfqId: quoteRequest.id,
        code,
        isActive: true,
        expiresAt: null,
        usageLimit: null,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return {
        isSuccess: true,
        message: "RFQ code is valid",
        data: { rfqCode: syntheticRfqCode, rfqId: quoteRequest.id }
      }
    }

    return {
      isSuccess: true,
      message: "RFQ code is valid",
      data: { rfqCode, rfqId: quoteRequestId }
    }
  } catch (error) {
    console.error("Error validating RFQ code:", error)
    return { isSuccess: false, message: "Failed to validate RFQ code" }
  }
}

/**
 * Increment the usage count for an RFQ code
 */
export async function incrementRfqCodeUsageAction(
  code: string
): Promise<ActionState<SelectRfqCode>> {
  try {
    // First get the current value
    const [current] = await db
      .select()
      .from(rfqCodesTable)
      .where(eq(rfqCodesTable.code, code))
      .limit(1)

    if (!current) {
      return { isSuccess: false, message: "RFQ code not found" }
    }

    // Update with incremented value
    const [updated] = await db
      .update(rfqCodesTable)
      .set({
        usageCount: current.usageCount + 1,
        updatedAt: new Date()
      })
      .where(eq(rfqCodesTable.code, code))
      .returning()

    if (!updated) {
      return { isSuccess: false, message: "Failed to update usage count" }
    }

    return {
      isSuccess: true,
      message: "Usage count incremented",
      data: updated
    }
  } catch (error) {
    console.error("Error incrementing RFQ code usage:", error)
    return { isSuccess: false, message: "Failed to increment usage count" }
  }
}

/**
 * Deactivate an RFQ code
 */
export async function deactivateRfqCodeAction(
  code: string
): Promise<ActionState<SelectRfqCode>> {
  try {
    const [updated] = await db
      .update(rfqCodesTable)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(rfqCodesTable.code, code))
      .returning()

    if (!updated) {
      return { isSuccess: false, message: "RFQ code not found" }
    }

    // Also clear the code from the quote request
    await db
      .update(quoteRequestsTable)
      .set({ rfqCode: null })
      .where(eq(quoteRequestsTable.rfqCode, code))

    return {
      isSuccess: true,
      message: "RFQ code deactivated successfully",
      data: updated
    }
  } catch (error) {
    console.error("Error deactivating RFQ code:", error)
    return { isSuccess: false, message: "Failed to deactivate RFQ code" }
  }
}

/**
 * Get all RFQ codes for a specific RFQ
 */
export async function getRfqCodesByRfqIdAction(
  rfqId: string
): Promise<ActionState<SelectRfqCode[]>> {
  try {
    const codes = await db
      .select()
      .from(rfqCodesTable)
      .where(eq(rfqCodesTable.rfqId, rfqId))
      .orderBy(desc(rfqCodesTable.createdAt))

    return {
      isSuccess: true,
      message: "RFQ codes retrieved successfully",
      data: codes
    }
  } catch (error) {
    console.error("Error getting RFQ codes:", error)
    return { isSuccess: false, message: "Failed to get RFQ codes" }
  }
}

/**
 * Get service provider information associated with an RFQ code
 * This ensures we can uniquely identify which provider a code belongs to
 */
export async function getProviderByRfqCodeAction(
  code: string
): Promise<ActionState<{ serviceProviderId: string; providerName: string; providerEmail: string | null }>> {
  try {
    // Validate code and get rfqId
    const validationResult = await validateRfqCodeAction(code)
    if (!validationResult.isSuccess || !validationResult.data) {
      return { isSuccess: false, message: validationResult.message }
    }

    const { rfqId } = validationResult.data

    // Get quote request with service provider ID
    const { quoteRequestsTable, serviceProvidersTable } = await import("@/db/schema")
    const [quoteRequest] = await db
      .select({
        serviceProviderId: quoteRequestsTable.serviceProviderId
      })
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.id, rfqId))
      .limit(1)

    if (!quoteRequest || !quoteRequest.serviceProviderId) {
      return { isSuccess: false, message: "Quote request not found or not associated with a provider" }
    }

    // Get service provider details
    const [provider] = await db
      .select({
        id: serviceProvidersTable.id,
        businessName: serviceProvidersTable.businessName,
        contactName: serviceProvidersTable.contactName,
        email: serviceProvidersTable.email
      })
      .from(serviceProvidersTable)
      .where(eq(serviceProvidersTable.id, quoteRequest.serviceProviderId))
      .limit(1)

    if (!provider) {
      return { isSuccess: false, message: "Service provider not found" }
    }

    return {
      isSuccess: true,
      message: "Provider information retrieved successfully",
      data: {
        serviceProviderId: provider.id,
        providerName: provider.businessName || provider.contactName || "Unknown",
        providerEmail: provider.email
      }
    }
  } catch (error) {
    console.error("Error getting provider by RFQ code:", error)
    return { isSuccess: false, message: "Failed to get provider information" }
  }
}

