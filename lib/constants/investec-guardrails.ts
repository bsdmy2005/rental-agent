/**
 * Investec Payment Guardrails
 * 
 * These constants define safety limits for payment execution during testing.
 * These should be enforced in server actions before calling Investec's payment API.
 */

/**
 * Maximum amount allowed for test payments (in ZAR)
 * This is a hard cap to prevent accidental large transfers during testing
 */
export const INVESTEC_MAX_TEST_PAYMENT_AMOUNT = 10 // R10

/**
 * Whitelisted destination account numbers for test payments
 * Only payments to these accounts will be allowed during testing
 * Add your own test account numbers here
 */
export const INVESTEC_WHITELISTED_DESTINATION_ACCOUNTS: string[] = [
  // Add your test account numbers here
  // Example: "1234567890"
]

/**
 * Validate payment input against guardrails
 */
export interface PaymentValidationResult {
  isValid: boolean
  errors: string[]
}

export function validatePaymentAgainstGuardrails(
  amount: number,
  destinationAccount: string
): PaymentValidationResult {
  const errors: string[] = []

  // Check amount limit
  if (amount > INVESTEC_MAX_TEST_PAYMENT_AMOUNT) {
    errors.push(
      `Payment amount (R${amount}) exceeds maximum test limit of R${INVESTEC_MAX_TEST_PAYMENT_AMOUNT}`
    )
  }

  // Check whitelist
  if (
    INVESTEC_WHITELISTED_DESTINATION_ACCOUNTS.length > 0 &&
    !INVESTEC_WHITELISTED_DESTINATION_ACCOUNTS.includes(destinationAccount)
  ) {
    errors.push(
      `Destination account ${destinationAccount} is not in the whitelist. Only whitelisted accounts are allowed for test payments.`
    )
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

