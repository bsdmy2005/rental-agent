"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Calendar, Loader2 } from "lucide-react"
import { type SelectBill } from "@/db/schema"

interface BillExtractedDataDialogProps {
  billId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BillExtractedDataDialog({
  billId,
  open,
  onOpenChange
}: BillExtractedDataDialogProps) {
  const [bill, setBill] = useState<SelectBill | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && billId) {
      loadBill()
    } else {
      setBill(null)
    }
  }, [open, billId])

  const loadBill = async () => {
    if (!billId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/bills/${billId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.bill) {
          setBill(data.bill)
        }
      }
    } catch (error) {
      console.error("Error loading bill:", error)
    } finally {
      setLoading(false)
    }
  }

  const getBillTypeColor = (billType: string) => {
    switch (billType) {
      case "municipality":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "levy":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "utility":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "—"
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR"
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bill Extracted Data</DialogTitle>
          <DialogDescription>
            View extracted data from the bill document
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading bill data...</p>
          </div>
        ) : bill ? (
          <div className="space-y-4">
            {/* Bill Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Bill Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">File Name:</span>
                  <span className="text-sm">{bill.fileName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Bill Type:</span>
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${getBillTypeColor(bill.billType)}`}
                  >
                    {bill.billType}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge
                    variant={
                      bill.status === "processed"
                        ? "default"
                        : bill.status === "processing"
                        ? "secondary"
                        : bill.status === "error"
                        ? "destructive"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {bill.status}
                  </Badge>
                </div>
                {bill.billingYear && bill.billingMonth && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Extracted Period:</span>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {new Date(bill.billingYear, bill.billingMonth - 1, 1).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Extraction Data */}
            {bill.invoiceExtractionData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Invoice Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {bill.invoiceExtractionData.invoiceNumber && (
                      <div>
                        <span className="font-medium">Invoice Number:</span>
                        <p className="text-muted-foreground">{bill.invoiceExtractionData.invoiceNumber}</p>
                      </div>
                    )}
                    {bill.invoiceExtractionData.amount !== null && bill.invoiceExtractionData.amount !== undefined && (
                      <div>
                        <span className="font-medium">Amount:</span>
                        <p className="text-muted-foreground">{formatCurrency(bill.invoiceExtractionData.amount)}</p>
                      </div>
                    )}
                    {bill.invoiceExtractionData.dueDate && (
                      <div>
                        <span className="font-medium">Due Date:</span>
                        <p className="text-muted-foreground">{formatDate(bill.invoiceExtractionData.dueDate)}</p>
                      </div>
                    )}
                    {bill.invoiceExtractionData.period && (
                      <div>
                        <span className="font-medium">Period:</span>
                        <p className="text-muted-foreground">{bill.invoiceExtractionData.period}</p>
                      </div>
                    )}
                    {bill.invoiceExtractionData.periodStart && (
                      <div>
                        <span className="font-medium">Period Start:</span>
                        <p className="text-muted-foreground">{formatDate(bill.invoiceExtractionData.periodStart)}</p>
                      </div>
                    )}
                    {bill.invoiceExtractionData.periodEnd && (
                      <div>
                        <span className="font-medium">Period End:</span>
                        <p className="text-muted-foreground">{formatDate(bill.invoiceExtractionData.periodEnd)}</p>
                      </div>
                    )}
                    {bill.invoiceExtractionData.accountNumber && (
                      <div>
                        <span className="font-medium">Account Number:</span>
                        <p className="text-muted-foreground">{bill.invoiceExtractionData.accountNumber}</p>
                      </div>
                    )}
                    {bill.invoiceExtractionData.reference && (
                      <div>
                        <span className="font-medium">Reference:</span>
                        <p className="text-muted-foreground">{bill.invoiceExtractionData.reference}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Extraction Data */}
            {bill.paymentExtractionData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {bill.paymentExtractionData.amount !== null && bill.paymentExtractionData.amount !== undefined && (
                      <div>
                        <span className="font-medium">Amount:</span>
                        <p className="text-muted-foreground">{formatCurrency(bill.paymentExtractionData.amount)}</p>
                      </div>
                    )}
                    {bill.paymentExtractionData.dueDate && (
                      <div>
                        <span className="font-medium">Due Date:</span>
                        <p className="text-muted-foreground">{formatDate(bill.paymentExtractionData.dueDate)}</p>
                      </div>
                    )}
                    {bill.paymentExtractionData.period && (
                      <div>
                        <span className="font-medium">Period:</span>
                        <p className="text-muted-foreground">{bill.paymentExtractionData.period}</p>
                      </div>
                    )}
                    {bill.paymentExtractionData.periodStart && (
                      <div>
                        <span className="font-medium">Period Start:</span>
                        <p className="text-muted-foreground">{formatDate(bill.paymentExtractionData.periodStart)}</p>
                      </div>
                    )}
                    {bill.paymentExtractionData.periodEnd && (
                      <div>
                        <span className="font-medium">Period End:</span>
                        <p className="text-muted-foreground">{formatDate(bill.paymentExtractionData.periodEnd)}</p>
                      </div>
                    )}
                    {bill.paymentExtractionData.accountNumber && (
                      <div>
                        <span className="font-medium">Account Number:</span>
                        <p className="text-muted-foreground">{bill.paymentExtractionData.accountNumber}</p>
                      </div>
                    )}
                    {bill.paymentExtractionData.reference && (
                      <div>
                        <span className="font-medium">Reference:</span>
                        <p className="text-muted-foreground">{bill.paymentExtractionData.reference}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!bill.invoiceExtractionData && !bill.paymentExtractionData && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No extracted data available for this bill.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Bill not found.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

