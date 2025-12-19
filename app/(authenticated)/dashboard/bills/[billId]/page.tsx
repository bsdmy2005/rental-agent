"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getBillWithRulesQuery } from "@/queries/bills-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BillExtractionResults } from "./_components/bill-extraction-results"
import { BillActions } from "../_components/bill-actions"
import { BillStatusPoller } from "./_components/bill-status-poller"

export default async function BillDetailPage({
  params
}: {
  params: Promise<{ billId: string }>
}) {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const { billId } = await params
  const billWithRules = await getBillWithRulesQuery(billId)

  if (!billWithRules) {
    notFound()
  }

  const property = await getPropertyByIdQuery(billWithRules.propertyId)

  // Check if same rule used for both purposes
  const sameRuleForBoth =
    billWithRules.invoiceRuleId &&
    billWithRules.paymentRuleId &&
    billWithRules.invoiceRuleId === billWithRules.paymentRuleId

  // Format billing period
  const formatBillingPeriod = () => {
    if (billWithRules.billingYear && billWithRules.billingMonth) {
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
      return `${monthNames[billWithRules.billingMonth - 1]} ${billWithRules.billingYear}`
    }
    return null
  }

  const billingPeriod = formatBillingPeriod()

  return (
    <BillStatusPoller billId={billWithRules.id} initialStatus={billWithRules.status}>
      <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/bills">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{billWithRules.fileName}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {billWithRules.billType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {billWithRules.source === "email" ? "Email" : "Manual Upload"}
              </Badge>
              {billingPeriod && (
                <Badge variant="outline" className="text-xs bg-primary/10">
                  {billingPeriod}
                </Badge>
              )}
              <Badge
                variant={
                  billWithRules.status === "processed"
                    ? "default"
                    : billWithRules.status === "error"
                      ? "destructive"
                      : "secondary"
                }
                className="text-xs"
              >
                {billWithRules.status}
              </Badge>
            </div>
          </div>
        </div>
        <BillActions billId={billWithRules.id} billName={billWithRules.fileName} />
      </div>

      {billWithRules.status === "processed" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Next Steps</CardTitle>
            <CardDescription>
              Review the extracted data below and take action
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {billWithRules.invoiceExtractionData && (
                <p className="text-muted-foreground">
                  • <strong>Invoice data extracted:</strong> Review tenant-chargeable items and
                  generate invoices for tenants
                </p>
              )}
              {billWithRules.paymentExtractionData && (
                <p className="text-muted-foreground">
                  • <strong>Payment data extracted:</strong> Review landlord-payable items and
                  create payment instructions
                </p>
              )}
              {!billWithRules.invoiceExtractionData && !billWithRules.paymentExtractionData && (
                <p className="text-muted-foreground">
                  • No data was extracted. Check if extraction rules are configured for this bill
                  type.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bill Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-muted-foreground text-xs">Property</p>
                <p className="font-medium">{property?.name || "Unknown Property"}</p>
                {property && (
                  <Link
                    href={`/dashboard/properties/${property.id}`}
                    className="text-primary hover:underline text-sm"
                  >
                    View Property →
                  </Link>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Billing Period</p>
                <p className="font-medium">
                  {billingPeriod || (
                    <span className="text-muted-foreground italic">Not set</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Uploaded</p>
                <p className="font-medium">
                  {new Date(billWithRules.createdAt).toLocaleDateString()}
                </p>
              </div>
              {billWithRules.emailId && (
                <div>
                  <p className="text-muted-foreground text-xs">Email ID</p>
                  <p className="font-medium text-sm">{billWithRules.emailId}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Extraction Rules Used</CardTitle>
              <CardDescription>
                Rules that were used to extract data from this bill
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sameRuleForBoth && billWithRules.invoiceRule ? (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Single Rule (Both Outputs)</p>
                  <div className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{billWithRules.invoiceRule.name}</p>
                        <p className="text-muted-foreground text-xs">
                          Extracts both invoice and payment data
                        </p>
                      </div>
                      <Link href={`/dashboard/rules/${billWithRules.invoiceRule.id}`}>
                        <Button variant="outline" size="sm">
                          View Rule
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {billWithRules.invoiceRule && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-2">Invoice Rule</p>
                      <div className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{billWithRules.invoiceRule.name}</p>
                            <p className="text-muted-foreground text-xs">
                              Extracts tenant-chargeable items
                            </p>
                          </div>
                          <Link href={`/dashboard/rules/${billWithRules.invoiceRule.id}`}>
                            <Button variant="outline" size="sm">
                              View Rule
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                  {billWithRules.paymentRule && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-2">Payment Rule</p>
                      <div className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{billWithRules.paymentRule.name}</p>
                            <p className="text-muted-foreground text-xs">
                              Extracts landlord-payable items
                            </p>
                          </div>
                          <Link href={`/dashboard/rules/${billWithRules.paymentRule.id}`}>
                            <Button variant="outline" size="sm">
                              View Rule
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {!billWithRules.invoiceRule && !billWithRules.paymentRule && (
                <p className="text-muted-foreground text-sm">
                  No extraction rules were used for this bill.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <BillExtractionResults bill={billWithRules} />
        </div>
      </div>
    </div>
    </BillStatusPoller>
  )
}

