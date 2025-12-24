"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import {
  paymentInstructionsTable,
  type InsertPaymentInstruction
} from "@/db/schema"
import { encryptSecret, decryptSecret } from "@/lib/encryption"
import {
  getInvestecAccessToken,
  listInvestecAccounts,
  type InvestecCredentials
} from "@/lib/investec-client"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

/**
 * Create payment instruction with encrypted credentials
 */
export async function createPaymentInstructionAction(
  propertyId: string,
  data: {
    bankProvider: string
    clientId: string
    clientSecret: string
    apiKey?: string
    apiUrl?: string
  }
): Promise<ActionState<{ id: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    // Encrypt credentials before storing
    const encryptedClientId = encryptSecret(data.clientId)
    const encryptedClientSecret = encryptSecret(data.clientSecret)
    const encryptedApiKey = data.apiKey ? encryptSecret(data.apiKey) : null

    const paymentInstruction: InsertPaymentInstruction = {
      propertyId,
      bankProvider: data.bankProvider,
      encryptedClientId,
      encryptedClientSecret,
      encryptedApiKey: encryptedApiKey || undefined,
      apiUrl: data.apiUrl || undefined,
      isActive: true
    }

    const [result] = await db
      .insert(paymentInstructionsTable)
      .values(paymentInstruction)
      .returning({ id: paymentInstructionsTable.id })

    return {
      isSuccess: true,
      message: "Payment instruction created successfully",
      data: { id: result.id }
    }
  } catch (error) {
    console.error("Error creating payment instruction:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create payment instruction"
    }
  }
}

/**
 * Update payment instruction credentials
 */
export async function updatePaymentInstructionAction(
  id: string,
  data: {
    clientId?: string
    clientSecret?: string
    apiKey?: string
    apiUrl?: string
    isActive?: boolean
  }
): Promise<ActionState<{ id: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const updateData: Partial<InsertPaymentInstruction> = {}

    if (data.clientId !== undefined) {
      updateData.encryptedClientId = encryptSecret(data.clientId)
    }
    if (data.clientSecret !== undefined) {
      updateData.encryptedClientSecret = encryptSecret(data.clientSecret)
    }
    if (data.apiKey !== undefined) {
      updateData.encryptedApiKey = data.apiKey ? encryptSecret(data.apiKey) : undefined
    }
    if (data.apiUrl !== undefined) {
      updateData.apiUrl = data.apiUrl
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
    }

    const [result] = await db
      .update(paymentInstructionsTable)
      .set(updateData)
      .where(eq(paymentInstructionsTable.id, id))
      .returning({ id: paymentInstructionsTable.id })

    if (!result) {
      return {
        isSuccess: false,
        message: "Payment instruction not found"
      }
    }

    return {
      isSuccess: true,
      message: "Payment instruction updated successfully",
      data: { id: result.id }
    }
  } catch (error) {
    console.error("Error updating payment instruction:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to update payment instruction"
    }
  }
}

/**
 * Get payment instruction (without decrypting credentials)
 */
export async function getPaymentInstructionAction(
  id: string
): Promise<ActionState<{ id: string; propertyId: string; bankProvider: string; isActive: boolean }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const [result] = await db
      .select({
        id: paymentInstructionsTable.id,
        propertyId: paymentInstructionsTable.propertyId,
        bankProvider: paymentInstructionsTable.bankProvider,
        isActive: paymentInstructionsTable.isActive
      })
      .from(paymentInstructionsTable)
      .where(eq(paymentInstructionsTable.id, id))
      .limit(1)

    if (!result) {
      return {
        isSuccess: false,
        message: "Payment instruction not found"
      }
    }

    return {
      isSuccess: true,
      message: "Payment instruction retrieved successfully",
      data: result
    }
  } catch (error) {
    console.error("Error getting payment instruction:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get payment instruction"
    }
  }
}

/**
 * Get payment instruction for property
 */
