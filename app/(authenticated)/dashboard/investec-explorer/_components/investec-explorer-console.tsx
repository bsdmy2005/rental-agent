"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import {
  testInvestecAuthAction,
  listInvestecAccountsAction,
  getInvestecAccountBalanceAction,
  getInvestecTransactionsAction,
  previewInvestecPaymentAction,
  executeInvestecPaymentAction,
  createInvestecBeneficiaryAction,
  listInvestecBeneficiariesAction,
  executeInvestecPaymentMultipleAction
} from "@/actions/investec-explorer-actions"
import { AlertCircle, CheckCircle2, Loader2, Copy, Check, Search } from "lucide-react"
import { INVESTEC_MAX_TEST_PAYMENT_AMOUNT } from "@/lib/constants/investec-guardrails"
import type { InvestecBeneficiary } from "@/lib/investec-client"

interface InvestecCredentials {
  clientId: string
  clientSecret: string
  apiKey?: string
  apiUrl?: string
}

interface InvestecBalance {
  currency: string
  currentBalance: number
  availableBalance: number
  [key: string]: unknown
}

interface InvestecTransaction {
  type?: string
  amount: number
  currency: string
  description: string
  status: string
  postingDate: string
  valueDate?: string
  theirReference?: string
  myReference?: string
  reference?: string
  [key: string]: unknown
}

interface PaymentPreview {
  endpoint: string
  method: string
  payload: {
    paymentList: Array<{
      beneficiaryId: string
      amount: string
      myReference: string
      theirReference: string
    }>
  }
}

interface PaymentResult {
  error?: string
  [key: string]: unknown
}

