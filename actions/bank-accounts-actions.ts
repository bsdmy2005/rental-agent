"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import {
  bankAccountsTable,
  type InsertBankAccount,
  type SelectBankAccount
} from "@/db/schema"
import { getDecryptedCredentialsAction } from "./payment-instructions-actions"
import {
  getInvestecAccessToken,
  listInvestecAccounts,
  getInvestecAccountBalance
} from "@/lib/investec-client"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"

/**
 * Sync bank accounts from Investec API and cache them
 */
export async function syncBankAccountsAction(
  paymentInstructionId: string
): Promise<ActionState<SelectBankAccount[]>> {
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

    // Fetch accounts from Investec API
    const token = await getInvestecAccessToken(credentials)
    const investecAccounts = await listInvestecAccounts(
      token.accessToken,
      credentials.apiUrl,
      credentials.apiKey
    )

    // Fetch balances for each account
    const accountsWithBalances = await Promise.all(
      investecAccounts.map(async (acc) => {
        try {
          const balance = await getInvestecAccountBalance(
            token.accessToken,
            acc.accountId,
            credentials.apiUrl,
            credentials.apiKey
          )
          return {
            ...acc,
            balance: balance.currentBalance,
            currency: balance.currency
          }
        } catch {
          return {
            ...acc,
            balance: null,
            currency: "ZAR"
          }
        }
      })
    )

    // Upsert accounts in database
    const syncedAccounts: SelectBankAccount[] = []

    for (const acc of accountsWithBalances) {
      // Check if account already exists
      const existingAccounts = await db
        .select()
        .from(bankAccountsTable)
        .where(
          and(
            eq(bankAccountsTable.paymentInstructionId, paymentInstructionId),
            eq(bankAccountsTable.accountId, acc.accountId)
          )
        )
        .limit(1)
      const existing = existingAccounts[0]

      if (existing) {
        // Update existing account
        const [updated] = await db
          .update(bankAccountsTable)
          .set({
            accountNumber: acc.accountNumber,
            accountName: acc.accountName || acc.referenceName || "Unknown",
            currentBalance: acc.balance?.toString() || null,
            currency: acc.currency || "ZAR",
            lastSyncedAt: new Date()
          })
          .where(eq(bankAccountsTable.id, existing.id))
          .returning()

        if (updated) {
          syncedAccounts.push(updated)
        }
      } else {
        // Insert new account
        const newAccount: InsertBankAccount = {
          paymentInstructionId,
          accountId: acc.accountId,
          accountNumber: acc.accountNumber,
          accountName: acc.accountName || acc.referenceName || "Unknown",
          currentBalance: acc.balance?.toString() || null,
          currency: acc.currency || "ZAR",
          lastSyncedAt: new Date(),
          isActive: true
        }

        const [inserted] = await db
          .insert(bankAccountsTable)
          .values(newAccount)
          .returning()

        if (inserted) {
          syncedAccounts.push(inserted)
        }
      }
    }

    return {
      isSuccess: true,
      message: `Synced ${syncedAccounts.length} account(s)`,
      data: syncedAccounts
    }
  } catch (error) {
    console.error("Error syncing bank accounts:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to sync bank accounts"
    }
  }
}

/**
 * List cached bank accounts for a payment instruction
 */
export async function listBankAccountsAction(
  paymentInstructionId: string
): Promise<ActionState<SelectBankAccount[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const accounts = await db
      .select()
      .from(bankAccountsTable)
      .where(
        and(
          eq(bankAccountsTable.paymentInstructionId, paymentInstructionId),
          eq(bankAccountsTable.isActive, true)
        )
      )
      .orderBy(bankAccountsTable.accountName)

    return {
      isSuccess: true,
      message: `Retrieved ${accounts.length} account(s)`,
      data: accounts
    }
  } catch (error) {
    console.error("Error listing bank accounts:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to list bank accounts"
    }
  }
}

/**
 * Get bank account details
 */
export async function getBankAccountAction(
  id: string
): Promise<ActionState<SelectBankAccount>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const [account] = await db
      .select()
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.id, id))
      .limit(1)

    if (!account) {
      return {
        isSuccess: false,
        message: "Bank account not found"
      }
    }

    return {
      isSuccess: true,
      message: "Bank account retrieved successfully",
      data: account
    }
  } catch (error) {
    console.error("Error getting bank account:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get bank account"
    }
  }
}