export async function getPaymentInstructionByPropertyAction(
  propertyId: string
): Promise<ActionState<{ id: string; bankProvider: string; isActive: boolean }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const results = await db
      .select({
        id: paymentInstructionsTable.id,
        bankProvider: paymentInstructionsTable.bankProvider,
        isActive: paymentInstructionsTable.isActive
      })
      .from(paymentInstructionsTable)
      .where(eq(paymentInstructionsTable.propertyId, propertyId))
      .orderBy(paymentInstructionsTable.createdAt)
      .limit(1)
    
    const result = results[0]

    if (!result) {
      return {
        isSuccess: false,
        message: "No payment instruction found for this property"
      }
    }

    return {
      isSuccess: true,
      message: "Payment instruction retrieved successfully",
      data: result
    }
  } catch (error) {
    console.error("Error getting payment instruction:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get payment instruction"
    }
  }
}

/**
 * Test payment instruction connection (decrypts credentials, tests, then discards)
 */
export async function testPaymentInstructionAction(
  id: string
): Promise<ActionState<{ success: boolean; message: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const [instruction] = await db.query.paymentInstructions.findMany({
      where: eq(paymentInstructionsTable.id, id)
    })

    if (!instruction) {
      return {
        isSuccess: false,
        message: "Payment instruction not found"
      }
    }

    // Decrypt credentials (in memory only)
    let clientId: string
    let clientSecret: string
    let apiKey: string | undefined

    try {
      clientId = decryptSecret(instruction.encryptedClientId)
      clientSecret = decryptSecret(instruction.encryptedClientSecret)
      apiKey = instruction.encryptedApiKey ? decryptSecret(instruction.encryptedApiKey) : undefined
    } catch (decryptError) {
      return {
        isSuccess: false,
        message: "Failed to decrypt credentials. Please check your encryption key."
      }
    }

    // Test connection with Investec API
    const credentials: InvestecCredentials = {
      clientId,
      clientSecret,
      apiKey,
      apiUrl: instruction.apiUrl || undefined
    }

    try {
      const token = await getInvestecAccessToken(credentials)
      const accounts = await listInvestecAccounts(
        token.accessToken,
        credentials.apiUrl,
        credentials.apiKey
      )

      // Credentials are now discarded from memory (out of scope)
      return {
        isSuccess: true,
        message: `Connection successful! Found ${accounts.length} account(s).`,
        data: { success: true, message: `Found ${accounts.length} account(s)` }
      }
    } catch (apiError) {
      // Credentials are discarded even on error
      return {
        isSuccess: false,
        message: apiError instanceof Error ? apiError.message : "Failed to connect to Investec API"
      }
    }
  } catch (error) {
    console.error("Error testing payment instruction:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to test payment instruction"
    }
  }
}

/**
 * Get decrypted credentials for API use (internal use only)
 * Credentials are decrypted, used, and should be discarded immediately
 */
export async function getDecryptedCredentialsAction(
  id: string
): Promise<ActionState<InvestecCredentials>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const [instruction] = await db.query.paymentInstructions.findMany({
      where: eq(paymentInstructionsTable.id, id)
    })

    if (!instruction) {
      return {
        isSuccess: false,
        message: "Payment instruction not found"
      }
    }

    if (!instruction.isActive) {
      return {
        isSuccess: false,
        message: "Payment instruction is not active"
      }
    }

    // Decrypt credentials (in memory only - caller must discard after use)
    const clientId = decryptSecret(instruction.encryptedClientId)
    const clientSecret = decryptSecret(instruction.encryptedClientSecret)
    const apiKey = instruction.encryptedApiKey ? decryptSecret(instruction.encryptedApiKey) : undefined

    return {
      isSuccess: true,
      message: "Credentials retrieved",
      data: {
        clientId,
        clientSecret,
        apiKey,
        apiUrl: instruction.apiUrl || undefined
      }
    }
  } catch (error) {
    console.error("Error getting decrypted credentials:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get credentials"
    }
  }
}

