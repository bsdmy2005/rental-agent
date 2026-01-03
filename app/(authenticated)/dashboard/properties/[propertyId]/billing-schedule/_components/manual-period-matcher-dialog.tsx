"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, Calendar, AlertCircle } from "lucide-react"
import { matchBillToMultiplePeriodsAction } from "@/actions/period-bill-matches-actions"
import { getPeriodsForPropertyAction } from "@/actions/billing-periods-actions"
import { getPayableTemplatesByPropertyIdAction } from "@/actions/payable-templates-actions"
import { getRentalInvoiceTemplatesByPropertyIdAction } from "@/actions/rental-invoice-templates-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { type SelectBillingPeriod, type SelectBill, type SelectPayableTemplate, type SelectRentalInvoiceTemplate } from "@/db/schema"

interface ManualPeriodMatcherDialogProps {
  propertyId: string
  billId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onMatchComplete?: () => void
}

export function ManualPeriodMatcherDialog({
  propertyId,
  billId,
  open,
  onOpenChange,
  onMatchComplete
}: ManualPeriodMatcherDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [bill, setBill] = useState<SelectBill | null>(null)
  const [periods, setPeriods] = useState<SelectBillingPeriod[]>([])
  const [compatiblePeriods, setCompatiblePeriods] = useState<SelectBillingPeriod[]>([])
  const [incompatiblePeriods, setIncompatiblePeriods] = useState<Map<string, string>>(new Map())
  const [payableTemplates, setPayableTemplates] = useState<SelectPayableTemplate[]>([])
  const [invoiceTemplates, setInvoiceTemplates] = useState<SelectRentalInvoiceTemplate[]>([])
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<Set<string>>(new Set())
  const [matching, setMatching] = useState(false)
  const [existingMatches, setExistingMatches] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open && billId) {
      loadData()
    }
  }, [open, billId, propertyId])

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch periods
      const periodsResult = await getPeriodsForPropertyAction(propertyId)
      if (periodsResult.isSuccess && periodsResult.data) {
        setPeriods(periodsResult.data)
      }

      // Fetch templates
      const payableTemplatesResult = await getPayableTemplatesByPropertyIdAction(propertyId)
      if (payableTemplatesResult.isSuccess && payableTemplatesResult.data) {
        setPayableTemplates(payableTemplatesResult.data)
      }

      const invoiceTemplatesResult = await getRentalInvoiceTemplatesByPropertyIdAction(propertyId)
      if (invoiceTemplatesResult.isSuccess && invoiceTemplatesResult.data) {
        setInvoiceTemplates(invoiceTemplatesResult.data)
      }

      // Fetch bill via API
      const billResponse = await fetch(`/api/bills/${billId}`)
      if (billResponse.ok) {
        const billData = await billResponse.json()
        if (billData.success && billData.bill) {
          setBill(billData.bill)

          // Fetch existing matches for this bill
          const matchesResponse = await fetch(`/api/billing-schedule/bills/${billId}/matches`)
          let existingMatchIds = new Set<string>()
          if (matchesResponse.ok) {
            const matchesData = await matchesResponse.json()
            if (matchesData.success && matchesData.matches) {
              existingMatchIds = new Set(matchesData.matches.map((m: { periodId: string }) => m.periodId))
              setExistingMatches(existingMatchIds)
              // Pre-select existing matches so user can see what's already matched and add more
              setSelectedPeriodIds(existingMatchIds)
            }
          }

          // Set periods first
          setPeriods(periodsResult.data || [])

          // Check compatibility for all periods
          if (periodsResult.data && periodsResult.data.length > 0 && billData.bill.billTemplateId) {
            const { checkBillPeriodCompatibilityAction } = await import("@/actions/period-bill-matches-actions")
            const compatibilityResult = await checkBillPeriodCompatibilityAction(
              billId,
              periodsResult.data.map((p) => p.id)
            )

            if (compatibilityResult.isSuccess && compatibilityResult.data) {
              const compatible: SelectBillingPeriod[] = []
              const incompatible = new Map<string, string>()

              periodsResult.data.forEach((period) => {
                const compatibility = compatibilityResult.data!.get(period.id)
                if (compatibility?.canMatch) {
                  compatible.push(period)
                } else {
                  incompatible.set(period.id, compatibility?.reason || "Cannot match")
                }
              })

              setCompatiblePeriods(compatible)
              setIncompatiblePeriods(incompatible)

              // If no existing matches, auto-select suggested compatible periods if bill has extracted period
              if (existingMatchIds.size === 0 && billData.bill.billingYear && billData.bill.billingMonth) {
                const suggestedPeriods = compatible.filter(
                  (p) =>
                    p.periodYear === billData.bill.billingYear &&
                    p.periodMonth === billData.bill.billingMonth &&
                    p.propertyId === propertyId
                )
                if (suggestedPeriods.length > 0) {
                  setSelectedPeriodIds(new Set(suggestedPeriods.map((p) => p.id)))
                }
              }
            } else {
              // If compatibility check fails, show all periods as compatible (fallback)
              setCompatiblePeriods(periodsResult.data)
            }
          } else {
            // If bill has no template ID, show all periods as compatible
            setCompatiblePeriods(periodsResult.data || [])
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePeriod = (periodId: string) => {
    setSelectedPeriodIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(periodId)) {
        newSet.delete(periodId)
      } else {
        newSet.add(periodId)
      }
      return newSet
    })
  }

  const handleMatch = async () => {
    if (selectedPeriodIds.size === 0) {
      toast.error("Please select at least one period")
      return
    }

    setMatching(true)
    try {
      // Only match to periods that aren't already matched
      const periodsToMatch = Array.from(selectedPeriodIds).filter(
        (id) => !existingMatches.has(id)
      )

      if (periodsToMatch.length === 0) {
        toast.info("Bill is already matched to all selected periods")
        onMatchComplete?.()
        onOpenChange(false)
        router.refresh()
        return
      }

      const result = await matchBillToMultiplePeriodsAction(billId, periodsToMatch)
      if (result.isSuccess) {
        toast.success(`Bill matched to ${result.data?.length || 0} period(s) successfully`)
        onMatchComplete?.()
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.message || "Failed to match bill to periods")
      }
    } catch (error) {
      console.error("Error matching bill:", error)
      toast.error("Failed to match bill to periods")
    } finally {
      setMatching(false)
    }
  }

  const getTemplateName = (period: SelectBillingPeriod): string => {
    if (period.periodType === "invoice" && period.rentalInvoiceTemplateId) {
      const template = invoiceTemplates.find((t) => t.id === period.rentalInvoiceTemplateId)
      return template?.name || "Unknown Template"
    } else if (period.periodType === "payable" && period.payableTemplateId) {
      const template = payableTemplates.find((t) => t.id === period.payableTemplateId)
      return template?.name || "Unknown Template"
    }
    return "No Template"
  }

  const formatPeriodLabel = (period: SelectBillingPeriod) => {
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
    const periodTypeLabel = period.periodType === "invoice" ? "Invoice" : "Payable"
    return `${monthNames[period.periodMonth - 1]} ${period.periodYear} (${periodTypeLabel})`
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

  if (!bill) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] sm:!w-[90vw] sm:!max-w-5xl">
        <DialogHeader>
          <DialogTitle>Match Bill to Periods</DialogTitle>
          <DialogDescription>
            Select one or more billing periods to match this bill to. A bill can be matched to multiple periods (e.g., both invoice and payable periods). Existing matches are shown pre-selected for reference.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Bill Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{bill.fileName}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${getBillTypeColor(bill.billType)}`}
                      >
                        {bill.billType}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {bill.status}
                      </Badge>
                    </div>
                    {bill.billingYear && bill.billingMonth ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Extracted Period: {bill.billingYear}-{String(bill.billingMonth).padStart(2, "0")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-yellow-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>No period extracted from bill</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Period Selection - Multiple */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Periods ({selectedPeriodIds.size} selected)
              </label>
              {compatiblePeriods.length === 0 && incompatiblePeriods.size === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No billing periods found for this property. Create periods first.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Compatible Periods */}
                  {compatiblePeriods.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">
                        Compatible Periods ({compatiblePeriods.length})
                      </p>
                      <div className="border rounded-md max-h-[300px] overflow-y-auto">
                        <div className="divide-y">
                          {compatiblePeriods.map((period) => {
                            const isSelected = selectedPeriodIds.has(period.id)
                            const isAlreadyMatched = existingMatches.has(period.id)
                            const templateName = getTemplateName(period)
                            return (
                              <div
                                key={period.id}
                                className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                                onClick={() => !isAlreadyMatched && handleTogglePeriod(period.id)}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  disabled={isAlreadyMatched}
                                  onCheckedChange={() => !isAlreadyMatched && handleTogglePeriod(period.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1 grid grid-cols-[1fr_1.5fr] gap-4 items-center">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm font-medium truncate">{formatPeriodLabel(period)}</span>
                                    {isAlreadyMatched && (
                                      <Badge variant="secondary" className="text-xs shrink-0">
                                        Already Matched
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs text-muted-foreground shrink-0">Template:</span>
                                    <Badge variant="outline" className="text-xs truncate max-w-full">
                                      {templateName}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Incompatible Periods (shown but disabled) */}
                  {incompatiblePeriods.size > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">
                        Incompatible Periods ({incompatiblePeriods.size})
                      </p>
                      <div className="border rounded-md max-h-[200px] overflow-y-auto opacity-60">
                        <div className="divide-y">
                          {periods
                            .filter((p) => incompatiblePeriods.has(p.id))
                            .map((period) => {
                              const templateName = getTemplateName(period)
                              const reason = incompatiblePeriods.get(period.id)
                              return (
                                <div
                                  key={period.id}
                                  className="flex items-center gap-3 p-3 cursor-not-allowed"
                                >
                                  <Checkbox disabled checked={false} />
                                  <div className="flex-1 grid grid-cols-[1fr_1.5fr] gap-4 items-center">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-sm font-medium truncate text-muted-foreground">
                                        {formatPeriodLabel(period)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs text-muted-foreground shrink-0">Template:</span>
                                      <Badge variant="outline" className="text-xs truncate max-w-full">
                                        {templateName}
                                      </Badge>
                                    </div>
                                  </div>
                                  <Badge variant="destructive" className="text-xs" title={reason}>
                                    Incompatible
                                  </Badge>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={matching}>
                Cancel
              </Button>
              <Button
                onClick={handleMatch}
                disabled={matching || selectedPeriodIds.size === 0}
              >
                {matching ? (
                  "Matching..."
                ) : (() => {
                  const newPeriodsCount = Array.from(selectedPeriodIds).filter(
                    (id) => !existingMatches.has(id)
                  ).length
                  const existingCount = Array.from(selectedPeriodIds).filter(
                    (id) => existingMatches.has(id)
                  ).length
                  
                  if (newPeriodsCount === 0 && existingCount > 0) {
                    return "All Selected Periods Already Matched"
                  }
                  
                  if (existingCount > 0) {
                    return `Match to ${newPeriodsCount} New Period${newPeriodsCount !== 1 ? "s" : ""} (${existingCount} already matched)`
                  }
                  
                  return `Match to ${selectedPeriodIds.size} Period${selectedPeriodIds.size !== 1 ? "s" : ""}`
                })()}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

