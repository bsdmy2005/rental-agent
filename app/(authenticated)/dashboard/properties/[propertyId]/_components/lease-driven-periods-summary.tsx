"use server"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, CheckCircle2, AlertCircle } from "lucide-react"
import { getTenantsByPropertyIdQuery } from "@/queries/tenants-queries"
import { getLeaseAgreementByTenantIdQuery } from "@/queries/lease-agreements-queries"
import { getBillingPeriodsByLeaseAgreementIdQuery } from "@/queries/billing-periods-queries"
import { getPeriodsForPropertyAction } from "@/actions/billing-periods-actions"

interface LeaseDrivenPeriodsSummaryProps {
  propertyId: string
}

export async function LeaseDrivenPeriodsSummary({ propertyId }: LeaseDrivenPeriodsSummaryProps) {
  // Get all tenants for this property
  const tenants = await getTenantsByPropertyIdQuery(propertyId)

  // Get periods summary
  const invoicePeriodsResult = await getPeriodsForPropertyAction(propertyId, "invoice")
  const payablePeriodsResult = await getPeriodsForPropertyAction(propertyId, "payable")

  const invoicePeriods = invoicePeriodsResult.isSuccess ? invoicePeriodsResult.data : []
  const payablePeriods = payablePeriodsResult.isSuccess ? payablePeriodsResult.data : []

  // Get lease information for each tenant
  const tenantsWithLeases = await Promise.all(
    tenants.map(async (tenant) => {
      const lease = await getLeaseAgreementByTenantIdQuery(tenant.id)
      let periodCount = 0
      if (lease) {
        const periods = await getBillingPeriodsByLeaseAgreementIdQuery(lease.id)
        periodCount = periods.length
      }
      return {
        tenant,
        lease,
        periodCount
      }
    })
  )

  const tenantsWithLeasesCount = tenantsWithLeases.filter((t) => t.lease).length
  const totalInvoicePeriods = invoicePeriods.length
  const totalPayablePeriods = payablePeriods.length

  if (tenants.length === 0 && totalInvoicePeriods === 0 && totalPayablePeriods === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lease-Driven Billing Periods</CardTitle>
            <CardDescription>
              Invoice periods are automatically generated when lease agreements are uploaded. Payable periods can be generated manually.
            </CardDescription>
          </div>
          <Link href={`/dashboard/properties/${propertyId}/billing-schedule`}>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              View Schedule
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Invoice Periods</span>
              </div>
              <div className="text-2xl font-bold">{totalInvoicePeriods}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Generated from {tenantsWithLeasesCount} lease{tenantsWithLeasesCount !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Payable Periods</span>
              </div>
              <div className="text-2xl font-bold">{totalPayablePeriods}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Manually generated or via cron
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Tenants with Leases</span>
              </div>
              <div className="text-2xl font-bold">{tenantsWithLeasesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Out of {tenants.length} total tenant{tenants.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Tenants with Leases */}
          {tenantsWithLeases.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Tenants & Lease Status</h4>
              <div className="space-y-2">
                {tenantsWithLeases.map(({ tenant, lease, periodCount }) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-sm">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.email || tenant.idNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lease ? (
                        <>
                          <Badge variant="default" className="text-xs">
                            <FileText className="mr-1 h-3 w-3" />
                            Lease Uploaded
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {periodCount} Period{periodCount !== 1 ? "s" : ""}
                          </Badge>
                          {lease.effectiveStartDate && lease.effectiveEndDate && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(lease.effectiveStartDate).toLocaleDateString()} -{" "}
                              {new Date(lease.effectiveEndDate).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          No Lease
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  How It Works
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  When you upload a lease agreement for a tenant, invoice periods are automatically generated
                  for the entire lease duration. Payable periods are independent and can be generated manually
                  or automatically via cron job (24-month rolling window).
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

