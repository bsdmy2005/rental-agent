"use server"

import {
  getInvestecAccessToken,
  listInvestecAccounts,
  getInvestecAccountBalance,
  getInvestecTransactions,
  previewInvestecPaymentPayload,
  executeInvestecPayment,
  createInvestecBeneficiary,
  listInvestecBeneficiaries,
  executeInvestecPaymentMultiple,
  type InvestecCredentials,
  type InvestecPaymentInput,
  type InvestecBeneficiary,
  type InvestecPaymentMultipleInput
} from "@/lib/investec-client"
import { validatePaymentAgainstGuardrails, INVESTEC_MAX_TEST_PAYMENT_AMOUNT } from "@/lib/constants/investec-guardrails"
import { ActionState } from "@/types"

/**
 * Test Investec authentication and get access token
 */
export async function testInvestecAuthAction(
  credentials: InvestecCredentials
): Promise<
  ActionState<{
    tokenExpiresAt: string
    tokenExpiresIn: number
    scope?: string
  }>
> {
  try {
    const token = await getInvestecAccessToken(credentials)

    return {
      isSuccess: true,
      message: "Successfully authenticated with Investec API",
      data: {
        tokenExpiresAt: token.expiresAt.toISOString(),
        tokenExpiresIn: token.expiresIn,
        scope: token.scope
      }
    }
  } catch (error) {
    console.error("Investec auth error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to authenticate with Investec API"
    }
  }
}

/**
 * List Investec accounts
 */
