"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import {
  beneficiariesTable,
  accountBeneficiariesTable,
  type InsertBeneficiary,
  type SelectBeneficiary
} from "@/db/schema"
import { getDecryptedCredentialsAction } from "./payment-instructions-actions"
import { getInvestecAccessToken, listInvestecBeneficiaries } from "@/lib/investec-client"
import { ActionState } from "@/types"
import { eq, and, inArray } from "drizzle-orm"

/**
 * Sync beneficiaries from Investec API and cache them
 */
export async function syncBeneficiariesAction(
  paymentInstructionId: string
): Promise<ActionState<SelectBeneficiary[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    // Get decrypted credentials
    const credentialsResult = await getDecryptedCredentialsAction(paymentInstructionId)
    if (!credentialsResult.isSuccess || !credentialsResult.data) {
      return {
        isSuccess: false,
        message: "Failed to get payment credentials"
      }
    }

    const credentials = credentialsResult.data

    // Fetch beneficiaries from Investec API
    const token = await getInvestecAccessToken(credentials)
    const investecBeneficiaries = await listInvestecBeneficiaries(
      token.accessToken,
      credentials.apiUrl,
      credentials.apiKey
    )

    // Upsert beneficiaries in database
    const syncedBeneficiaries: SelectBeneficiary[] = []

    for (const ben of investecBeneficiaries) {
      // Check if beneficiary already exists
      const existingBeneficiaries = await db
        .select()
        .from(beneficiariesTable)
        .where(
          and(
            eq(beneficiariesTable.paymentInstructionId, paymentInstructionId),
            eq(beneficiariesTable.beneficiaryId, ben.beneficiaryId)
          )
        )
        .limit(1)
      const existing = existingBeneficiaries[0]

      if (existing) {
        // Update existing beneficiary
        const [updated] = await db
          .update(beneficiariesTable)
          .set({
            name: ben.name,
            bankAccountNumber: ben.bankAccountNumber || undefined,
            bankCode: ben.bankCode || undefined,
            beneficiaryType: ben.beneficiaryType || undefined,
            lastSyncedAt: new Date()
          })
          .where(eq(beneficiariesTable.id, existing.id))
          .returning()

        if (updated) {
          syncedBeneficiaries.push(updated)
        }
      } else {
        // Insert new beneficiary
        const newBeneficiary: InsertBeneficiary = {
          paymentInstructionId,
          beneficiaryId: ben.beneficiaryId,
          name: ben.name,
          bankAccountNumber: ben.bankAccountNumber || undefined,
          bankCode: ben.bankCode || undefined,
          beneficiaryType: ben.beneficiaryType || undefined,
          lastSyncedAt: new Date()
        }

        const [inserted] = await db
          .insert(beneficiariesTable)
          .values(newBeneficiary)
          .returning()

        if (inserted) {
          syncedBeneficiaries.push(inserted)
        }
      }
    }

    return {
      isSuccess: true,
      message: `Synced ${syncedBeneficiaries.length} beneficiary(ies)`,
      data: syncedBeneficiaries
    }
  } catch (error) {
    console.error("Error syncing beneficiaries:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to sync beneficiaries"
    }
  }
}

/**
 * List cached beneficiaries for a payment instruction
 */
export async function listBeneficiariesAction(
  paymentInstructionId: string
): Promise<ActionState<SelectBeneficiary[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const beneficiaries = await db
      .select()
      .from(beneficiariesTable)
      .where(eq(beneficiariesTable.paymentInstructionId, paymentInstructionId))
      .orderBy(beneficiariesTable.name)

    return {
      isSuccess: true,
      message: `Retrieved ${beneficiaries.length} beneficiary(ies)`,
      data: beneficiaries
    }
  } catch (error) {
    console.error("Error listing beneficiaries:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to list beneficiaries"
    }
  }
}

/**
 * Associate a bank account with a beneficiary
 */
export async function associateAccountBeneficiaryAction(
  bankAccountId: string,
  beneficiaryId: string
): Promise<ActionState<{ id: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    // Check if association already exists
    const existingAssociations = await db
      .select()
      .from(accountBeneficiariesTable)
      .where(
        and(
          eq(accountBeneficiariesTable.bankAccountId, bankAccountId),
          eq(accountBeneficiariesTable.beneficiaryId, beneficiaryId)
        )
      )
      .limit(1)
    const existing = existingAssociations[0]

    if (existing) {
      return {
        isSuccess: true,
        message: "Association already exists",
        data: { id: existing.id }
      }
    }

    // Create association
    const [result] = await db
      .insert(accountBeneficiariesTable)
      .values({
        bankAccountId,
        beneficiaryId
      })
      .returning({ id: accountBeneficiariesTable.id })

    return {
      isSuccess: true,
      message: "Account-beneficiary association created successfully",
      data: { id: result.id }
    }
  } catch (error) {
    console.error("Error associating account with beneficiary:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to associate account with beneficiary"
    }
  }
}

/**
 * Get beneficiaries associated with a bank account
 */
export async function getBeneficiariesForAccountAction(
  bankAccountId: string
): Promise<ActionState<SelectBeneficiary[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const associations = await db.query.accountBeneficiaries.findMany({
      where: eq(accountBeneficiariesTable.bankAccountId, bankAccountId),
      with: {
        beneficiary: true
      }
    })

    const beneficiaries: SelectBeneficiary[] = []
    for (const assoc of associations) {
      const beneficiary = assoc.beneficiary as unknown as SelectBeneficiary | null | undefined
      if (beneficiary && typeof beneficiary === 'object' && 'id' in beneficiary) {
        beneficiaries.push(beneficiary)
      }
    }

    return {
      isSuccess: true,
      message: `Retrieved ${beneficiaries.length} beneficiary(ies)`,
      data: beneficiaries
    }
  } catch (error) {
    console.error("Error getting beneficiaries for account:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get beneficiaries for account"
    }
  }
}

/**
 * Get beneficiary details by ID
 */
export async function getBeneficiaryAction(
  id: string
): Promise<ActionState<SelectBeneficiary>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const [beneficiary] = await db
      .select()
      .from(beneficiariesTable)
      .where(eq(beneficiariesTable.id, id))
      .limit(1)

    if (!beneficiary) {
      return {
        isSuccess: false,
        message: "Beneficiary not found"
      }
    }

    return {
      isSuccess: true,
      message: "Beneficiary retrieved successfully",
      data: beneficiary
    }
  } catch (error) {
    console.error("Error getting beneficiary:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get beneficiary"
    }
  }
}

