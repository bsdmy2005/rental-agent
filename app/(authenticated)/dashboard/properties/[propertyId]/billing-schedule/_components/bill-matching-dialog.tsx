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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface BillMatchingDialogProps {
  propertyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BillMatchingDialog({
  propertyId,
  open,
  onOpenChange
}: BillMatchingDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [unmatchedBills, setUnmatchedBills] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [selectedMatches, setSelectedMatches] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (open) {
      loadUnmatchedBillsAndPeriods()
    } else {
      // Reset state when dialog closes
      setUnmatchedBills([])
      setPeriods([])
      setSelectedMatches(new Map())
      setInitialLoading(true)
    }
  }, [open, propertyId])

  const loadUnmatchedBillsAndPeriods = async () => {
    setInitialLoading(true)
    try {
      // Fetch unmatched bills and available periods
      const [billsRes, periodsRes] = await Promise.all([
        fetch(`/api/billing-schedule/unmatched-bills?propertyId=${propertyId}`),
        fetch(`/api/billing-schedule/periods?propertyId=${propertyId}`)
      ])

      const billsData = await billsRes.json()
      const periodsData = await periodsRes.json()

      if (billsData.success) {
        setUnmatchedBills(billsData.bills || [])
      }
      if (periodsData.success) {
        setPeriods(periodsData.periods || [])
      }
    } catch (error) {
      console.error("Error loading unmatched bills and periods:", error)
      toast.error("Failed to load data")
    } finally {
      setInitialLoading(false)
    }
  }

  const handleMatch = async (billId: string, periodId: string) => {
    setSelectedMatches((prev) => new Map(prev).set(billId, periodId))
  }

  const handleSaveMatches = async () => {
    if (selectedMatches.size === 0) {
      toast.error("Please select at least one match")
      return
    }

    setLoading(true)
    try {
      // Match each bill to its selected period
      for (const [billId, periodId] of selectedMatches.entries()) {
        try {
          const response = await fetch("/api/billing-schedule/match-bill", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ billId, periodId })
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || "Failed to match bill")
          }
        } catch (error) {
          console.error(`Error matching bill ${billId}:`, error)
        }
      }

      toast.success(`Matched ${selectedMatches.size} bill(s) to periods`)
      setSelectedMatches(new Map())
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error saving matches:", error)
      toast.error("Failed to save matches")
    } finally {
      setLoading(false)
    }
  }

  const formatPeriodLabel = (period: any) => {
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
    return `${monthNames[period.periodMonth - 1]} ${period.periodYear} (${period.periodType})`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Match Bills to Periods</DialogTitle>
          <DialogDescription>
            Manually assign unmatched bills to billing periods. Bills can be automatically matched
            based on their billing period, but you can override that here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {initialLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading...</p>
            </div>
          ) : unmatchedBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>All bills are matched to periods</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {unmatchedBills.map((bill) => {
                  const billPeriodYear = bill.billingYear
                  const billPeriodMonth = bill.billingMonth
                  const suggestedPeriod = periods.find(
                    (p) =>
                      p.periodYear === billPeriodYear &&
                      p.periodMonth === billPeriodMonth &&
                      p.propertyId === propertyId
                  )

                  return (
                    <Card key={bill.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{bill.fileName}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {bill.billType}
                              </Badge>
                              {bill.billingYear && bill.billingMonth && (
                                <Badge variant="secondary" className="text-xs">
                                  {bill.billingYear}-{String(bill.billingMonth).padStart(2, "0")}
                                </Badge>
                              )}
                            </div>
                            {suggestedPeriod && (
                              <p className="text-xs text-muted-foreground mb-2">
                                Suggested: {formatPeriodLabel(suggestedPeriod)}
                              </p>
                            )}
                          </div>
                          {periods.length > 0 ? (
                            <Select
                              value={selectedMatches.get(bill.id) || undefined}
                              onValueChange={(value) => handleMatch(bill.id, value)}
                            >
                              <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Select period..." />
                              </SelectTrigger>
                              <SelectContent>
                                {periods.map((period) => (
                                  <SelectItem key={period.id} value={period.id}>
                                    {formatPeriodLabel(period)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="w-[250px] text-sm text-muted-foreground">
                              No periods available
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMatches} disabled={loading || selectedMatches.size === 0}>
                  {loading ? "Saving..." : `Save ${selectedMatches.size} Match(es)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

