"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Filter, X, FileText, Mail, Download } from "lucide-react"
import type { SelectRentalInvoiceInstance } from "@/db/schema"
import type { InvoiceData } from "@/types"

interface InvoiceWithProperty extends SelectRentalInvoiceInstance {
  propertyName: string
}

interface RentalInvoicesTableProps {
  invoices: InvoiceWithProperty[]
  properties: Array<{ id: string; name: string }>
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-500",
  ready: "bg-blue-500",
  generated: "bg-yellow-500",
  sent: "bg-green-500"
}

export function RentalInvoicesTable({
  invoices,
  properties
}: RentalInvoicesTableProps) {
  const [selectedProperty, setSelectedProperty] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Get unique years and months
  const uniqueYears = useMemo(() => {
    const years = new Set<number>()
    invoices.forEach((invoice) => {
      if (invoice.periodYear) {
        years.add(invoice.periodYear)
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [invoices])

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Property filter
      if (selectedProperty !== "all" && invoice.propertyId !== selectedProperty) {
        return false
      }

      // Status filter
      if (selectedStatus !== "all" && invoice.status !== selectedStatus) {
        return false
      }

      // Year filter
      if (selectedYear !== "all" && invoice.periodYear?.toString() !== selectedYear) {
        return false
      }

      // Month filter
      if (selectedMonth !== "all" && invoice.periodMonth?.toString() !== selectedMonth) {
        return false
      }

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const invoiceData = invoice.invoiceData as InvoiceData | null
        const invoiceNumber = invoiceData?.invoiceNumber || ""
        const matchesInvoiceNumber = invoiceNumber.toLowerCase().includes(query)
        const matchesProperty = invoice.propertyName.toLowerCase().includes(query)
        if (!matchesInvoiceNumber && !matchesProperty) {
          return false
        }
      }

      return true
    })
  }, [invoices, selectedProperty, selectedStatus, selectedYear, selectedMonth, searchQuery])

  // Count active filters
  const activeFiltersCount =
    (selectedProperty !== "all" ? 1 : 0) +
    (selectedStatus !== "all" ? 1 : 0) +
    (selectedYear !== "all" ? 1 : 0) +
    (selectedMonth !== "all" ? 1 : 0) +
    (searchQuery ? 1 : 0)

  const clearAllFilters = () => {
    setSelectedProperty("all")
    setSelectedStatus("all")
    setSelectedYear("all")
    setSelectedMonth("all")
    setSearchQuery("")
  }

  const formatCurrency = (amount: number) => {
    return `R ${amount.toFixed(2)}`
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

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No invoices found</p>
            <p className="text-sm text-muted-foreground">
              Invoice instances are created automatically when the generation day matches, or you can create them manually from the{" "}
              <Link href={`/dashboard/properties`} className="text-primary underline">
                Billing Schedule
              </Link>
              {" "}page for ready periods.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search by invoice number or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">Property</label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[120px]">
              <label className="text-sm font-medium mb-2 block">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[120px]">
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
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
                    return (
                      <SelectItem key={month} value={month.toString()}>
                        {monthNames[month - 1]}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={clearAllFilters} size="sm">
                <X className="mr-2 h-4 w-4" />
                Clear ({activeFiltersCount})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No invoices match your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const invoiceData = invoice.invoiceData as InvoiceData | null
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoiceData?.invoiceNumber || `Invoice ${invoice.id.substring(0, 8)}`}
                      </TableCell>
                      <TableCell>{invoice.propertyName}</TableCell>
                      <TableCell>
                        {formatPeriod(invoice.periodYear, invoice.periodMonth)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[invoice.status] || "bg-gray-500"}
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {invoiceData
                          ? formatCurrency(invoiceData.totalAmount)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/rental-invoices/${invoice.id}`}>
                              View
                            </Link>
                          </Button>
                          {invoice.status === "generated" && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/dashboard/rental-invoices/${invoice.id}`}>
                                <Mail className="h-4 w-4 mr-1" />
                                Send
                              </Link>
                            </Button>
                          )}
                          {invoice.status === "generated" || invoice.status === "sent" ? (
                            <Button asChild variant="outline" size="sm">
                              <a
                                href={`/api/rental-invoices/${invoice.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

