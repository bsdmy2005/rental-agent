"use server"

import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getRentalInvoiceInstanceWithDetailsQuery } from "@/queries/rental-invoice-instances-queries"
import { InvoicePreview } from "./_components/invoice-preview"
import { InvoiceLineItemsEditor } from "./_components/invoice-line-items-editor"
import { InvoiceActions } from "./_components/invoice-actions"
import type { InvoiceData, BankingDetails } from "@/types"

export default async function RentalInvoiceDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const instance = await getRentalInvoiceInstanceWithDetailsQuery(id)

  if (!instance) {
    notFound()
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

  let invoiceData = instance.invoiceData as InvoiceData | null

  // Helper function to check if banking details exist
  function hasBankingDetails(bankingDetails?: BankingDetails | null): boolean {
    if (!bankingDetails) return false
    return !!(
      bankingDetails.bankName ||
      bankingDetails.accountHolderName ||
      bankingDetails.accountNumber ||
      bankingDetails.branchCode ||
      bankingDetails.swiftCode ||
      bankingDetails.referenceFormat
    )
  }

  // If invoiceData exists and banking details are missing, merge them from property
  // This handles cases where invoices were generated before banking details were added
  if (invoiceData && (!invoiceData.bankingDetails || !hasBankingDetails(invoiceData.bankingDetails))) {
    const bankingDetails: BankingDetails | null =
      instance.property.bankName ||
      instance.property.accountHolderName ||
      instance.property.accountNumber ||
      instance.property.branchCode ||
      instance.property.swiftCode ||
      instance.property.referenceFormat
        ? {
            bankName: instance.property.bankName || null,
            accountHolderName: instance.property.accountHolderName || null,
            accountNumber: instance.property.accountNumber || null,
            branchCode: instance.property.branchCode || null,
            swiftCode: instance.property.swiftCode || null,
            referenceFormat: instance.property.referenceFormat || null
          }
        : null

    if (bankingDetails) {
      invoiceData = {
        ...invoiceData,
        bankingDetails
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/rental-invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {invoiceData?.invoiceNumber || `Invoice ${id.substring(0, 8)}`}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {instance.property.name}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {formatPeriod(instance.periodYear, instance.periodMonth)}
              </Badge>
              <Badge
                variant={
                  instance.status === "sent"
                    ? "default"
                    : instance.status === "generated"
                      ? "secondary"
                      : "outline"
                }
                className="text-xs"
              >
                {instance.status.charAt(0).toUpperCase() + instance.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
        <InvoiceActions 
          instanceId={id} 
          status={instance.status}
          defaultPdfTemplate={(instance.template?.pdfTemplate as "classic" | "modern" | "minimal" | "professional" | "elegant" | "compact") || "classic"}
        />
      </div>

      {instance.status === "ready" && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-lg">Ready to Generate</CardTitle>
            <CardDescription>
              This invoice instance is ready. Generate the invoice data to proceed.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {instance.status === "generated" && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="text-lg">Invoice Generated</CardTitle>
            <CardDescription>
              Review and edit the invoice before sending it to the tenant.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {instance.status === "sent" && invoiceData?.sentAt && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-lg">Invoice Sent</CardTitle>
            <CardDescription>
              This invoice was sent on {new Date(invoiceData.sentAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-muted-foreground text-xs">Property</p>
                <p className="font-medium">{instance.property.name}</p>
                <Link
                  href={`/dashboard/properties/${instance.property.id}`}
                  className="text-primary hover:underline text-sm"
                >
                  View Property →
                </Link>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tenant</p>
                <p className="font-medium">{instance.tenant.name}</p>
                {instance.tenant.email && (
                  <p className="text-muted-foreground text-sm">{instance.tenant.email}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Period</p>
                <p className="font-medium">{formatPeriod(instance.periodYear, instance.periodMonth)}</p>
              </div>
              {invoiceData && (
                <>
                  <div>
                    <p className="text-muted-foreground text-xs">Due Date</p>
                    <p className="font-medium">
                      {new Date(invoiceData.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total Amount</p>
                    <p className="font-medium text-lg">
                      R {invoiceData.totalAmount.toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          {instance.status === "ready" ? (
            <Card>
              <CardHeader>
                <CardTitle>Generate Invoice</CardTitle>
                <CardDescription>
                  Generate invoice data from rental amount and contributing bills
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InvoiceActions 
                  instanceId={id} 
                  status={instance.status}
                  defaultPdfTemplate={(instance.template?.pdfTemplate as "classic" | "modern" | "minimal" | "professional" | "elegant" | "compact") || "classic"}
                />
              </CardContent>
            </Card>
          ) : invoiceData ? (
            <InvoicePreview 
              invoiceData={invoiceData} 
              instance={instance} 
              instanceId={id}
              canEdit={instance.status === "generated"}
            />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Invoice data not available
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

