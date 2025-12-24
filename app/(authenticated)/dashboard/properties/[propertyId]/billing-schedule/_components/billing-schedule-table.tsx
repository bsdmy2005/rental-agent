"use client"

import { useState, useMemo, useEffect } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { type SelectBillingPeriod, type SelectPayableInstance, type SelectRentalInvoiceInstance, type SelectPayableTemplate, type SelectRentalInvoiceTemplate, type SelectTenant, type SelectBill } from "@/db/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, DollarSign, Calendar, Edit2, Save, X, CheckCircle2, AlertCircle, XCircle, Info, ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { updateBillingPeriodAction } from "@/actions/billing-periods-actions"
import { unmatchBillFromPeriodAction } from "@/actions/period-bill-matches-actions"
import { createInvoiceInstanceFromPeriodAction } from "@/actions/rental-invoice-instances-actions"
import { toast } from "sonner"
import { type PeriodDependencyStatus } from "@/queries/period-dependency-status-queries"
import { ManualPeriodMatcherDialog } from "./manual-period-matcher-dialog"
import { BillExtractedDataDialog } from "./bill-extracted-data-dialog"
import Link from "next/link"
// Format date helper
function formatDate(date: Date, formatStr: string): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  
  if (formatStr === "yyyy-MM-dd") {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  if (formatStr === "MMM dd, yyyy") {
    return `${monthNames[month - 1]} ${String(day).padStart(2, "0")}, ${year}`
  }
  
  return d.toLocaleDateString()
}

interface BillingScheduleTableProps {
  propertyId: string
  periods: SelectBillingPeriod[]
  periodType: "invoice" | "payable"
  payableInstances?: SelectPayableInstance[]
  invoiceInstances?: SelectRentalInvoiceInstance[]
  payableTemplates?: SelectPayableTemplate[]
  invoiceTemplates?: SelectRentalInvoiceTemplate[]
  tenants?: SelectTenant[]
  dependencyStatuses?: Map<string, PeriodDependencyStatus>
  billsByPeriod?: Map<string, SelectBill[]>
}