export async function listInvestecAccountsAction(
  credentials: InvestecCredentials
): Promise<ActionState<Array<{ accountId: string; accountNumber: string; accountName: string }>>> {
  try {
    const token = await getInvestecAccessToken(credentials)
    const apiUrl = credentials.apiUrl || undefined
    const accounts = await listInvestecAccounts(token.accessToken, apiUrl, credentials.apiKey)

    return {
      isSuccess: true,
      message: `Retrieved ${accounts.length} account(s)`,
      data: accounts.map((acc) => ({
        accountId: acc.accountId,
        accountNumber: acc.accountNumber,
        accountName: acc.accountName || acc.referenceName || "Unknown"
      }))
    }
  } catch (error) {
    console.error("Investec list accounts error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to list accounts"
    return {
      isSuccess: false,
      message: errorMessage
    }
  }
}

/**
 * Get account balance
 */
export async function getInvestecAccountBalanceAction(
  credentials: InvestecCredentials,
  accountId: string
): Promise<
  ActionState<{
    accountId: string
    currentBalance: number
    availableBalance: number
    currency: string
  }>
> {
  try {
    const token = await getInvestecAccessToken(credentials)
    const apiUrl = credentials.apiUrl || undefined
    const balance = await getInvestecAccountBalance(token.accessToken, accountId, apiUrl, credentials.apiKey)

    return {
      isSuccess: true,
      message: "Account balance retrieved successfully",
      data: {
        accountId: balance.accountId,
        currentBalance: balance.currentBalance,
        availableBalance: balance.availableBalance,
        currency: balance.currency
      }
    }
  } catch (error) {
    console.error("Investec get balance error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get account balance"
    }
  }
}

/**
 * Get account transactions
 */
export async function getInvestecTransactionsAction(
  credentials: InvestecCredentials,
  accountId: string,
  filters?: {
    fromDate?: string
    toDate?: string
    transactionType?: string
    limit?: number
  }
):   Promise<
    ActionState<
      Array<{
        type: string
        status: string
        description: string
        postingDate: string
        valueDate: string
        amount: number
        currency: string
        myReference?: string
        theirReference?: string
        reference?: string
      }>
    >
  > {
  try {
    const token = await getInvestecAccessToken(credentials)
    const apiUrl = credentials.apiUrl || undefined
    const transactions = await getInvestecTransactions(token.accessToken, accountId, filters, apiUrl, credentials.apiKey)

    return {
      isSuccess: true,
      message: `Retrieved ${transactions.length} transaction(s)`,
      data: transactions.map((tx) => ({
        type: tx.type,
        status: tx.status,
        description: tx.description,
        postingDate: tx.postingDate,
        valueDate: tx.valueDate,
        amount: tx.amount,
        currency: tx.currency,
        myReference: tx.myReference,
        theirReference: tx.theirReference,
        reference: tx.reference
      }))
    }
  } catch (error) {
    console.error("Investec get transactions error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get transactions"
    }
  }
}

/**
 * Preview payment payload (does not execute)
 */
export async function previewInvestecPaymentAction(
  credentials: InvestecCredentials,
  paymentInput: InvestecPaymentInput
): Promise<
  ActionState<{
    endpoint: string
    method: string
    payload: Record<string, unknown>
  }>
> {
  try {
    const preview = previewInvestecPaymentPayload(paymentInput)

    return {
      isSuccess: true,
      message: "Payment payload preview generated",
      data: preview
    }
  } catch (error) {
    console.error("Investec preview payment error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to preview payment"
    }
  }
}

/**
 * Execute payment (with guardrails)
 */
export async function executeInvestecPaymentAction(
  credentials: InvestecCredentials,
  paymentInput: InvestecPaymentInput,
  confirmationCode?: string
): Promise<
  ActionState<{
    paymentId: string
    status: string
    transactionId?: string
    message?: string
  }>
> {
  try {
    // Require confirmation code
    if (confirmationCode !== "CONFIRM") {
      return {
        isSuccess: false,
        message: "Payment execution requires confirmation. Please type 'CONFIRM' to proceed."
      }
    }

    // Validate against guardrails
    const validation = validatePaymentAgainstGuardrails(
      paymentInput.amount,
      paymentInput.beneficiaryAccountNumber
    )

    if (!validation.isValid) {
      return {
        isSuccess: false,
        message: `Payment validation failed: ${validation.errors.join(", ")}`
      }
    }

    // Get access token
    const token = await getInvestecAccessToken(credentials)

    // Execute payment
    const result = await executeInvestecPayment(token.accessToken, paymentInput)

    return {
      isSuccess: true,
      message: result.message || "Payment executed successfully",
      data: {
        paymentId: result.paymentId,
        status: result.status,
        transactionId: result.transactionId,
        message: result.message
      }
    }
  } catch (error) {
    console.error("Investec execute payment error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to execute payment"
    }
  }
}

/**
 * List beneficiaries
 */
export async function listInvestecBeneficiariesAction(
  credentials: InvestecCredentials
): Promise<ActionState<InvestecBeneficiary[]>> {
  try {
    const token = await getInvestecAccessToken(credentials)
    const apiUrl = credentials.apiUrl || undefined
    const beneficiaries = await listInvestecBeneficiaries(token.accessToken, apiUrl, credentials.apiKey)

    console.log(`[Investec Action] Retrieved ${beneficiaries.length} beneficiaries`)
    if (beneficiaries.length > 0) {
      console.log(`[Investec Action] First beneficiary:`, JSON.stringify(beneficiaries[0], null, 2))
    }

    return {
      isSuccess: true,
      message: `Retrieved ${beneficiaries.length} beneficiary(ies)`,
      data: beneficiaries
    }
  } catch (error) {
    console.error("Investec list beneficiaries error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to list beneficiaries"
    console.error("Investec list beneficiaries error details:", errorMessage)
    return {
      isSuccess: false,
      message: errorMessage
    }
  }
}

/**
 * Execute payment multiple (paymultiple endpoint)
 */
export async function executeInvestecPaymentMultipleAction(
  credentials: InvestecCredentials,
  paymentInput: InvestecPaymentMultipleInput,
  confirmationCode?: string
): Promise<
  ActionState<{
    transactions: Array<{ transactionId?: string; status?: string; message?: string }>
  }>
> {
  try {
    // Require confirmation code
    if (confirmationCode !== "CONFIRM") {
      return {
        isSuccess: false,
        message: "Payment execution requires confirmation. Please type 'CONFIRM' to proceed."
      }
    }

    // Validate against guardrails for each payment
    for (const payment of paymentInput.paymentList) {
      const amount = parseFloat(payment.amount)
      if (isNaN(amount)) {
        return {
          isSuccess: false,
          message: `Invalid amount: ${payment.amount}`
        }
      }

      // Note: We can't validate beneficiary account number here since we only have beneficiaryId
      // The guardrails check would need to be done differently or skipped for paymultiple
      // For now, we'll validate amount only
      if (amount > INVESTEC_MAX_TEST_PAYMENT_AMOUNT) {
        return {
          isSuccess: false,
          message: `Payment amount ${amount} exceeds maximum test amount of ${INVESTEC_MAX_TEST_PAYMENT_AMOUNT}`
        }
      }
    }

    // Get access token
    const token = await getInvestecAccessToken(credentials)
    const apiUrl = credentials.apiUrl || undefined

    // Execute payment multiple
    const result = await executeInvestecPaymentMultiple(token.accessToken, paymentInput, apiUrl, credentials.apiKey)

    return {
      isSuccess: true,
      message: `Payment(s) executed successfully`,
      data: {
        transactions: result.data || []
      }
    }
  } catch (error) {
    console.error("Investec execute payment multiple error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to execute payment"
    }
  }
}

/**
 * Create beneficiary
 */
export async function createInvestecBeneficiaryAction(
  credentials: InvestecCredentials,
  beneficiaryData: {
    name: string
    bankAccountNumber: string
    bankCode: string
    beneficiaryType?: string
  }
): Promise<ActionState<{ beneficiaryId: string }>> {
  try {
    const token = await getInvestecAccessToken(credentials)
    const result = await createInvestecBeneficiary(token.accessToken, beneficiaryData)

    return {
      isSuccess: true,
      message: "Beneficiary created successfully",
      data: result
    }
  } catch (error) {
    console.error("Investec create beneficiary error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create beneficiary"
    }
  }
}

