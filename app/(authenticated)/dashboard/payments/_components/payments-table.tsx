"use client"

import React, { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, CreditCard, ExternalLink } from "lucide-react"
import { PaymentExecutionDialog } from "./payment-execution-dialog"
import { getPaymentInstructionByPropertyAction } from "@/actions/payment-instructions-actions"
import type { PayableInstanceWithDetails } from "@/queries/payable-instances-queries"
import Link from "next/link"

interface PaymentsTableProps {
  payables: PayableInstanceWithDetails[]
  properties: Array<{ id: string; name: string }>
  onPaymentExecuted?: () => void
}

export function PaymentsTable({ payables, properties, onPaymentExecuted }: PaymentsTableProps) {
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set())
  const [selectedProperty, setSelectedProperty] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<string | null>(null)
  const [paymentInstructionMap, setPaymentInstructionMap] = useState<Map<string, string>>(new Map())

  // Group payables by property
  const payablesByProperty = useMemo(() => {
    const grouped = new Map<string, PayableInstanceWithDetails[]>()
    payables.forEach((payable) => {
      const existing = grouped.get(payable.propertyId) || []
      grouped.set(payable.propertyId, [...existing, payable])
    })
    return grouped
  }, [payables])

  // Filter payables
  const filteredPayables = useMemo(() => {
    let filtered = payables

    if (selectedProperty !== "all") {
      filtered = filtered.filter((p) => p.propertyId === selectedProperty)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.templateName.toLowerCase().includes(query) ||
          p.propertyName.toLowerCase().includes(query) ||
          p.beneficiaryName?.toLowerCase().includes(query) ||
          p.bankAccountName?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [payables, selectedProperty, searchQuery])

  // Group filtered payables by property
  const filteredPayablesByProperty = useMemo(() => {
    const grouped = new Map<string, PayableInstanceWithDetails[]>()
    filteredPayables.forEach((payable) => {
      const existing = grouped.get(payable.propertyId) || []
      grouped.set(payable.propertyId, [...existing, payable])
    })
    return grouped
  }, [filteredPayables])

  const toggleProperty = (propertyId: string) => {
    const newExpanded = new Set(expandedProperties)
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId)
    } else {
      newExpanded.add(propertyId)
    }
    setExpandedProperties(newExpanded)
  }

  const formatCurrency = (amount: number, currency: string = "ZAR") => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency
    }).format(amount)
  }

  const formatPeriod = (year: number, month: number) => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ]
    return `${monthNames[month - 1]} ${year}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge variant="default" className="bg-green-600">Ready</Badge>
      case "paid":
        return <Badge variant="default" className="bg-blue-600">Paid</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "processing":
        return <Badge variant="secondary">Processing</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handlePayClick = async (payable: PayableInstanceWithDetails) => {
    // Get payment instruction for this property
    if (!paymentInstructionMap.has(payable.propertyId)) {
      const result = await getPaymentInstructionByPropertyAction(payable.propertyId)
      if (result.isSuccess && result.data) {
        setPaymentInstructionMap((prev) => {
          const newMap = new Map(prev)
          newMap.set(payable.propertyId, result.data!.id)
          return newMap
        })
      } else {
        console.error("Failed to get payment instruction:", result.message)
        return
      }
    }
    setPaymentDialogOpen(payable.id)
  }

  if (filteredPayables.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>No payables found matching your filters.</p>
      </div>
    )
  }

  // Calculate totals per property
  const propertyTotals = new Map<string, { count: number; total: number }>()
  filteredPayablesByProperty.forEach((payables, propertyId) => {
    const total = payables.reduce((sum, p) => sum + p.amount, 0)
    propertyTotals.set(propertyId, { count: payables.length, total })
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Properties</option>
          {properties.map((prop) => (
            <option key={prop.id} value={prop.id}>
              {prop.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm flex-1"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bank Account</TableHead>
              <TableHead>Beneficiary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from(filteredPayablesByProperty.entries()).map(([propertyId, propertyPayables]) => {
              const property = properties.find((p) => p.id === propertyId)
              const isExpanded = expandedProperties.has(propertyId)
              const totals = propertyTotals.get(propertyId) || { count: 0, total: 0 }

              return (
                <React.Fragment key={`property-group-${propertyId}`}>
                  {/* Property Row */}
                  <TableRow
                    className="bg-muted/50 cursor-pointer hover:bg-muted"
                    onClick={() => toggleProperty(propertyId)}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleProperty(propertyId)
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{property?.name || "Unknown"}</TableCell>
                    <TableCell colSpan={2} className="text-muted-foreground text-sm">
                      {totals.count} payable{totals.count !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(totals.total)}
                    </TableCell>
                    <TableCell colSpan={4}></TableCell>
                  </TableRow>

                  {/* Payable Rows */}
                  {isExpanded &&
                    propertyPayables.map((payable) => (
                      <TableRow key={payable.id} className="bg-background/50">
                        <TableCell></TableCell>
                        <TableCell className="pl-8 text-muted-foreground text-sm">
                          <Link
                            href={`/dashboard/payments/${payable.id}`}
                            className="hover:underline"
                          >
                            {payable.propertyName}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium">{payable.templateName}</TableCell>
                        <TableCell>{formatPeriod(payable.periodYear, payable.periodMonth)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payable.amount, payable.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(payable.status)}
                            {payable.status === "ready" &&
                              payable.templateBankAccountId &&
                              payable.templateBeneficiaryId && (
                                <Badge variant="default" className="bg-green-600 text-xs">
                                  Ready to Pay
                                </Badge>
                              )}
                            {payable.status === "ready" &&
                              (!payable.templateBankAccountId || !payable.templateBeneficiaryId) && (
                                <Badge variant="secondary" className="text-xs">
                                  Setup Needed
                                </Badge>
                              )}
                            {payable.status === "paid" && payable.latestPayment && (
                              <Badge variant="default" className="bg-blue-600 text-xs">
                                {payable.latestPayment.status === "completed"
                                  ? "Completed"
                                  : payable.latestPayment.status === "processing"
                                  ? "Processing"
                                  : "Paid"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payable.bankAccountName || (
                            <span className="text-destructive">Not configured</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payable.beneficiaryName || (
                            <span className="text-destructive">Not configured</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {payable.status === "ready" &&
                              payable.templateBankAccountId &&
                              payable.templateBeneficiaryId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePayClick(payable)}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Pay
                                </Button>
                              )}
                            {payable.status === "ready" &&
                              (!payable.templateBankAccountId || !payable.templateBeneficiaryId) && (
                                <Badge variant="secondary" className="text-xs">
                                  Setup Needed
                                </Badge>
                              )}
                            {payable.status === "paid" && payable.latestPayment && (
                              <div className="text-xs text-muted-foreground">
                                {payable.latestPayment.executedAt
                                  ? `Paid ${new Date(payable.latestPayment.executedAt).toLocaleDateString("en-ZA", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric"
                                    })}`
                                  : "Paid"}
                              </div>
                            )}
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/payments/${payable.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Payment Execution Dialog */}
      {paymentDialogOpen && (
        <PaymentExecutionDialog
          payable={payables.find((p) => p.id === paymentDialogOpen)!}
          paymentInstructionId={paymentInstructionMap.get(
            payables.find((p) => p.id === paymentDialogOpen)!.propertyId
          ) || ""}
          open={!!paymentDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setPaymentDialogOpen(null)
              onPaymentExecuted?.()
            }
          }}
        />
      )}
    </div>
  )
}