export function BillingScheduleTable({
  propertyId,
  periods,
  periodType,
  payableInstances = [],
  invoiceInstances = [],
  payableTemplates = [],
  invoiceTemplates = [],
  tenants = [],
  dependencyStatuses = new Map(),
  billsByPeriod = new Map()
}: BillingScheduleTableProps) {
  const router = useRouter()
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null)
  const [editedDates, setEditedDates] = useState<{
    startDate: string
    endDate: string
    scheduledGenerationDay?: number
    scheduledPaymentDay?: number
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set())
  const [expandedMonthGroups, setExpandedMonthGroups] = useState<Set<string>>(new Set())

  // Expand all month groups by default when periods change
  useEffect(() => {
    if (periods.length > 0 && expandedMonthGroups.size === 0) {
      const groups = new Set<string>()
      periods.forEach((period) => {
        const key = `${period.periodYear}-${period.periodMonth}`
        groups.add(key)
      })
      setExpandedMonthGroups(groups)
    }
  }, [periods, expandedMonthGroups.size])
  const [billToMatchMore, setBillToMatchMore] = useState<string | null>(null)
  const [matchMoreDialogOpen, setMatchMoreDialogOpen] = useState(false)
  const [billToView, setBillToView] = useState<string | null>(null)
  const [viewBillDialogOpen, setViewBillDialogOpen] = useState(false)
  const [creatingInvoiceInstance, setCreatingInvoiceInstance] = useState<string | null>(null)

  // Create maps for quick lookup
  const payableTemplateMap = new Map(payableTemplates.map((t) => [t.id, t]))
  const invoiceTemplateMap = new Map(invoiceTemplates.map((t) => [t.id, t]))
  const tenantMap = new Map(tenants.map((t) => [t.id, t]))
  
  // Create map for payable instances by period
  const payableInstanceMap = new Map<string, SelectPayableInstance>()
  if (periodType === "payable") {
    payableInstances.forEach((instance) => {
      const key = `${instance.payableTemplateId}-${instance.periodYear}-${instance.periodMonth}`
      payableInstanceMap.set(key, instance)
    })
  }
  
  // Create map for invoice instances by period
  const invoiceInstanceMap = new Map<string, SelectRentalInvoiceInstance>()
  if (periodType === "invoice") {
    invoiceInstances.forEach((instance) => {
      const key = `${instance.rentalInvoiceTemplateId}-${instance.periodYear}-${instance.periodMonth}`
      invoiceInstanceMap.set(key, instance)
    })
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const handleEdit = (period: SelectBillingPeriod) => {
    setEditingPeriod(period.id)
    setEditedDates({
      startDate: formatDate(new Date(period.periodStartDate), "yyyy-MM-dd"),
      endDate: formatDate(new Date(period.periodEndDate), "yyyy-MM-dd"),
      scheduledGenerationDay: period.scheduledGenerationDay || undefined,
      scheduledPaymentDay: period.scheduledPaymentDay || undefined
    })
  }

  const handleCancel = () => {
    setEditingPeriod(null)
    setEditedDates(null)
  }

  const handleSave = async (period: SelectBillingPeriod) => {
    if (!editedDates) return

    setSaving(true)
    try {
      const startDate = new Date(editedDates.startDate)
      const endDate = new Date(editedDates.endDate)

      if (endDate < startDate) {
        toast.error("End date must be after start date")
        return
      }

      // Validate scheduled days if provided
      if (
        periodType === "invoice" &&
        editedDates.scheduledGenerationDay !== undefined &&
        (editedDates.scheduledGenerationDay < 1 || editedDates.scheduledGenerationDay > 31)
      ) {
        toast.error("Generation day must be between 1 and 31")
        return
      }
      if (
        periodType === "payable" &&
        editedDates.scheduledPaymentDay !== undefined &&
        (editedDates.scheduledPaymentDay < 1 || editedDates.scheduledPaymentDay > 31)
      ) {
        toast.error("Payment day must be between 1 and 31")
        return
      }

      const updateData: {
        periodStartDate: Date
        periodEndDate: Date
        periodYear: number
        periodMonth: number
        scheduledGenerationDay?: number | null
        scheduledPaymentDay?: number | null
      } = {
        periodStartDate: startDate,
        periodEndDate: endDate,
        periodYear: startDate.getFullYear(),
        periodMonth: startDate.getMonth() + 1
      }

      // Add scheduled day if editing invoice or payable period
      if (periodType === "invoice") {
        updateData.scheduledGenerationDay =
          editedDates.scheduledGenerationDay !== undefined && editedDates.scheduledGenerationDay !== null
            ? editedDates.scheduledGenerationDay
            : null
      }
      if (periodType === "payable") {
        updateData.scheduledPaymentDay =
          editedDates.scheduledPaymentDay !== undefined && editedDates.scheduledPaymentDay !== null
            ? editedDates.scheduledPaymentDay
            : null
      }

      const result = await updateBillingPeriodAction(period.id, updateData)

      if (result.isSuccess) {
        toast.success("Period updated successfully")
        setEditingPeriod(null)
        setEditedDates(null)
        // Refresh server components without losing client-side state
        router.refresh()
      } else {
        toast.error(result.message || "Failed to update period")
      }
    } catch (error) {
      console.error("Error updating period:", error)
      toast.error("Failed to update period")
    } finally {
      setSaving(false)
    }
  }

  // Sort periods by year and month
  const sortedPeriods = [...periods].sort((a, b) => {
    if (a.periodYear !== b.periodYear) {
      return a.periodYear - b.periodYear
    }
    return a.periodMonth - b.periodMonth
  })

  // Group periods by year-month
  const periodsByMonth = useMemo(() => {
    const groups = new Map<string, SelectBillingPeriod[]>()
    sortedPeriods.forEach((period) => {
      const key = `${period.periodYear}-${period.periodMonth}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(period)
    })
    return groups
  }, [sortedPeriods])

  // Get sorted month keys
  const monthKeys = useMemo(() => {
    return Array.from(periodsByMonth.keys()).sort((a, b) => {
      const [yearA, monthA] = a.split("-").map(Number)
      const [yearB, monthB] = b.split("-").map(Number)
      if (yearA !== yearB) {
        return yearA - yearB
      }
      return monthA - monthB
    })
  }, [periodsByMonth])

  const toggleMonthGroupExpansion = (monthKey: string) => {
    setExpandedMonthGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey)
      } else {
        newSet.add(monthKey)
      }
      return newSet
    })
  }

  // Helper to get bill type badge color
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

  const togglePeriodExpansion = (periodId: string) => {
    setExpandedPeriods((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(periodId)) {
        newSet.delete(periodId)
      } else {
        newSet.add(periodId)
      }
      return newSet
    })
  }

  const handleUnmatchBill = async (billId: string, periodId: string) => {
    try {
      const result = await unmatchBillFromPeriodAction(billId, periodId)
      if (result.isSuccess) {
        toast.success("Bill unmatched from period")
        router.refresh()
      } else {
        toast.error(result.message || "Failed to unmatch bill")
      }
    } catch (error) {
      console.error("Error unmatching bill:", error)
      toast.error("Failed to unmatch bill")
    }
  }

  // Helper to render dependency status badge
  const renderDependencyStatus = (
    status: PeriodDependencyStatus | undefined,
    period?: SelectBillingPeriod
  ) => {
    // For payable periods, check if payable instance exists and its status
    if (periodType === "payable" && period) {
      const payableTemplate = period.payableTemplateId
        ? payableTemplateMap.get(period.payableTemplateId)
        : null
      
      if (payableTemplate) {
        const instanceKey = `${payableTemplate.id}-${period.periodYear}-${period.periodMonth}`
        const payableInstance = payableInstanceMap.get(instanceKey)
        
        if (payableInstance) {
          // Payable exists - show status based on payable instance status
          if (payableInstance.status === "paid") {
            return (
              <Badge className="bg-blue-600 text-white text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Paid
              </Badge>
            )
          }
          
          if (payableInstance.status === "generated") {
            return (
              <Badge className="bg-purple-600 text-white text-xs">
                <FileText className="mr-1 h-3 w-3" />
                Generated
              </Badge>
            )
          }
          
          if (payableInstance.status === "ready") {
            return (
              <Badge className="bg-green-700 text-white text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Ready to Process
              </Badge>
            )
          }
          
          if (payableInstance.status === "pending") {
            return (
              <Badge variant="secondary" className="text-xs">
                <Info className="mr-1 h-3 w-3" />
                Pending
              </Badge>
            )
          }
        }
      }
    }

    // For invoice periods, check if invoice instance exists and its status
    if (periodType === "invoice" && period) {
      const invoiceTemplate = period.rentalInvoiceTemplateId
        ? invoiceTemplateMap.get(period.rentalInvoiceTemplateId)
        : null
      
      if (invoiceTemplate) {
        const instanceKey = `${invoiceTemplate.id}-${period.periodYear}-${period.periodMonth}`
        const invoiceInstance = invoiceInstanceMap.get(instanceKey)
        
        if (invoiceInstance) {
          // Invoice exists - show status based on invoice instance status
          if (invoiceInstance.status === "sent") {
            return (
              <Badge className="bg-blue-600 text-white text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Sent
              </Badge>
            )
          }
          
          if (invoiceInstance.status === "generated") {
            return (
              <Badge className="bg-purple-600 text-white text-xs">
                <FileText className="mr-1 h-3 w-3" />
                Generated
              </Badge>
            )
          }
          
          if (invoiceInstance.status === "ready") {
            return (
              <Badge className="bg-green-700 text-white text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Ready to Process
              </Badge>
            )
          }
        }
      }
    }

    // Fall back to dependency status if no invoice instance or not invoice type
    if (!status) {
      return (
        <Badge variant="secondary" className="text-xs">
          <Info className="mr-1 h-3 w-3" />
          No template
        </Badge>
      )
    }

    const { allMet, requiredBillTemplates, arrivedBills, missingBillTemplates } = status
    const requiredCount = requiredBillTemplates.length
    const arrivedCount = arrivedBills.length

    if (requiredCount === 0) {
      return (
        <Badge variant="secondary" className="text-xs">
          <Info className="mr-1 h-3 w-3" />
          No dependencies
        </Badge>
      )
    }

    if (allMet) {
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-green-600 text-white text-xs">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {arrivedCount}/{requiredCount} Complete
          </Badge>
          <Badge className="bg-green-700 text-white text-xs">
            Ready to Process
          </Badge>
        </div>
      )
    }

    if (arrivedCount === 0) {
      return (
        <Badge className="bg-red-600 text-white text-xs">
          <XCircle className="mr-1 h-3 w-3" />
          {arrivedCount}/{requiredCount} Complete
        </Badge>
      )
    }

    return (
      <Badge className="bg-yellow-600 text-white text-xs">
        <AlertCircle className="mr-1 h-3 w-3" />
        {arrivedCount}/{requiredCount} Complete
      </Badge>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Period</TableHead>
            {periodType === "payable" && <TableHead>Payable Template</TableHead>}
            {periodType === "payable" && <TableHead className="w-[120px]">Payment Day</TableHead>}
            {periodType === "invoice" && <TableHead>Tenant</TableHead>}
            {periodType === "invoice" && <TableHead>Invoice Template</TableHead>}
            {periodType === "invoice" && <TableHead className="w-[120px]">Generation Day</TableHead>}
            <TableHead className="w-[200px]">Bills</TableHead>
            <TableHead className="w-[150px]">Dependencies</TableHead>
            <TableHead className="w-[150px]">Start Date</TableHead>
            <TableHead className="w-[150px]">End Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monthKeys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={periodType === "payable" ? 10 : 11} className="text-center py-8 text-muted-foreground">
                No {periodType} periods found
              </TableCell>
            </TableRow>
          ) : (
            monthKeys.map((monthKey) => {
              const [year, month] = monthKey.split("-").map(Number)
              const monthPeriods = periodsByMonth.get(monthKey) || []
              const isMonthExpanded = expandedMonthGroups.has(monthKey)

              // Calculate aggregated stats for the month group
              const totalBills = monthPeriods.reduce((sum, p) => {
                return sum + (billsByPeriod.get(p.id)?.length || 0)
              }, 0)

              return (
                <React.Fragment key={monthKey}>
                  {/* Month Group Header Row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleMonthGroupExpansion(monthKey)}
                        >
                          {isMonthExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        {periodType === "invoice" ? (
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                        <span className="font-semibold">
                          {monthNames[month - 1]} {year}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {monthPeriods.length} {monthPeriods.length === 1 ? "period" : "periods"}
                        </Badge>
                      </div>
                    </TableCell>
                    {periodType === "payable" && <TableCell></TableCell>}
                    {periodType === "payable" && <TableCell></TableCell>}
                    {periodType === "invoice" && <TableCell></TableCell>}
                    {periodType === "invoice" && <TableCell></TableCell>}
                    {periodType === "invoice" && <TableCell></TableCell>}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {totalBills} bill{totalBills !== 1 ? "s" : ""} total
                      </span>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {/* Individual Period Rows (shown when month group is expanded) */}
                  {isMonthExpanded && monthPeriods.map((period) => {
                    const isEditing = editingPeriod === period.id
                    
                    // Get template info for payables - use period's payableTemplateId directly
                    const payableTemplate = period.payableTemplateId 
                      ? payableTemplateMap.get(period.payableTemplateId)
                      : null

                    // Get template and tenant info for invoices - use period's rentalInvoiceTemplateId
                    const invoiceTemplate = period.rentalInvoiceTemplateId
                      ? invoiceTemplateMap.get(period.rentalInvoiceTemplateId)
                      : null
                    
                    const tenant = period.tenantId ? tenantMap.get(period.tenantId) : null

                    // Get dependency status and bills for this period
                    const dependencyStatus = dependencyStatuses.get(period.id)
                    const periodBills = billsByPeriod.get(period.id) || []

                    // Determine status
                    const now = new Date()
                    const periodEnd = new Date(period.periodEndDate)
                    const isPast = periodEnd < now
                    const isCurrent = new Date(period.periodStartDate) <= now && periodEnd >= now

                    const statusBadge =
                      isPast ? (
                        <Badge variant="secondary">Complete</Badge>
                      ) : isCurrent ? (
                        <Badge className="bg-yellow-600 text-white">Current</Badge>
                      ) : (
                        <Badge variant="outline">Upcoming</Badge>
                      )

                    const isExpanded = expandedPeriods.has(period.id)

                    return (
                      <React.Fragment key={period.id}>
                        <TableRow className="bg-background/50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2 pl-6">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => togglePeriodExpansion(period.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              {periodType === "invoice" ? (
                                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                              )}
                              {periodType === "payable" && payableTemplate ? (
                                <span className="text-sm font-medium">{payableTemplate.name}</span>
                              ) : periodType === "invoice" && invoiceTemplate ? (
                                <span className="text-sm font-medium">{invoiceTemplate.name}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">No template</span>
                              )}
                            </div>
                          </TableCell>

                  {periodType === "payable" && (
                    <TableCell>
                      {payableTemplate ? (
                        <Badge variant="outline" className="text-xs">
                          {payableTemplate.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No template linked</span>
                      )}
                    </TableCell>
                  )}

                  {periodType === "payable" && (
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={editedDates?.scheduledPaymentDay || ""}
                          onChange={(e) =>
                            setEditedDates((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    scheduledPaymentDay: e.target.value
                                      ? parseInt(e.target.value, 10)
                                      : undefined
                                  }
                                : null
                            )
                          }
                          className="w-20"
                          placeholder="Day"
                        />
                      ) : period.scheduledPaymentDay ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">Day {period.scheduledPaymentDay}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                  )}

                  {periodType === "invoice" && (
                    <TableCell>
                      {tenant ? (
                        <span className="text-sm">{tenant.name}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">No tenant</span>
                      )}
                    </TableCell>
                  )}

                  {periodType === "invoice" && (
                    <TableCell>
                      {invoiceTemplate ? (
                        <Badge variant="outline" className="text-xs">
                          {invoiceTemplate.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No template linked</span>
                      )}
                    </TableCell>
                  )}

                  {periodType === "invoice" && (
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={editedDates?.scheduledGenerationDay || ""}
                          onChange={(e) =>
                            setEditedDates((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    scheduledGenerationDay: e.target.value
                                      ? parseInt(e.target.value, 10)
                                      : undefined
                                  }
                                : null
                            )
                          }
                          className="w-20"
                          placeholder="Day"
                        />
                      ) : period.scheduledGenerationDay ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">Day {period.scheduledGenerationDay}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                  )}

                  {/* Bills Column */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {periodBills.length === 0 ? (
                        <span className="text-muted-foreground text-sm">No bills</span>
                      ) : (
                        <>
                          <span className="text-sm font-medium">{periodBills.length} bill{periodBills.length !== 1 ? "s" : ""}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => togglePeriodExpansion(period.id)}
                          >
                            {isExpanded ? "Hide" : "Show"}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>

                  {/* Dependency Status Column */}
                  <TableCell>
                    {renderDependencyStatus(dependencyStatus, period)}
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editedDates?.startDate || ""}
                        onChange={(e) =>
                          setEditedDates((prev) =>
                            prev ? { ...prev, startDate: e.target.value } : null
                          )
                        }
                        className="w-full"
                      />
                    ) : (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(new Date(period.periodStartDate), "MMM dd, yyyy")}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editedDates?.endDate || ""}
                        onChange={(e) =>
                          setEditedDates((prev) =>
                            prev ? { ...prev, endDate: e.target.value } : null
                          )
                        }
                        className="w-full"
                      />
                    ) : (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(new Date(period.periodEndDate), "MMM dd, yyyy")}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>{statusBadge}</TableCell>

                  <TableCell>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSave(period)}
                          disabled={saving}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancel}
                          disabled={saving}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {periodType === "invoice" && invoiceTemplate && (
                          <>
                            {(() => {
                              const instanceKey = `${invoiceTemplate.id}-${period.periodYear}-${period.periodMonth}`
                              const existingInstance = invoiceInstanceMap.get(instanceKey)
                              
                              if (existingInstance) {
                                return (
                                  <Link href={`/dashboard/rental-invoices/${existingInstance.id}`}>
                                    <Button size="sm" variant="outline">
                                      <FileText className="h-3 w-3 mr-1" />
                                      View Invoice
                                    </Button>
                                  </Link>
                                )
                              }
                              
                              // Check if dependencies are met
                              const isReady = dependencyStatus?.allMet === true
                              const isCreating = creatingInvoiceInstance === period.id
                              
                              if (isReady && !isCreating) {
                                return (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={async () => {
                                      setCreatingInvoiceInstance(period.id)
                                      try {
                                        const result = await createInvoiceInstanceFromPeriodAction(
                                          propertyId,
                                          period.periodYear,
                                          period.periodMonth,
                                          invoiceTemplate.id
                                        )
                                        
                                        if (result.isSuccess) {
                                          toast.success("Invoice instance created successfully")
                                          router.refresh()
                                        } else {
                                          toast.error(result.message || "Failed to create invoice instance")
                                        }
                                      } catch (error) {
                                        toast.error("Failed to create invoice instance")
                                        console.error(error)
                                      } finally {
                                        setCreatingInvoiceInstance(null)
                                      }
                                    }}
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    Create Invoice
                                  </Button>
                                )
                              }
                              
                              return null
                            })()}
                          </>
                        )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(period)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                {isExpanded && periodBills.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={periodType === "payable" ? 10 : 11} className="p-0">
                      <div className="p-4 bg-muted/30">
                        <div className="mb-3">
                          <h4 className="text-sm font-semibold mb-2">
                            Matched Bills ({periodBills.length})
                          </h4>
                          {dependencyStatus && (
                            <div className="mb-2">
                              <div className="text-xs text-muted-foreground mb-1">
                                Required: {dependencyStatus.requiredBillTemplates.map((t) => t.name).join(", ")}
                              </div>
                              {dependencyStatus.missingBillTemplates.length > 0 && (
                                <div className="text-xs text-yellow-600">
                                  Missing: {dependencyStatus.missingBillTemplates.map((t) => t.name).join(", ")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {periodBills.map((bill) => (
                            <div
                              key={bill.id}
                              className="flex items-center justify-between gap-4 p-2 border rounded-md bg-background"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <button
                                  onClick={() => {
                                    setBillToView(bill.id)
                                    setViewBillDialogOpen(true)
                                  }}
                                  className="flex items-center gap-2 hover:underline text-left"
                                >
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{bill.fileName}</span>
                                </button>
                                <Badge
                                  variant="outline"
                                  className={`text-xs capitalize ${getBillTypeColor(bill.billType)}`}
                                >
                                  {bill.billType}
                                </Badge>
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
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setBillToMatchMore(bill.id)
                                    setMatchMoreDialogOpen(true)
                                  }}
                                >
                                  Match More
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUnmatchBill(bill.id, period.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  Unmatch
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </React.Fragment>
                  )
                })}
                </React.Fragment>
              )
            })
          )}
        </TableBody>
      </Table>

      {/* Dialog for matching bills to more periods */}
      {billToMatchMore && (
        <ManualPeriodMatcherDialog
          propertyId={propertyId}
          billId={billToMatchMore}
          open={matchMoreDialogOpen}
          onOpenChange={(open) => {
            setMatchMoreDialogOpen(open)
            if (!open) {
              setBillToMatchMore(null)
            }
          }}
          onMatchComplete={() => {
            setMatchMoreDialogOpen(false)
            setBillToMatchMore(null)
            router.refresh()
          }}
        />
      )}

      {/* Dialog for viewing bill extracted data */}
      <BillExtractedDataDialog
        billId={billToView}
        open={viewBillDialogOpen}
        onOpenChange={(open) => {
          setViewBillDialogOpen(open)
          if (!open) {
            setBillToView(null)
          }
        }}
      />
    </div>
  )
}

