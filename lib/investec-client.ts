/**
 * Investec API Client Helper
 * 
 * This module provides low-level functions for interacting with Investec's
 * Open Banking API (South Africa). It handles authentication, token management,
 * and API calls.
 * 
 * This is designed to be reusable for both the API Explorer and future
 * payment execution flows.
 */

export interface InvestecCredentials {
  clientId: string
  clientSecret: string
  apiKey?: string // Optional: May be needed for some API endpoints, but not for authentication
  apiUrl?: string // Optional, defaults to production
}

export interface InvestecAccessToken {
  accessToken: string
  tokenType: string
  expiresIn: number
  expiresAt: Date
  scope?: string
}

export interface InvestecAccount {
  accountId: string
  accountNumber: string
  accountName: string
  referenceName?: string
  productName?: string
}

export interface InvestecAccountBalance {
  accountId: string
  currentBalance: number
  availableBalance: number
  currency: string
}

export interface InvestecTransaction {
  accountId: string
  type: string
  status: string
  description: string
  cardNumber?: string
  postingDate: string
  valueDate: string
  amount: number
  currency: string
  myReference?: string // Reference provided by the account holder
  theirReference?: string // Reference provided by the other party
  reference?: string // General reference field
}

export interface InvestecBeneficiary {
  beneficiaryId: string // This is the key field - required for payments
  name: string
  bankAccountNumber?: string // Optional - beneficiary is already authenticated by Investec
  bankCode?: string // Optional - beneficiary is already authenticated by Investec
  beneficiaryType?: string
}

export interface InvestecPaymentInput {
  accountId: string
  beneficiaryId?: string
  beneficiaryAccountNumber: string
  beneficiaryBankCode: string
  amount: number
  currency: string
  reference: string
  paymentDate?: string // ISO date string
}

export interface InvestecPaymentMultipleInput {
  accountId: string
  paymentList: Array<{
    beneficiaryId: string
    amount: string // String format as per API
    myReference: string
    theirReference: string
  }>
}

export interface InvestecPaymentResponse {
  paymentId: string
  status: string
  transactionId?: string
  message?: string
}

// Investec API base URLs:
// - https://openapi.investec.com (production)
// - https://openapisandbox.investec.com (sandbox)
const DEFAULT_API_URL = "https://openapi.investec.com"

/**
 * Get OAuth 2.0 access token using client credentials flow
 */
export async function getInvestecAccessToken(
  credentials: InvestecCredentials
): Promise<InvestecAccessToken> {
  const apiUrl = credentials.apiUrl || DEFAULT_API_URL
  const tokenUrl = `${apiUrl}/identity/v2/oauth2/token`

  // Postman uses Basic Auth (base64 encoded client_id:client_secret) + x-api-key header
  // Body only contains grant_type=client_credentials
  const params = new URLSearchParams({
    grant_type: "client_credentials"
  })

  // Create Basic Auth header: base64(client_id:client_secret)
  const basicAuth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Authorization": `Basic ${basicAuth}`,
    "Accept": "application/json"
  }

  // Add x-api-key header if provided
  if (credentials.apiKey) {
    headers["x-api-key"] = credentials.apiKey.trim()
  }

  // Debug: Log authentication request details
  console.log(`[Investec Auth] Token URL: ${tokenUrl}`)
  console.log(`[Investec Auth] Request Headers:`, JSON.stringify(headers, null, 2))
  console.log(`[Investec Auth] Request Body:`, params.toString().replace(/client_secret=[^&]+/, "client_secret=***"))

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers,
    body: params.toString()
  })

  // Log response details
  console.log(`[Investec Auth] Response Status: ${response.status} ${response.statusText}`)
  const responseHeadersObj: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    responseHeadersObj[key] = value
  })
  console.log(`[Investec Auth] Response Headers:`, JSON.stringify(responseHeadersObj, null, 2))

  if (!response.ok) {
    const errorText = await response.text()
    let errorDetails = errorText
    try {
      const errorJson = JSON.parse(errorText)
      errorDetails = JSON.stringify(errorJson, null, 2)
    } catch {
      // Keep as text if not JSON
    }
    throw new Error(
      `Failed to get access token: ${response.status} ${response.statusText}\nToken URL: ${tokenUrl}\nResponse: ${errorDetails}`
    )
  }

  const data = await response.json()
  
  // Debug: Log token response (without exposing full token)
  console.log(`[Investec Auth] Token acquired successfully`)
  console.log(`[Investec Auth] Token type: ${data.token_type || "Bearer"}`)
  console.log(`[Investec Auth] Expires in: ${data.expires_in || 1800}s`)
  console.log(`[Investec Auth] Scope: ${data.scope || "not provided"}`)
  console.log(`[Investec Auth] Full token response:`, JSON.stringify({
    ...data,
    access_token: data.access_token ? `${data.access_token.substring(0, 20)}...` : "missing"
  }, null, 2))
  
  if (!data.access_token) {
    throw new Error("No access_token in response. Response: " + JSON.stringify(data))
  }
  
  const expiresIn = data.expires_in || 1800 // Default to 30 minutes
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || "Bearer",
    expiresIn,
    expiresAt,
    scope: data.scope
  }
}

