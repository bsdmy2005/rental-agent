"use client"

import { useState } from "react"
import { type SelectBillingPeriod, type SelectPayableInstance, type SelectRentalInvoiceInstance, type SelectPayableTemplate, type SelectRentalInvoiceTemplate, type SelectTenant, type SelectPayableSchedule, type SelectBill } from "@/db/schema"
import { BillingScheduleTable } from "./billing-schedule-table"
import { type PeriodDependencyStatus } from "@/queries/period-dependency-status-queries"
import { PayablePeriodGeneratorWizard } from "./payable-period-generator-wizard"
import { InvoicePeriodGeneratorWizard } from "./invoice-period-generator-wizard"
import { BillMatchingDialog } from "./bill-matching-dialog"
import { UnmatchedBillsSection } from "./unmatched-bills-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, DollarSign, Filter, Calendar, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { deleteAllPeriodsByTypeAction } from "@/actions/billing-periods-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface BillingScheduleViewProps {
  propertyId: string
  propertyName: string
  invoicePeriods: SelectBillingPeriod[]
  payablePeriods: SelectBillingPeriod[]
  payableInstances?: SelectPayableInstance[]
  invoiceInstances?: SelectRentalInvoiceInstance[]
  payableTemplates?: SelectPayableTemplate[]
  invoiceTemplates?: SelectRentalInvoiceTemplate[]
  payableSchedules?: SelectPayableSchedule[]
  tenants?: SelectTenant[]
  dependencyStatuses?: Map<string, PeriodDependencyStatus>
  billsByPeriod?: Map<string, SelectBill[]>
  hideHeader?: boolean
}

