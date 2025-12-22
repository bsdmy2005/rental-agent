"use client"

import { useState, useEffect, useMemo } from "react"
import { type SelectBill } from "@/db/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText } from "lucide-react"
import { getAllBillsWithMatchedStatusAction } from "@/actions/period-bill-matches-actions"
import { ManualPeriodMatcherDialog } from "./manual-period-matcher-dialog"
import { BillExtractedDataDialog } from "./bill-extracted-data-dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface BillsSectionProps {
  propertyId: string
}

interface BillWithMatchedStatus extends SelectBill {
  extractedPeriod?: { year: number; month: number }
  extractionRuleName?: string | null
  billTemplateName?: string | null
  matchedPeriodCount: number
  matchedPeriodIds: string[]
}

export function UnmatchedBillsSection({ propertyId }: BillsSectionProps) {
  const router = useRouter()
  const [allBills, setAllBills] = useState<BillWithMatchedStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [matcherDialogOpen, setMatcherDialogOpen] = useState(false)
  const [billToView, setBillToView] = useState<string | null>(null)
  const [viewBillDialogOpen, setViewBillDialogOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>("all")

  useEffect(() => {
    loadAllBills()
  }, [propertyId])

  const loadAllBills = async () => {
    setLoading(true)
    try {
      const result = await getAllBillsWithMatchedStatusAction(propertyId)
      if (result.isSuccess && result.data) {
        setAllBills(result.data)
      } else {
        toast.error(result.message || "Failed to load bills")
      }
    } catch (error) {
      console.error("Error loading bills:", error)
      toast.error("Failed to load bills")
    } finally {
      setLoading(false)
    }
  }

  // Get unique months from bills for filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    allBills.forEach((bill) => {
      if (bill.billingYear && bill.billingMonth) {
        const monthKey = `${bill.billingYear}-${String(bill.billingMonth).padStart(2, "0")}`
        months.add(monthKey)
      }
    })
    return Array.from(months).sort().reverse()
  }, [allBills])

  // Filter bills by selected month
  const filteredBills = useMemo(() => {
    if (selectedMonth === "all") {
      return allBills
    }
    const [year, month] = selectedMonth.split("-").map(Number)
    return allBills.filter(
      (bill) => bill.billingYear === year && bill.billingMonth === month
    )
  }, [allBills, selectedMonth])

  const handleMatchBill = (billId: string) => {
    setSelectedBillId(billId)
    setMatcherDialogOpen(true)
  }

  const handleMatchComplete = () => {
    setMatcherDialogOpen(false)
    setSelectedBillId(null)
    // Reload bills after a short delay to ensure server state is updated
    setTimeout(() => {
      loadAllBills()
      router.refresh()
    }, 500)
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

  const formatPeriod = (bill: BillWithMatchedStatus) => {
    if (bill.billingYear && bill.billingMonth) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return `${monthNames[bill.billingMonth - 1]} ${bill.billingYear}`
    }
    return "—"
  }

  const formatExtractedData = (bill: BillWithMatchedStatus) => {
    const hasInvoiceData = !!bill.invoiceExtractionData
    const hasPaymentData = !!bill.paymentExtractionData
    if (hasInvoiceData && hasPaymentData) {
      return "Invoice + Payment"
    } else if (hasInvoiceData) {
      return "Invoice"
    } else if (hasPaymentData) {
      return "Payment"
    }
    return "—"
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const formatSource = (source: string) => {
    return source
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bills</CardTitle>
          <CardDescription>Loading bills...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (allBills.length === 0) {
    return null // Don't show section if no bills
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bills
              </CardTitle>
              <CardDescription>
                {filteredBills.length} of {allBills.length} bill{allBills.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {availableMonths.map((monthKey) => {
                    const [year, month] = monthKey.split("-").map(Number)
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                    return (
                      <SelectItem key={monthKey} value={monthKey}>
                        {monthNames[month - 1]} {year}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Type</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Matched</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Extraction Rule</TableHead>
                  <TableHead>Extracted Data</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${getBillTypeColor(bill.billType)}`}
                      >
                        {bill.billType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bill.billTemplateName ? (
                        <span className="text-sm font-medium">{bill.billTemplateName}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatPeriod(bill)}</span>
                    </TableCell>
                    <TableCell>
                      {bill.matchedPeriodCount > 0 ? (
                        <Badge variant="default" className="text-xs">
                          {bill.matchedPeriodCount} period{bill.matchedPeriodCount !== 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-yellow-600">
                          Unmatched
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatSource(bill.source)}</span>
                    </TableCell>
                    <TableCell>
                      {bill.extractionRuleName ? (
                        <span className="text-sm">{bill.extractionRuleName}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatExtractedData(bill)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(bill.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMatchBill(bill.id)}
                        >
                          {bill.matchedPeriodCount > 0 ? "Match More" : "Match to Period"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setBillToView(bill.id)
                            setViewBillDialogOpen(true)
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedBillId && (
        <ManualPeriodMatcherDialog
          propertyId={propertyId}
          billId={selectedBillId}
          open={matcherDialogOpen}
          onOpenChange={setMatcherDialogOpen}
          onMatchComplete={handleMatchComplete}
        />
      )}

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
    </>
  )
}