/**
 * Make authenticated API request to Investec
 */
async function investecApiRequest<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {},
  apiUrl?: string,
  apiKey?: string
): Promise<T> {
  const baseUrl = apiUrl || DEFAULT_API_URL
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`

  // Debug: Log token info (first 20 chars only for security)
  const tokenPreview = accessToken.substring(0, 20) + "..."
  console.log(`[Investec API] Calling: ${url}`)
  console.log(`[Investec API] Method: ${options.method || "GET"}`)
  console.log(`[Investec API] Token preview: ${tokenPreview}`)

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${accessToken}`,
    "Accept": "application/json"
  }

  // Note: API Key is NOT sent as a header for API calls
  // It's only used during authentication (or not at all)
  // Postman shows that only Authorization header is needed

  // Only add Content-Type for requests with body
  if (options.body) {
    headers["Content-Type"] = "application/json"
  }

  // Log all headers being sent (for debugging)
  console.log(`[Investec API] Request Headers:`, JSON.stringify(headers, null, 2))
  if (options.body) {
    console.log(`[Investec API] Request Body:`, typeof options.body === "string" ? options.body : JSON.stringify(options.body))
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  })

  // Log response details
  console.log(`[Investec API] Response Status: ${response.status} ${response.statusText}`)
  console.log(`[Investec API] Response Headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2))

  if (!response.ok) {
    const errorText = await response.text()
    let errorDetails = errorText || "(empty response)"
    
    // Log response headers for debugging
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    
    try {
      const errorJson = JSON.parse(errorText)
      errorDetails = JSON.stringify(errorJson, null, 2)
    } catch {
      // Keep as text if not JSON
    }
    
    const errorMessage = `Investec API error: ${response.status} ${response.statusText}
URL: ${url}
Response: ${errorDetails}
Response Headers: ${JSON.stringify(responseHeaders, null, 2)}`
    
    console.error(`[Investec API Error] ${errorMessage}`)
    throw new Error(errorMessage)
  }

  return response.json()
}

/**
 * List all accounts
 * Endpoint: GET /za/pb/v1/accounts
 */
export async function listInvestecAccounts(
  accessToken: string,
  apiUrl?: string,
  apiKey?: string
): Promise<InvestecAccount[]> {
  const response = await investecApiRequest<{ data: { accounts: InvestecAccount[] } }>(
    accessToken,
    "/za/pb/v1/accounts",
    {},
    apiUrl,
    apiKey
  )
  return response.data?.accounts || []
}

/**
 * Get account balance
 * Endpoint: GET /za/pb/v1/accounts/{accountId}/balance
 */
export async function getInvestecAccountBalance(
  accessToken: string,
  accountId: string,
  apiUrl?: string,
  apiKey?: string
): Promise<InvestecAccountBalance> {
  const response = await investecApiRequest<{ data: InvestecAccountBalance }>(
    accessToken,
    `/za/pb/v1/accounts/${accountId}/balance`,
    {},
    apiUrl,
    apiKey
  )
  return response.data
}

/**
 * Get account transactions
 * Endpoint: GET /za/pb/v1/accounts/{accountId}/transactions
 */
export async function getInvestecTransactions(
  accessToken: string,
  accountId: string,
  options?: {
    fromDate?: string
    toDate?: string
    transactionType?: string
    limit?: number
  },
  apiUrl?: string,
  apiKey?: string
): Promise<InvestecTransaction[]> {
  const params = new URLSearchParams()
  if (options?.fromDate) params.append("fromDate", options.fromDate)
  if (options?.toDate) params.append("toDate", options.toDate)
  if (options?.transactionType) params.append("transactionType", options.transactionType)
  if (options?.limit) params.append("limit", options.limit.toString())

  const queryString = params.toString()
  const endpoint = `/za/pb/v1/accounts/${accountId}/transactions${queryString ? `?${queryString}` : ""}`

  const response = await investecApiRequest<{ data: { transactions: InvestecTransaction[] } }>(
    accessToken,
    endpoint,
    {},
    apiUrl,
    apiKey
  )
  return response.data?.transactions || []
}

/**
 * List all beneficiaries (global - returns beneficiaries for all accounts)
 * Endpoint: GET /za/pb/v1/accounts/beneficiaries
 */
export async function listInvestecBeneficiaries(
  accessToken: string,
  apiUrl?: string,
  apiKey?: string
): Promise<InvestecBeneficiary[]> {
  // Try different response structures
  const response = await investecApiRequest<any>(
    accessToken,
    "/za/pb/v1/accounts/beneficiaries",
    {},
    apiUrl,
    apiKey
  )
  
  // Log the response structure for debugging
  console.log("[Investec API] Beneficiaries response structure:", JSON.stringify(response, null, 2))
  
  // Try different possible response structures
  if (response.data?.beneficiaries && Array.isArray(response.data.beneficiaries)) {
    return response.data.beneficiaries
  }
  if (response.data && Array.isArray(response.data)) {
    return response.data
  }
  if (response.beneficiaries && Array.isArray(response.beneficiaries)) {
    return response.beneficiaries
  }
  if (Array.isArray(response)) {
    return response
  }
  
  console.warn("[Investec API] Unexpected beneficiaries response structure:", response)
  return []
}

/**
 * List beneficiaries for a specific account
 * Endpoint: GET /za/pb/v1/accounts/{accountId}/beneficiaries
 * Note: This endpoint may not exist in Investec API, but we'll try it
 */
export async function listInvestecBeneficiariesForAccount(
  accessToken: string,
  accountId: string,
  apiUrl?: string,
  apiKey?: string
): Promise<InvestecBeneficiary[]> {
  try {
    const response = await investecApiRequest<any>(
      accessToken,
      `/za/pb/v1/accounts/${accountId}/beneficiaries`,
      {},
      apiUrl,
      apiKey
    )
    
    // Try different possible response structures
    if (response.data?.beneficiaries && Array.isArray(response.data.beneficiaries)) {
      return response.data.beneficiaries
    }
    if (response.data && Array.isArray(response.data)) {
      return response.data
    }
    if (response.beneficiaries && Array.isArray(response.beneficiaries)) {
      return response.beneficiaries
    }
    if (Array.isArray(response)) {
      return response
    }
    
    return []
  } catch (error) {
    // If account-specific endpoint doesn't exist, fall back to global list
    console.log(`[Investec API] Account-specific beneficiaries endpoint not available, falling back to global list`)
    return listInvestecBeneficiaries(accessToken, apiUrl, apiKey)
  }
}

/**
 * Create a beneficiary (if needed before payment)
 */
export async function createInvestecBeneficiary(
  accessToken: string,
  beneficiaryData: {
    name: string
    bankAccountNumber: string
    bankCode: string
    beneficiaryType?: string
  }
): Promise<{ beneficiaryId: string }> {
  const response = await investecApiRequest<{ data: { beneficiaryId: string } }>(
    accessToken,
    "/za/pb/v1/beneficiaries",
    {
      method: "POST",
      body: JSON.stringify({
        name: beneficiaryData.name,
        bankAccountNumber: beneficiaryData.bankAccountNumber,
        bankCode: beneficiaryData.bankCode,
        beneficiaryType: beneficiaryData.beneficiaryType || "Standard"
      })
    }
  )
  return response.data
}

/**
 * Preview payment payload (does not execute, just builds the payload)
 */
export function previewInvestecPaymentPayload(
  paymentInput: InvestecPaymentInput
): {
  endpoint: string
  method: string
  payload: Record<string, unknown>
} {
  const payload: Record<string, unknown> = {
    beneficiaryAccountNumber: paymentInput.beneficiaryAccountNumber,
    amount: paymentInput.amount,
    currency: paymentInput.currency,
    myReference: paymentInput.reference,
    theirReference: paymentInput.reference
  }

  if (paymentInput.beneficiaryId) {
    payload.beneficiaryId = paymentInput.beneficiaryId
  } else {
    payload.beneficiaryBankCode = paymentInput.beneficiaryBankCode
  }

  if (paymentInput.paymentDate) {
    payload.paymentDate = paymentInput.paymentDate
  }

  return {
    endpoint: `/za/pb/v1/accounts/${paymentInput.accountId}/payments`,
    method: "POST",
    payload
  }
}

/**
 * Execute payment (actual API call)
 */
export async function executeInvestecPayment(
  accessToken: string,
  paymentInput: InvestecPaymentInput
): Promise<InvestecPaymentResponse> {
  const preview = previewInvestecPaymentPayload(paymentInput)

  const response = await investecApiRequest<{ data: InvestecPaymentResponse }>(
    accessToken,
    preview.endpoint,
    {
      method: preview.method,
      body: JSON.stringify(preview.payload)
    }
  )

  return response.data
}

/**
 * Execute multiple payments (paymultiple endpoint)
 * Endpoint: POST /za/pb/v1/accounts/{accountId}/paymultiple
 */
export async function executeInvestecPaymentMultiple(
  accessToken: string,
  paymentInput: InvestecPaymentMultipleInput,
  apiUrl?: string,
  apiKey?: string
): Promise<{ data: Array<{ transactionId?: string; status?: string; message?: string }> }> {
  const endpoint = `/za/pb/v1/accounts/${paymentInput.accountId}/paymultiple`
  
  const payload = {
    paymentList: paymentInput.paymentList
  }

  const response = await investecApiRequest<{ data: Array<{ transactionId?: string; status?: string; message?: string }> }>(
    accessToken,
    endpoint,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    apiUrl,
    apiKey
  )

  return response
}

