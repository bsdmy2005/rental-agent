"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle } from "lucide-react"
import type { BillWithRules } from "@/queries/bills-queries"

interface BillExtractionResultsProps {
  bill: BillWithRules
}

export function BillExtractionResults({ bill }: BillExtractionResultsProps) {
  const hasInvoiceData = bill.invoiceExtractionData !== null
  const hasPaymentData = bill.paymentExtractionData !== null

  return (
    <div className="space-y-4">
      {hasInvoiceData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invoice Extraction Data</CardTitle>
                <CardDescription>Tenant-chargeable items extracted from bill</CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Extracted
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(bill.invoiceExtractionData, null, 2)}
            </pre>
            {bill.invoiceRule && (
              <p className="text-muted-foreground mt-2 text-xs">
                Extracted using rule: <span className="font-medium">{bill.invoiceRule.name}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {hasPaymentData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Extraction Data</CardTitle>
                <CardDescription>Landlord-payable items extracted from bill</CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-50">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Extracted
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(bill.paymentExtractionData, null, 2)}
            </pre>
            {bill.paymentRule && (
              <p className="text-muted-foreground mt-2 text-xs">
                Extracted using rule: <span className="font-medium">{bill.paymentRule.name}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!hasInvoiceData && !hasPaymentData && (
        <Card>
          <CardHeader>
            <CardTitle>Extraction Results</CardTitle>
            <CardDescription>No extraction data available</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4" />
              <p className="text-sm">
                {bill.status === "pending" || bill.status === "processing"
                  ? "Bill is still being processed..."
                  : "No data was extracted from this bill."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