export function InvestecExplorerConsole() {
  const [credentials, setCredentials] = useState<InvestecCredentials>({
    clientId: "",
    clientSecret: "",
    apiKey: "",
    apiUrl: ""
  })
  const [authStatus, setAuthStatus] = useState<{
    success: boolean
    message: string
    tokenExpiresAt?: string
  } | null>(null)
  const [accounts, setAccounts] = useState<
    Array<{ accountId: string; accountNumber: string; accountName: string }>
  >([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [balances, setBalances] = useState<Record<string, InvestecBalance>>({})
  const [balanceErrors, setBalanceErrors] = useState<Record<string, string>>({})
  const [transactions, setTransactions] = useState<Record<string, InvestecTransaction[]>>({})
  const [transactionsErrors, setTransactionsErrors] = useState<Record<string, string>>({})
  // Reconciliation tab state
  const [reconciliationAccountId, setReconciliationAccountId] = useState<string>("")
  const [reconciliationFromDate, setReconciliationFromDate] = useState<string>("")
  const [reconciliationToDate, setReconciliationToDate] = useState<string>("")
  const [reconciliationTransactions, setReconciliationTransactions] = useState<InvestecTransaction[]>([])
  const [reconciliationError, setReconciliationError] = useState<string | null>(null)
  const [beneficiaries, setBeneficiaries] = useState<InvestecBeneficiary[]>([])
  const [beneficiariesError, setBeneficiariesError] = useState<string | null>(null)
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>("")
  const [beneficiarySearchQuery, setBeneficiarySearchQuery] = useState<string>("")
  const [paymentInput, setPaymentInput] = useState({
    accountId: "",
    beneficiaryId: "",
    amount: "",
    myReference: "",
    theirReference: "",
    paymentDate: ""
  })
  const [paymentPreview, setPaymentPreview] = useState<PaymentPreview | null>(null)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [confirmationCode, setConfirmationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const handleTestAuth = async () => {
    setLoading(true)
    setAuthStatus(null)
    try {
      const result = await testInvestecAuthAction(credentials)
      if (result.isSuccess && result.data) {
        setAuthStatus({
          success: true,
          message: result.message,
          tokenExpiresAt: result.data.tokenExpiresAt
        })
      } else {
        setAuthStatus({
          success: false,
          message: result.message
        })
      }
    } catch (error) {
      setAuthStatus({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleListAccounts = async () => {
    setLoading(true)
    try {
      const result = await listInvestecAccountsAction(credentials)
      if (result.isSuccess && result.data) {
        setAccounts(result.data)
        // Don't auto-select, let user choose
      }
    } catch (error) {
      console.error("Error listing accounts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGetBalance = async () => {
    if (selectedAccountIds.length === 0) {
      setBalanceErrors({ general: "Please select at least one account first" })
      return
    }
    setLoading(true)
    setBalanceErrors({})

    // Fetch balance for all selected accounts
    const balancePromises = selectedAccountIds.map(async (accountId) => {
      try {
        const result = await getInvestecAccountBalanceAction(credentials, accountId)
        if (result.isSuccess && result.data) {
          setBalances((prev) => ({ ...prev, [accountId]: result.data as InvestecBalance }))
          setBalanceErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors[accountId]
            return newErrors
          })
        } else {
          setBalanceErrors((prev) => ({
            ...prev,
            [accountId]: result.message || "Failed to get balance"
          }))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error getting balance"
        setBalanceErrors((prev) => ({ ...prev, [accountId]: errorMessage }))
        console.error(`Error getting balance for account ${accountId}:`, error)
      }
    })

    await Promise.all(balancePromises)
    setLoading(false)
  }

  const handleGetTransactions = async () => {
    if (selectedAccountIds.length === 0) {
      setTransactionsErrors({ general: "Please select at least one account first" })
      return
    }
    setLoading(true)
    setTransactionsErrors({})

    // Fetch transactions for all selected accounts
    const transactionPromises = selectedAccountIds.map(async (accountId) => {
      try {
        const result = await getInvestecTransactionsAction(credentials, accountId, {
          limit: 20
        })
        if (result.isSuccess && result.data) {
          setTransactions((prev) => ({ ...prev, [accountId]: result.data as InvestecTransaction[] }))
          setTransactionsErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors[accountId]
            return newErrors
          })
        } else {
          setTransactionsErrors((prev) => ({
            ...prev,
            [accountId]: result.message || "Failed to get transactions"
          }))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error getting transactions"
        setTransactionsErrors((prev) => ({ ...prev, [accountId]: errorMessage }))
        console.error(`Error getting transactions for account ${accountId}:`, error)
      }
    })

    await Promise.all(transactionPromises)
    setLoading(false)
  }

  const handleReconciliationSearch = async () => {
    if (!reconciliationAccountId) {
      setReconciliationError("Please select an account")
      return
    }
    if (!reconciliationFromDate || !reconciliationToDate) {
      setReconciliationError("Please specify both from and to dates")
      return
    }

    setLoading(true)
    setReconciliationTransactions([])
    setReconciliationError(null)

    try {
      // Format dates as YYYY-MM-DD for Investec API
      const fromDate = new Date(reconciliationFromDate).toISOString().split("T")[0]
      const toDate = new Date(reconciliationToDate).toISOString().split("T")[0]

      const result = await getInvestecTransactionsAction(credentials, reconciliationAccountId, {
        fromDate,
        toDate,
        limit: 1000 // Get more transactions for reconciliation
      })

      if (result.isSuccess && result.data) {
        setReconciliationTransactions(result.data as InvestecTransaction[])
        setReconciliationError(null)
      } else {
        setReconciliationError(result.message || "Failed to get transactions")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error getting transactions"
      setReconciliationError(errorMessage)
      console.error("Error getting reconciliation transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadBeneficiaries = async () => {
    setLoading(true)
    setBeneficiaries([])
    setBeneficiariesError(null)
    try {
      console.log("[UI] Loading beneficiaries...")
      const result = await listInvestecBeneficiariesAction(credentials)
      console.log("[UI] Beneficiaries result:", result)
      if (result.isSuccess && result.data) {
        console.log(`[UI] Setting ${result.data.length} beneficiaries`)
        setBeneficiaries(result.data)
        setBeneficiariesError(null)
      } else {
        const errorMsg = result.message || "Failed to load beneficiaries"
        console.error("[UI] Failed to load beneficiaries:", errorMsg)
        setBeneficiariesError(errorMsg)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error loading beneficiaries"
      console.error("[UI] Error loading beneficiaries:", error)
      setBeneficiariesError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectBeneficiary = (beneficiaryId: string) => {
    setSelectedBeneficiaryId(beneficiaryId)
    setPaymentInput((prev) => ({ ...prev, beneficiaryId }))
    // Switch to payments tab after selection (optional - can be removed if not desired)
    // This would require adding a tab state management, so leaving it out for now
  }

  const handlePreviewPayment = async () => {
    if (!paymentInput.beneficiaryId) {
      alert("Please select a beneficiary")
      return
    }
    if (!paymentInput.accountId && selectedAccountIds.length === 0) {
      alert("Please select an account")
      return
    }
    if (!paymentInput.amount || !paymentInput.myReference || !paymentInput.theirReference) {
      alert("Please fill in all required fields (amount, my reference, their reference)")
      return
    }

    setLoading(true)
    setPaymentPreview(null)
    try {
      const accountId = paymentInput.accountId || selectedAccountIds[0] || ""
      const payload = {
        endpoint: `/za/pb/v1/accounts/${accountId}/paymultiple`,
        method: "POST",
        payload: {
          paymentList: [
            {
              beneficiaryId: paymentInput.beneficiaryId,
              amount: paymentInput.amount,
              myReference: paymentInput.myReference,
              theirReference: paymentInput.theirReference
            }
          ]
        }
      }
      setPaymentPreview(payload as PaymentPreview)
    } catch (error) {
      console.error("Error previewing payment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExecutePayment = async () => {
    if (confirmationCode !== "CONFIRM") {
      alert("Please type 'CONFIRM' to execute the payment")
      return
    }
    if (!paymentInput.beneficiaryId) {
      alert("Please select a beneficiary")
      return
    }
    if (!paymentInput.accountId && selectedAccountIds.length === 0) {
      alert("Please select an account")
      return
    }
    if (!paymentInput.amount || !paymentInput.myReference || !paymentInput.theirReference) {
      alert("Please fill in all required fields")
      return
    }

    setLoading(true)
    setPaymentResult(null)
    try {
      const accountId = paymentInput.accountId || selectedAccountIds[0] || ""
      const result = await executeInvestecPaymentMultipleAction(
        credentials,
        {
          accountId,
          paymentList: [
            {
              beneficiaryId: paymentInput.beneficiaryId,
              amount: paymentInput.amount,
              myReference: paymentInput.myReference,
              theirReference: paymentInput.theirReference
            }
          ]
        },
        confirmationCode
      )
      if (result.isSuccess && result.data) {
        setPaymentResult(result.data as PaymentResult)
        setConfirmationCode("")
      } else {
        setPaymentResult({ error: result.message } as PaymentResult)
      }
    } catch (error) {
      setPaymentResult({
        error: error instanceof Error ? error.message : "Unknown error"
      } as PaymentResult)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatJSON = (obj: unknown) => {
    return JSON.stringify(obj, null, 2)
  }

  const formatCurrency = (amount: number, currency: string = "ZAR") => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const isIncomingTransaction = (tx: InvestecTransaction) => {
    // Check transaction type field for debit/credit indication
    const typeLower = tx.type?.toLowerCase() || ""
    
    // If type explicitly indicates credit, it's incoming (green)
    if (typeLower.includes("credit") || typeLower === "c") {
      return true
    }
    
    // If type explicitly indicates debit, it's outgoing (red)
    if (typeLower.includes("debit") || typeLower === "d") {
      return false
    }
    
    // Fallback: In Investec, credits are typically negative amounts, debits are positive
    // Credit = incoming (green) = negative amount
    // Debit = outgoing (red) = positive amount
    return tx.amount < 0
  }

  const setDateRange = (days: number) => {
    const today = new Date()
    const toDate = new Date(today)
    const fromDate = new Date(today)
    fromDate.setDate(today.getDate() - days)

    // Format as YYYY-MM-DD for date inputs
    const formatDateForInput = (date: Date) => {
      return date.toISOString().split("T")[0]
    }

    setReconciliationToDate(formatDateForInput(toDate))
    setReconciliationFromDate(formatDateForInput(fromDate))
  }

  const setLastThreeDays = () => setDateRange(3)
  const setLastWeek = () => setDateRange(7)
  const setLastMonth = () => setDateRange(30)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="readonly">Read-Only APIs</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Investec API Credentials</CardTitle>
              <CardDescription>
                Enter your Investec Client ID, Client Secret, and API Key to authenticate with the API.
                Authentication uses Basic Auth (Client ID:Secret) and requires the API Key in x-api-key header.
                These credentials are never stored and are only used for the current session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  type="text"
                  placeholder="Enter your Investec Client ID"
                  value={credentials.clientId}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, clientId: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="Enter your Investec Client Secret"
                  value={credentials.clientSecret}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, clientSecret: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your Investec API Key"
                  value={credentials.apiKey || ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, apiKey: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Required: Used in x-api-key header during authentication
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL (Optional)</Label>
                <Input
                  id="apiUrl"
                  type="text"
                  placeholder="https://openapi.investec.com (default)"
                  value={credentials.apiUrl}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, apiUrl: e.target.value }))
                  }
                />
              </div>
              <Button
                onClick={handleTestAuth}
                disabled={loading || !credentials.clientId || !credentials.clientSecret || !credentials.apiKey}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Authentication"
                )}
              </Button>
              {authStatus && (
                <Alert variant={authStatus.success ? "default" : "destructive"}>
                  {authStatus.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{authStatus.success ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {authStatus.message}
                    {authStatus.tokenExpiresAt && (
                      <div className="mt-2 text-xs">
                        Token expires at: {new Date(authStatus.tokenExpiresAt).toLocaleString()}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Read-Only APIs Tab */}
        <TabsContent value="readonly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information APIs</CardTitle>
              <CardDescription>
                Explore read-only endpoints to view accounts, balances, and transactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* List Accounts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>List Accounts</Label>
                  <Button onClick={handleListAccounts} disabled={loading} size="sm">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Fetch Accounts"
                    )}
                  </Button>
                </div>
                {accounts.length > 0 && (
                  <div className="rounded-md border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium">
                        Select accounts ({accounts.length} available):
                      </div>
                      {selectedAccountIds.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAccountIds([])
                            setBalances({})
                            setBalanceErrors({})
                            setTransactions({})
                            setTransactionsErrors({})
                          }}
                        >
                          Clear Selection
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {accounts.map((acc, index) => {
                        const isSelected = selectedAccountIds.includes(acc.accountId)
                        return (
                          <div
                            key={`${acc.accountId}-${acc.accountNumber}-${index}`}
                            className={`flex items-center gap-3 rounded p-3 border transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-muted border-transparent"
                            }`}
                            onClick={(e) => {
                              e.preventDefault()
                              if (isSelected) {
                                // Deselect
                                setSelectedAccountIds((prev) =>
                                  prev.filter((id) => id !== acc.accountId)
                                )
                                setBalances((prev) => {
                                  const newBalances = { ...prev }
                                  delete newBalances[acc.accountId]
                                  return newBalances
                                })
                                setTransactions((prev) => {
                                  const newTransactions = { ...prev }
                                  delete newTransactions[acc.accountId]
                                  return newTransactions
                                })
                              } else {
                                // Select
                                setSelectedAccountIds((prev) => [...prev, acc.accountId])
                              }
                            }}
                          >
                            <div className="flex-shrink-0">
                              <div
                                className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                                  isSelected
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground"
                                }`}
                              >
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{acc.accountName}</div>
                              <div className="text-sm text-muted-foreground">
                                {acc.accountNumber} • {acc.accountId.substring(0, 20)}...
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {selectedAccountIds.length > 0 && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        {selectedAccountIds.length} account(s) selected
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Get Balance */}
              {selectedAccountIds.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Account Balances</Label>
                    <Button onClick={handleGetBalance} disabled={loading} size="sm">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `Get Balance${selectedAccountIds.length > 1 ? "es" : ""}`
                      )}
                    </Button>
                  </div>
                  {balanceErrors.general && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{balanceErrors.general}</AlertDescription>
                    </Alert>
                  )}
                  {Object.keys(balances).length > 0 && (
                    <div className="space-y-4">
                      {selectedAccountIds.map((accountId) => {
                        const account = accounts.find((a) => a.accountId === accountId)
                        const balance = balances[accountId]
                        const error = balanceErrors[accountId]
                        return (
                          <div key={accountId} className="rounded-md border p-4">
                            <div className="mb-3 font-medium text-sm">
                              {account?.accountName || accountId}
                            </div>
                            {error ? (
                              <Alert variant="destructive" className="text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                              </Alert>
                            ) : balance ? (
                              <>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Balance:</span>
                                    <span className="font-medium">
                                      {balance.currency} {balance.currentBalance.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Available Balance:</span>
                                    <span className="font-medium">
                                      {balance.currency} {balance.availableBalance.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      copyToClipboard(formatJSON(balance), `balance-${accountId}`)
                                    }
                                  >
                                    {copied === `balance-${accountId}` ? (
                                      <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy JSON
                                      </>
                                    )}
                                  </Button>
                                </div>
                                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                                  {formatJSON(balance)}
                                </pre>
                              </>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Get Transactions */}
              {selectedAccountIds.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Recent Transactions</Label>
                    <Button onClick={handleGetTransactions} disabled={loading} size="sm">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `Get Transactions${selectedAccountIds.length > 1 ? " (All)" : ""}`
                      )}
                    </Button>
                  </div>
                  {transactionsErrors.general && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{transactionsErrors.general}</AlertDescription>
                    </Alert>
                  )}
                  {Object.keys(transactions).length > 0 && (
                    <div className="space-y-4">
                      {selectedAccountIds.map((accountId) => {
                        const account = accounts.find((a) => a.accountId === accountId)
                        const accountTransactions = transactions[accountId] || []
                        const error = transactionsErrors[accountId]
                        return (
                          <div key={accountId} className="rounded-md border p-4">
                            <div className="mb-3 font-medium text-sm">
                              {account?.accountName || accountId} ({accountTransactions.length}{" "}
                              transactions)
                            </div>
                            {error ? (
                              <Alert variant="destructive" className="text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                              </Alert>
                            ) : accountTransactions.length > 0 ? (
                              <>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                  {accountTransactions.map((tx, idx) => {
                                    const isIncoming = isIncomingTransaction(tx as InvestecTransaction)
                                    return (
                                      <div
                                        key={idx}
                                        className={`rounded border p-3 text-sm ${
                                          isIncoming
                                            ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                                            : "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1">
                                            <div className="font-medium">{tx.description}</div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                              {tx.type} • {tx.status} •{" "}
                                              {new Date(tx.postingDate).toLocaleDateString()}
                                            </div>
                                            {(tx.theirReference || tx.myReference || tx.reference) && (
                                              <div className="mt-1 text-xs">
                                                <span className="font-medium text-muted-foreground">Reference: </span>
                                                <span className="text-blue-600 dark:text-blue-400 font-mono">
                                                  {tx.theirReference || tx.myReference || tx.reference}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex flex-col items-end gap-1">
                                            <div
                                              className={`font-semibold ${
                                                isIncoming ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                                              }`}
                                            >
                                              {isIncoming ? "+" : "-"}{" "}
                                              {formatCurrency(Math.abs(tx.amount), tx.currency)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {isIncoming ? "Incoming" : "Outgoing"}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                                <div className="mt-4 flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      copyToClipboard(
                                        formatJSON(accountTransactions),
                                        `transactions-${accountId}`
                                      )
                                    }
                                  >
                                    {copied === `transactions-${accountId}` ? (
                                      <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy JSON
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Reconciliation</CardTitle>
              <CardDescription>
                Search transactions by date range for a specific account. Useful for reconciling
                payments and verifying tenant payments have been received.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Selection */}
              <div className="space-y-2">
                <Label>Select Account</Label>
                {accounts.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please fetch accounts first from the "Read-Only APIs" tab
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={reconciliationAccountId}
                      onChange={(e) => {
                        setReconciliationAccountId(e.target.value)
                        setReconciliationTransactions([])
                        setReconciliationError(null)
                      }}
                    >
                      <option value="">-- Select an account --</option>
                      {accounts.map((acc, index) => (
                        <option
                          key={`${acc.accountId}-${acc.accountNumber}-${index}`}
                          value={acc.accountId}
                        >
                          {acc.accountName} ({acc.accountNumber})
                        </option>
                      ))}
                    </select>
                    {reconciliationAccountId && (
                      <p className="text-xs text-muted-foreground">
                        Selected:{" "}
                        {accounts.find((a) => a.accountId === reconciliationAccountId)?.accountName}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Date Range */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reconciliationFromDate">From Date *</Label>
                    <Input
                      id="reconciliationFromDate"
                      type="date"
                      value={reconciliationFromDate}
                      onChange={(e) => setReconciliationFromDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reconciliationToDate">To Date *</Label>
                    <Input
                      id="reconciliationToDate"
                      type="date"
                      value={reconciliationToDate}
                      onChange={(e) => setReconciliationToDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Quick Date Range Shortcuts */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground self-center">Quick select:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setLastThreeDays}
                    disabled={loading}
                  >
                    Last 3 Days
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setLastWeek}
                    disabled={loading}
                  >
                    Last Week
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setLastMonth}
                    disabled={loading}
                  >
                    Last Month
                  </Button>
                </div>
              </div>

              {/* Search Button */}
              <Button
                onClick={handleReconciliationSearch}
                disabled={
                  loading ||
                  !reconciliationAccountId ||
                  !reconciliationFromDate ||
                  !reconciliationToDate
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  "Search Transactions"
                )}
              </Button>

              {/* Error Display */}
              {reconciliationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{reconciliationError}</AlertDescription>
                </Alert>
              )}

              {/* Results */}
              {reconciliationTransactions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      Found {reconciliationTransactions.length} transaction(s)
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(formatJSON(reconciliationTransactions), "reconciliation")
                      }
                    >
                      {copied === "reconciliation" ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy All JSON
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Transactions Table */}
                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Date</th>
                            <th className="px-4 py-3 text-left font-medium">Description</th>
                            <th className="px-4 py-3 text-left font-medium">Reference</th>
                            <th className="px-4 py-3 text-left font-medium">Type</th>
                            <th className="px-4 py-3 text-left font-medium">Status</th>
                            <th className="px-4 py-3 text-left font-medium">Direction</th>
                            <th className="px-4 py-3 text-right font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reconciliationTransactions.map((tx, idx) => {
                            const isIncoming = isIncomingTransaction(tx)
                            return (
                              <tr
                                key={idx}
                                className={`border-t transition-colors ${
                                  isIncoming
                                    ? "hover:bg-green-50/50 dark:hover:bg-green-950/10"
                                    : "hover:bg-red-50/50 dark:hover:bg-red-950/10"
                                }`}
                              >
                                <td className="px-4 py-3">
                                  {new Date(tx.postingDate).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium">{tx.description}</div>
                                  {tx.valueDate && (
                                    <div className="text-xs text-muted-foreground">
                                      Value Date: {new Date(tx.valueDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {(tx.theirReference || tx.myReference || tx.reference) ? (
                                    <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-medium">
                                      {tx.theirReference || tx.myReference || tx.reference}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="rounded bg-secondary px-2 py-1 text-xs">
                                    {tx.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded px-2 py-1 text-xs ${
                                      tx.status === "posted"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : tx.status === "pending"
                                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                    }`}
                                  >
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded px-2 py-1 text-xs font-medium ${
                                      isIncoming
                                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                    }`}
                                  >
                                    {isIncoming ? "↑ Incoming" : "↓ Outgoing"}
                                  </span>
                                </td>
                                <td
                                  className={`px-4 py-3 text-right font-semibold ${
                                    isIncoming
                                      ? "text-green-700 dark:text-green-400"
                                      : "text-red-700 dark:text-red-400"
                                  }`}
                                >
                                  {isIncoming ? "+" : "-"}{" "}
                                  {formatCurrency(Math.abs(tx.amount), tx.currency)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 rounded-md border p-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Transactions</div>
                      <div className="text-lg font-semibold">
                        {reconciliationTransactions.length}
                      </div>
                    </div>
                    <div className="rounded-md bg-green-50/50 dark:bg-green-950/20 p-3 border border-green-200 dark:border-green-900">
                      <div className="text-xs text-muted-foreground mb-1">Total Incoming</div>
                      <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                        {formatCurrency(
                          Math.abs(
                            reconciliationTransactions
                              .filter((tx) => isIncomingTransaction(tx))
                              .reduce((sum: number, tx) => sum + Math.abs(tx.amount), 0)
                          ),
                          reconciliationTransactions[0]?.currency || "ZAR"
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {reconciliationTransactions.filter((tx) => isIncomingTransaction(tx))
                          .length}{" "}
                        transaction(s)
                      </div>
                    </div>
                    <div className="rounded-md bg-red-50/50 dark:bg-red-950/20 p-3 border border-red-200 dark:border-red-900">
                      <div className="text-xs text-muted-foreground mb-1">Total Outgoing</div>
                      <div className="text-lg font-semibold text-red-700 dark:text-red-400">
                        {formatCurrency(
                          reconciliationTransactions
                            .filter((tx) => !isIncomingTransaction(tx))
                            .reduce((sum: number, tx) => sum + Math.abs(tx.amount), 0),
                          reconciliationTransactions[0]?.currency || "ZAR"
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {reconciliationTransactions.filter((tx) => !isIncomingTransaction(tx))
                          .length}{" "}
                        transaction(s)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Beneficiaries Tab */}
        <TabsContent value="beneficiaries" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Beneficiaries</AlertTitle>
            <AlertDescription>
              Beneficiaries must be set up via online banking before they can be used for API payments. This tab only lists existing beneficiaries.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>List Beneficiaries</CardTitle>
              <CardDescription>
                View all beneficiaries that have been set up for your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleLoadBeneficiaries} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load Beneficiaries"
                )}
              </Button>

              {beneficiariesError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{beneficiariesError}</AlertDescription>
                </Alert>
              )}

              {beneficiaries.length > 0 && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by name, account number, bank code, or beneficiary ID..."
                      value={beneficiarySearchQuery}
                      onChange={(e) => setBeneficiarySearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {beneficiarySearchQuery && (
                    <p className="text-sm text-muted-foreground">
                      Showing {beneficiaries.filter((ben) => {
                        const query = beneficiarySearchQuery.toLowerCase()
                        return (
                          (ben.name || "").toLowerCase().includes(query) ||
                          (ben.bankAccountNumber || "").includes(query) ||
                          (ben.bankCode || "").includes(query) ||
                          (ben.beneficiaryId || "").toLowerCase().includes(query) ||
                          (ben.beneficiaryType || "").toLowerCase().includes(query)
                        )
                      }).length} of {beneficiaries.length} beneficiaries
                    </p>
                  )}

                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Beneficiary ID</th>
                            <th className="px-4 py-3 text-left font-medium">Name</th>
                            <th className="px-4 py-3 text-left font-medium">Account Number</th>
                            <th className="px-4 py-3 text-left font-medium">Bank Code</th>
                            <th className="px-4 py-3 text-left font-medium">Type</th>
                            <th className="px-4 py-3 text-left font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {beneficiaries
                            .filter((ben) => {
                              if (!beneficiarySearchQuery) return true
                              const query = beneficiarySearchQuery.toLowerCase()
                              return (
                                (ben.name || "").toLowerCase().includes(query) ||
                                (ben.bankAccountNumber || "").includes(query) ||
                                (ben.bankCode || "").includes(query) ||
                                (ben.beneficiaryId || "").toLowerCase().includes(query) ||
                                (ben.beneficiaryType || "").toLowerCase().includes(query)
                              )
                            })
                            .map((beneficiary) => (
                          <tr
                            key={beneficiary.beneficiaryId}
                            className="border-t hover:bg-muted/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-xs">
                              {beneficiary.beneficiaryId}
                            </td>
                            <td className="px-4 py-3 font-medium">{beneficiary.name}</td>
                            <td className="px-4 py-3">{beneficiary.bankAccountNumber}</td>
                            <td className="px-4 py-3">{beneficiary.bankCode}</td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-secondary px-2 py-1 text-xs">
                                {beneficiary.beneficiaryType || "Standard"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectBeneficiary(beneficiary.beneficiaryId)}
                              >
                                Select for Payment
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {beneficiaries.filter((ben) => {
                  if (!beneficiarySearchQuery) return false
                  const query = beneficiarySearchQuery.toLowerCase()
                  return (
                    (ben.name || "").toLowerCase().includes(query) ||
                    (ben.bankAccountNumber || "").includes(query) ||
                    (ben.bankCode || "").includes(query) ||
                    (ben.beneficiaryId || "").toLowerCase().includes(query) ||
                    (ben.beneficiaryType || "").toLowerCase().includes(query)
                  )
                }).length === 0 && beneficiarySearchQuery && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No matches found</AlertTitle>
                    <AlertDescription>
                      No beneficiaries match your search query "{beneficiarySearchQuery}".
                    </AlertDescription>
                  </Alert>
                )}
              </>
              )}

              {beneficiaries.length === 0 && !beneficiariesError && !loading && (
                <p className="text-sm text-muted-foreground">
                  No beneficiaries loaded. Click "Load Beneficiaries" to fetch them.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Danger Zone</AlertTitle>
            <AlertDescription>
              Payment execution will transfer real money. Maximum test amount: R
              {INVESTEC_MAX_TEST_PAYMENT_AMOUNT}. Only whitelisted accounts are allowed.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Payment Preview & Execution</CardTitle>
              <CardDescription>
                Build and preview payment payloads. Execute payments with confirmation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentAccountId">Source Account ID *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    id="paymentAccountId"
                    value={paymentInput.accountId || selectedAccountIds[0] || ""}
                    onChange={(e) =>
                      setPaymentInput((prev) => ({ ...prev, accountId: e.target.value }))
                    }
                  >
                    <option value="">-- Select an account --</option>
                    {accounts.map((acc, index) => (
                      <option
                        key={`${acc.accountId}-${acc.accountNumber}-${index}`}
                        value={acc.accountId}
                      >
                        {acc.accountName} ({acc.accountNumber})
                      </option>
                    ))}
                  </select>
                  {selectedAccountIds.length > 0 && !paymentInput.accountId && (
                    <p className="text-xs text-muted-foreground">
                      Using first selected account: {accounts.find((a) => a.accountId === selectedAccountIds[0])?.accountName || selectedAccountIds[0]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beneficiarySelect">Beneficiary *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    id="beneficiarySelect"
                    value={paymentInput.beneficiaryId}
                    onChange={(e) => {
                      const beneficiaryId = e.target.value
                      setPaymentInput((prev) => ({ ...prev, beneficiaryId }))
                      setSelectedBeneficiaryId(beneficiaryId)
                    }}
                  >
                    <option value="">-- Select a beneficiary --</option>
                    {beneficiaries.map((ben) => (
                      <option key={ben.beneficiaryId} value={ben.beneficiaryId}>
                        {ben.name} ({ben.bankAccountNumber})
                      </option>
                    ))}
                  </select>
                  {beneficiaries.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No beneficiaries loaded. Go to the Beneficiaries tab to load them.
                    </p>
                  )}
                  {selectedBeneficiaryId && (
                    <p className="text-xs text-green-600">
                      Beneficiary selected from Beneficiaries tab
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (ZAR) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={paymentInput.amount}
                    onChange={(e) =>
                      setPaymentInput((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="myReference">My Reference *</Label>
                  <Input
                    id="myReference"
                    value={paymentInput.myReference}
                    onChange={(e) =>
                      setPaymentInput((prev) => ({ ...prev, myReference: e.target.value }))
                    }
                    placeholder="Reference displayed on your transaction"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theirReference">Their Reference *</Label>
                  <Input
                    id="theirReference"
                    value={paymentInput.theirReference}
                    onChange={(e) =>
                      setPaymentInput((prev) => ({ ...prev, theirReference: e.target.value }))
                    }
                    placeholder="Reference displayed on recipient's statement"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date (Optional)</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentInput.paymentDate}
                    onChange={(e) =>
                      setPaymentInput((prev) => ({ ...prev, paymentDate: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handlePreviewPayment} disabled={loading} variant="outline">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Preview Payment Payload"
                  )}
                </Button>
              </div>

              {paymentPreview && (
                <div className="space-y-2">
                  <Label>Payment Payload Preview</Label>
                  <div className="rounded-md border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {paymentPreview.method} {paymentPreview.endpoint}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(formatJSON(paymentPreview), "preview")}
                      >
                        {copied === "preview" ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="max-h-60 overflow-auto rounded bg-muted p-2 text-xs">
                      {formatJSON(paymentPreview.payload)}
                    </pre>
                  </div>

                  {/* Execute Payment Section */}
                  <div className="space-y-2 rounded-md border border-destructive p-4">
                    <Label htmlFor="confirmation">Execute Payment (Dangerous)</Label>
                    <div className="space-y-2">
                      <Input
                        id="confirmation"
                        placeholder="Type 'CONFIRM' to execute"
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value)}
                      />
                      <Button
                        onClick={handleExecutePayment}
                        disabled={loading || confirmationCode !== "CONFIRM"}
                        variant="destructive"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          "Execute Payment"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {paymentResult && (
                <Alert variant={paymentResult.error ? "destructive" : "default"}>
                  {paymentResult.error ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <AlertTitle>{paymentResult.error ? "Error" : "Payment Executed"}</AlertTitle>
                  <AlertDescription>
                    {paymentResult.error ? (
                      paymentResult.error
                    ) : (
                      formatJSON(paymentResult)
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

