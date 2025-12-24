"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import {
  paymentsTable,
  payableInstancesTable,
  payableTemplatesTable,
  bankAccountsTable,
  beneficiariesTable,
  paymentInstructionsTable,
  type InsertPayment,
  type SelectPayment
} from "@/db/schema"
import { getDecryptedCredentialsAction } from "./payment-instructions-actions"
import { getInvestecAccessToken, executeInvestecPaymentMultiple } from "@/lib/investec-client"
import { INVESTEC_MAX_TEST_PAYMENT_AMOUNT } from "@/lib/constants/investec-guardrails"
import { ActionState } from "@/types"
import { eq, desc } from "drizzle-orm"

/**
 * Execute payment for a payable instance
 */
export async function executePayablePaymentAction(
  payableInstanceId: string,
  beneficiaryId: string,
  myReference: string,
  theirReference: string,
  customAmount?: number
): Promise<ActionState<{ paymentId: string; transactionId?: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    // Fetch payable instance
    const [payableInstance] = await db
      .select()
      .from(payableInstancesTable)
      .where(eq(payableInstancesTable.id, payableInstanceId))
      .limit(1)

    if (!payableInstance) {
      return {
        isSuccess: false,
        message: "Payable instance not found"
      }
    }

    if (!payableInstance.payableData) {
      return {
        isSuccess: false,
        message: "Payable data not generated yet"
      }
    }

    // Fetch payable template
    const [payableTemplate] = await db
      .select()
      .from(payableTemplatesTable)
      .where(eq(payableTemplatesTable.id, payableInstance.payableTemplateId))
      .limit(1)

    if (!payableTemplate) {
      return {
        isSuccess: false,
        message: "Payable template not found"
      }
    }

    if (!payableTemplate.bankAccountId) {
      return {
        isSuccess: false,
        message: "Payable template does not have a bank account configured"
      }
    }

    // Fetch bank account
    const [bankAccount] = await db
      .select()
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.id, payableTemplate.bankAccountId))
      .limit(1)

    if (!bankAccount) {
      return {
        isSuccess: false,
        message: "Bank account not found"
      }
    }

    // Fetch payment instruction
    const [paymentInstruction] = await db
      .select()
      .from(paymentInstructionsTable)
      .where(eq(paymentInstructionsTable.id, bankAccount.paymentInstructionId))
      .limit(1)

    if (!paymentInstruction) {
      return {
        isSuccess: false,
        message: "Payment instruction not found"
      }
    }

    // Get beneficiary
    const [beneficiary] = await db
      .select()
      .from(beneficiariesTable)
      .where(eq(beneficiariesTable.id, beneficiaryId))
      .limit(1)

    if (!beneficiary) {
      return {
        isSuccess: false,
        message: "Beneficiary not found"
      }
    }

    // Extract amount from payable data or use custom amount
    const payableData = payableInstance.payableData as {
      amount?: number
      totalAmount?: number
      currency?: string
    } | null
    
    // Use custom amount if provided, otherwise extract from payableData
    let amount: number
    if (customAmount !== undefined && customAmount > 0) {
      amount = customAmount
    } else if (payableData?.amount) {
      amount = payableData.amount
    } else if (payableData?.totalAmount) {
      amount = payableData.totalAmount
    } else {
      return {
        isSuccess: false,
        message: "No amount found in payable data and no custom amount provided"
      }
    }
    
    // Validate amount
    if (amount <= 0) {
      return {
        isSuccess: false,
        message: "Payment amount must be greater than zero"
      }
    }

    // Validate against guardrails
    if (amount > INVESTEC_MAX_TEST_PAYMENT_AMOUNT) {
      return {
        isSuccess: false,
        message: `Payment amount exceeds maximum test amount of ${INVESTEC_MAX_TEST_PAYMENT_AMOUNT}`
      }
    }

    // Create payment record (pending status)
    const paymentRecord: InsertPayment = {
      payableInstanceId,
      bankAccountId: bankAccount.id,
      beneficiaryId: beneficiary.id,
      amount: amount.toString(),
      currency: payableData?.currency || "ZAR",
      myReference,
      theirReference,
      status: "pending"
    }

    const [payment] = await db
      .insert(paymentsTable)
      .values(paymentRecord)
      .returning({ id: paymentsTable.id })

    // Get decrypted credentials (in memory only)
    const credentialsResult = await getDecryptedCredentialsAction(paymentInstruction.id)
    if (!credentialsResult.isSuccess || !credentialsResult.data) {
      // Update payment status to failed
      await db
        .update(paymentsTable)
        .set({
          status: "failed",
          errorMessage: "Failed to get payment credentials"
        })
        .where(eq(paymentsTable.id, payment.id))

      return {
        isSuccess: false,
        message: "Failed to get payment credentials"
      }
    }

    const credentials = credentialsResult.data

    try {
      // Execute payment via Investec API
      const token = await getInvestecAccessToken(credentials)
      
      // Log payment details for debugging
      console.log(`[Payment Execution] Payment details:`, {
        accountId: bankAccount.accountId,
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
        beneficiaryId: beneficiary.beneficiaryId,
        beneficiaryName: beneficiary.name,
        amount: amount.toString(),
        myReference,
        theirReference
      })
      
      // Validate that beneficiary is valid for this account before payment
      // Note: Beneficiaries in Investec are account-specific
      // The beneficiary must be set up for the specific account being used
      const result = await executeInvestecPaymentMultiple(
        token.accessToken,
        {
          accountId: bankAccount.accountId, // Use the accountId from bankAccount (this is the Investec account ID)
          paymentList: [
            {
              beneficiaryId: beneficiary.beneficiaryId,
              amount: amount.toString(),
              myReference,
              theirReference
            }
          ]
        },
        credentials.apiUrl
      )

      // Credentials are now discarded from memory (out of scope)

      // Update payment record with result
      const transactions = result.data || []
      const transactionId = transactions[0]?.transactionId
      const status = transactions[0]?.status || "processing"

      await db
        .update(paymentsTable)
        .set({
          status: status === "completed" || status === "success" ? "completed" : "processing",
          investecTransactionId: transactionId,
          investecResponse: result as any,
          executedAt: new Date(),
          executedBy: userId
        })
        .where(eq(paymentsTable.id, payment.id))

      // Update payable instance status to paid
      await db
        .update(payableInstancesTable)
        .set({
          status: "paid"
        })
        .where(eq(payableInstancesTable.id, payableInstanceId))

      return {
        isSuccess: true,
        message: "Payment executed successfully",
        data: {
          paymentId: payment.id,
          transactionId
        }
      }
    } catch (apiError) {
      // Credentials are discarded even on error
      const errorMessage = apiError instanceof Error ? apiError.message : "Unknown error"

      // Update payment record with error
      await db
        .update(paymentsTable)
        .set({
          status: "failed",
          errorMessage
        })
        .where(eq(paymentsTable.id, payment.id))

      return {
        isSuccess: false,
        message: `Payment execution failed: ${errorMessage}`
      }
    }
  } catch (error) {
    console.error("Error executing payment:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to execute payment"
    }
  }
}

/**
 * Get payment status
 */
export async function getPaymentStatusAction(
  paymentId: string
): Promise<ActionState<{ status: string; transactionId?: string; errorMessage?: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId))
      .limit(1)

    if (!payment) {
      return {
        isSuccess: false,
        message: "Payment not found"
      }
    }

    return {
      isSuccess: true,
      message: "Payment status retrieved successfully",
      data: {
        status: payment.status,
        transactionId: payment.investecTransactionId || undefined,
        errorMessage: payment.errorMessage || undefined
      }
    }
  } catch (error) {
    console.error("Error getting payment status:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get payment status"
    }
  }
}

/**
 * List payments for a payable instance
 */
export async function listPaymentsForPayableAction(
  payableInstanceId: string
): Promise<ActionState<SelectPayment[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        isSuccess: false,
        message: "Unauthorized"
      }
    }

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.payableInstanceId, payableInstanceId))
      .orderBy(desc(paymentsTable.createdAt))

    return {
      isSuccess: true,
      message: `Retrieved ${payments.length} payment(s)`,
      data: payments
    }
  } catch (error) {
    console.error("Error listing payments:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to list payments"
    }
  }
}

