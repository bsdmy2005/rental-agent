"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PaymentExecutionDialog } from "../../_components/payment-execution-dialog"
import { getPaymentInstructionByPropertyAction } from "@/actions/payment-instructions-actions"
import { listPaymentsForPayableAction } from "@/actions/payments-actions"
import { type PayableInstanceWithDetails } from "@/queries/payable-instances-queries"
import { type SelectPayment } from "@/db/schema"
import { CreditCard, Calendar, Building2, FileText, DollarSign, AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import Link from "next/link"
import { diagnosePayableInstanceAction, refreshPayableInstanceDataAction } from "@/actions/payable-instances-actions"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface PaymentDetailViewProps {
  payable: PayableInstanceWithDetails
}

export function PaymentDetailView({ payable }: PaymentDetailViewProps) {
  const [paymentInstructionId, setPaymentInstructionId] = useState<string | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<SelectPayment[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [diagnosticDialogOpen, setDiagnosticDialogOpen] = useState(false)
  const [diagnosticData, setDiagnosticData] = useState<any>(null)
  const [loadingDiagnostic, setLoadingDiagnostic] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadPaymentInstruction()
    loadPaymentHistory()
  }, [payable])

  const loadPaymentInstruction = async () => {
    const result = await getPaymentInstructionByPropertyAction(payable.propertyId)
    if (result.isSuccess && result.data) {
      setPaymentInstructionId(result.data.id)
    }
  }

  const loadPaymentHistory = async () => {
    setLoadingHistory(true)
    try {
      const result = await listPaymentsForPayableAction(payable.id)
      if (result.isSuccess && result.data) {
        setPaymentHistory(result.data)
      }
    } catch (error) {
      console.error("Error loading payment history:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const formatCurrency = (amount: number | string, currency: string = "ZAR") => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency
    }).format(numAmount)
  }

  const formatPeriod = (year: number, month: number) => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ]
    return `${monthNames[month - 1]} ${year}`
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge variant="default" className="bg-green-600">Ready</Badge>
      case "paid":
        return <Badge variant="default" className="bg-blue-600">Paid</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "processing":
        return <Badge variant="secondary">Processing</Badge>
      case "completed":
        return <Badge variant="default" className="bg-green-600">Completed</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const canExecutePayment =
    payable.status === "ready" &&
    payable.templateBankAccountId !== null &&
    payable.templateBeneficiaryId !== null &&
    paymentInstructionId !== null

  const handleDiagnose = async () => {
    setLoadingDiagnostic(true)
    setDiagnosticDialogOpen(true)
    try {
      const result = await diagnosePayableInstanceAction(payable.id)
      if (result.isSuccess && result.data) {
        setDiagnosticData(result.data)
      } else {
        toast.error(result.message || "Failed to diagnose payable instance")
      }
    } catch (error) {
      toast.error("Failed to diagnose payable instance")
      console.error("Error diagnosing:", error)
    } finally {
      setLoadingDiagnostic(false)
    }
  }

  const handleRefreshInstance = async () => {
    setRefreshing(true)
    try {
      const result = await refreshPayableInstanceDataAction(payable.id)
      if (result.isSuccess) {
        toast.success("Payable instance refreshed successfully")
        window.location.reload()
      } else {
        toast.error(result.message || "Failed to refresh")
      }
    } catch (error) {
      toast.error("Failed to refresh payable instance")
      console.error("Error refreshing:", error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Payable Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payable Information</CardTitle>
          <CardDescription>Details about this payable instance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Property</p>
              <p className="text-base font-medium">{payable.propertyName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Template</p>
              <p className="text-base font-medium">{payable.templateName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Period</p>
              <p className="text-base">{formatPeriod(payable.periodYear, payable.periodMonth)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(payable.status)}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-base font-semibold text-lg">
                {formatCurrency(payable.amount, payable.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scheduled Date</p>
              <p className="text-base">{formatDate(payable.scheduledDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Configuration</CardTitle>
          <CardDescription>Bank account and beneficiary setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bank Account</p>
              <p className="text-base">
                {payable.bankAccountName || (
                  <span className="text-muted-foreground">Not configured</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Beneficiary</p>
              <p className="text-base">
                {payable.beneficiaryName || (
                  <span className="text-muted-foreground">Not configured</span>
                )}
              </p>
            </div>
          </div>
          {(!payable.bankAccountName || !payable.beneficiaryName) && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Payment cannot be executed until bank account and beneficiary are linked.{" "}
                <Link
                  href={`/dashboard/properties/${payable.propertyId}`}
                  className="underline"
                >
                  Configure payment settings
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {canExecutePayment && (
            <Button onClick={() => setPaymentDialogOpen(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Execute Payment
            </Button>
          )}
          <Button variant="outline" onClick={handleDiagnose}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Diagnose
          </Button>
          <Button variant="outline" onClick={handleRefreshInstance} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>All payment attempts for this payable</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground">Loading payment history...</p>
          ) : paymentHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment attempts yet.</p>
          ) : (
            <div className="space-y-4">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="rounded-md border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(payment.status)}
                      <span className="text-sm font-medium">
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(payment.executedAt)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">My Reference</p>
                      <p>{payment.myReference}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Their Reference</p>
                      <p>{payment.theirReference}</p>
                    </div>
                    {payment.investecTransactionId && (
                      <div>
                        <p className="text-muted-foreground">Transaction ID</p>
                        <p className="font-mono text-xs">{payment.investecTransactionId}</p>
                      </div>
                    )}
                    {payment.errorMessage && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Error</p>
                        <p className="text-destructive text-sm">{payment.errorMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Execution Dialog */}
      {paymentDialogOpen && paymentInstructionId && (
        <PaymentExecutionDialog
          payable={payable}
          paymentInstructionId={paymentInstructionId}
          open={paymentDialogOpen}
          onOpenChange={(open) => {
            setPaymentDialogOpen(open)
            if (!open) {
              loadPaymentHistory()
            }
          }}
        />
      )}

      {/* Diagnostic Dialog */}
      <Dialog open={diagnosticDialogOpen} onOpenChange={setDiagnosticDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payable Instance Diagnosis</DialogTitle>
            <DialogDescription>
              Detailed analysis of bill linkage and payment data
            </DialogDescription>
          </DialogHeader>

          {loadingDiagnostic ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Analyzing...</span>
            </div>
          ) : diagnosticData ? (
            <div className="space-y-4">
              <Alert>
                <AlertTitle>Recommended Action</AlertTitle>
                <AlertDescription>{diagnosticData.recommendedAction}</AlertDescription>
              </Alert>

              <div>
                <h3 className="font-semibold mb-2">Stored Contributing Bill IDs</h3>
                <div className="space-y-2">
                  {diagnosticData.contributingBillIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bills stored</p>
                  ) : (
                    diagnosticData.billsFound.map((bill: any, idx: number) => (
                      <div key={idx} className="border rounded p-2 text-sm">
                        <div className="font-medium">Bill ID: {bill.id}</div>
                        <div className="text-muted-foreground">
                          {bill.exists ? (
                            <>
                              <span className={bill.hasPaymentData ? "text-green-600" : "text-yellow-600"}>
                                {bill.hasPaymentData ? "✓ Has payment data" : "⚠ No payment data"}
                              </span>
                              <span className="ml-2">Status: {bill.status}</span>
                              {bill.billingYear && (
                                <span className="ml-2">
                                  Period: {bill.billingYear}-{bill.billingMonth}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-red-600">✗ Bill not found in database</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {diagnosticData.reDiscoveredBills.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">
                    Re-discovered Bills ({diagnosticData.reDiscoveredBills.length})
                  </h3>
                  <div className="space-y-2">
                    {diagnosticData.reDiscoveredBills.map((bill: any, idx: number) => (
                      <div key={idx} className="border rounded p-2 text-sm">
                        <div className="font-medium">Bill ID: {bill.id}</div>
                        <div className="text-muted-foreground">
                          <span className={bill.hasPaymentData ? "text-green-600" : "text-yellow-600"}>
                            {bill.hasPaymentData ? "✓ Has payment data" : "⚠ No payment data"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Current Payable Data</h3>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(diagnosticData.instance.payableData || null, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDiagnosticDialogOpen(false)}>
              Close
            </Button>
            {diagnosticData?.reDiscoveredBills.length > 0 && (
              <Button onClick={handleRefreshInstance} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh & Re-link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