export function BillingScheduleView({
  propertyId,
  propertyName,
  invoicePeriods,
  payablePeriods,
  payableInstances = [],
  invoiceInstances = [],
  payableTemplates = [],
  invoiceTemplates = [],
  payableSchedules = [],
  tenants = [],
  dependencyStatuses = new Map(),
  billsByPeriod = new Map(),
  hideHeader = false
}: BillingScheduleViewProps) {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState<"invoice" | "payable">("payable")
  const [dateFilter, setDateFilter] = useState<"all" | "current" | "future" | "past">("all")
  const [matchingDialogOpen, setMatchingDialogOpen] = useState(false)
  const [deletingInvoice, setDeletingInvoice] = useState(false)
  const [deletingPayable, setDeletingPayable] = useState(false)

  const handleDeleteAllInvoice = async () => {
    setDeletingInvoice(true)
    try {
      const result = await deleteAllPeriodsByTypeAction(propertyId, "invoice")
      if (result.isSuccess) {
        toast.success(`Deleted ${result.data} invoice periods`)
        router.refresh()
      } else {
        toast.error(result.message || "Failed to delete invoice periods")
      }
    } catch (error) {
      console.error("Error deleting invoice periods:", error)
      toast.error("Failed to delete invoice periods")
    } finally {
      setDeletingInvoice(false)
    }
  }

  const handleDeleteAllPayable = async () => {
    setDeletingPayable(true)
    try {
      const result = await deleteAllPeriodsByTypeAction(propertyId, "payable")
      if (result.isSuccess) {
        toast.success(`Deleted ${result.data} payable periods`)
        router.refresh()
      } else {
        toast.error(result.message || "Failed to delete payable periods")
      }
    } catch (error) {
      console.error("Error deleting payable periods:", error)
      toast.error("Failed to delete payable periods")
    } finally {
      setDeletingPayable(false)
    }
  }

  // Filter periods based on selected tab and date filter
  const filteredInvoicePeriods = invoicePeriods.filter((period) => {
    if (dateFilter === "all") return true
    const now = new Date()
    const periodStart = new Date(period.periodStartDate)
    const periodEnd = new Date(period.periodEndDate)

    if (dateFilter === "current") {
      return periodStart <= now && periodEnd >= now
    } else if (dateFilter === "future") {
      return periodStart > now
    } else {
      // past
      return periodEnd < now
    }
  })

  const filteredPayablePeriods = payablePeriods.filter((period) => {
    if (dateFilter === "all") return true
    const now = new Date()
    const periodStart = new Date(period.periodStartDate)
    const periodEnd = new Date(period.periodEndDate)

    if (dateFilter === "current") {
      return periodStart <= now && periodEnd >= now
    } else if (dateFilter === "future") {
      return periodStart > now
    } else {
      // past
      return periodEnd < now
    }
  })

  // No need for displayPeriods anymore - we show separate tables per tab

  return (
    <div className="flex flex-col gap-6">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Billing Schedule</h1>
            <p className="text-muted-foreground mt-2">
              View and manage billing periods for {propertyName}
            </p>
          </div>
          <Button onClick={() => setMatchingDialogOpen(true)} variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Match Bills
          </Button>
        </div>
      )}

      {hideHeader && (
        <div className="flex items-center justify-end">
          <Button onClick={() => setMatchingDialogOpen(true)} variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Match Bills
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Billing Periods</CardTitle>
              <CardDescription>
                Invoice periods are aligned to lease dates. Payable periods are independent.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="future">Future</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Filter Buttons and Delete Actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={selectedTab === "invoice" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTab("invoice")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Invoice ({invoicePeriods.length})
                </Button>
                <Button
                  variant={selectedTab === "payable" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTab("payable")}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Payable ({payablePeriods.length})
                </Button>
              </div>

              {/* Delete All Buttons */}
              {selectedTab === "invoice" && invoicePeriods.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deletingInvoice}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All Invoice Periods
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Invoice Periods?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {invoicePeriods.length} invoice periods for this property.
                        This action cannot be undone. Bills matched to these periods will be unmatched.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAllInvoice}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deletingInvoice ? "Deleting..." : "Delete All"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {selectedTab === "payable" && payablePeriods.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deletingPayable}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All Payable Periods
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Payable Periods?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {payablePeriods.length} payable periods for this property.
                        This action cannot be undone. Bills matched to these periods will be unmatched.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAllPayable}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deletingPayable ? "Deleting..." : "Delete All"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Payable Period Generator (only show in payable tab) */}
            {selectedTab === "payable" && (
              <div className="mb-6">
                <PayablePeriodGeneratorWizard
                  propertyId={propertyId}
                  payableTemplates={payableTemplates}
                  payableSchedules={payableSchedules}
                />
              </div>
            )}

            {/* Invoice Period Generator (only show in invoice tab) */}
            {selectedTab === "invoice" && (
              <div className="mb-6">
                <InvoicePeriodGeneratorWizard
                  propertyId={propertyId}
                  invoiceTemplates={invoiceTemplates}
                  tenants={tenants}
                />
              </div>
            )}

            {/* Periods Table */}
            <div>
              {selectedTab === "invoice" && (
                <>
                  {filteredInvoicePeriods.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No invoice periods found</p>
                      <p className="text-sm mt-2">
                        Upload a lease agreement for a tenant to generate invoice periods
                      </p>
                    </div>
                  ) : (
                    <BillingScheduleTable
                      propertyId={propertyId}
                      periods={filteredInvoicePeriods}
                      periodType="invoice"
                      invoiceInstances={invoiceInstances}
                      invoiceTemplates={invoiceTemplates}
                      tenants={tenants}
                      dependencyStatuses={dependencyStatuses}
                      billsByPeriod={billsByPeriod}
                    />
                  )}
                </>
              )}

              {selectedTab === "payable" && (
                <>
                  {filteredPayablePeriods.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No payable periods found</p>
                      <p className="text-sm mt-2">Generate payable periods manually or wait for cron job</p>
                    </div>
                  ) : (
                    <BillingScheduleTable
                      propertyId={propertyId}
                      periods={filteredPayablePeriods}
                      periodType="payable"
                      payableInstances={payableInstances}
                      payableTemplates={payableTemplates}
                      dependencyStatuses={dependencyStatuses}
                      billsByPeriod={billsByPeriod}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <BillMatchingDialog
        propertyId={propertyId}
        open={matchingDialogOpen}
        onOpenChange={setMatchingDialogOpen}
      />

      {/* Unmatched Bills Section */}
      <UnmatchedBillsSection propertyId={propertyId} />
    </div>
  )
}

