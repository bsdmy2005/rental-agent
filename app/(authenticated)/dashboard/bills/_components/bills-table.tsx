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
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BillActions } from "./bill-actions"
import { FileText, DollarSign, Filter, X } from "lucide-react"

interface Bill {
  id: string
  fileName: string
  propertyId: string
  propertyName: string
  billType: "municipality" | "levy" | "utility" | "other"
  status: "pending" | "processing" | "processed" | "error"
  source: "email" | "manual_upload"
  billingYear: number | null
  billingMonth: number | null
  invoiceExtractionData: unknown
  paymentExtractionData: unknown
  createdAt: Date
}

interface BillsTableProps {
  bills: Bill[]
  properties: Array<{ id: string; name: string }>
}

export function BillsTable({ bills, properties }: BillsTableProps) {
  const [selectedProperty, setSelectedProperty] = useState<string>("all")
  const [selectedBillType, setSelectedBillType] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedSource, setSelectedSource] = useState<string>("all")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Format billing period helper
  const formatBillingPeriod = (bill: Bill) => {
    if (bill.billingYear && bill.billingMonth) {
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
      return `${monthNames[bill.billingMonth - 1]} ${bill.billingYear}`
    }
    return null
  }

  // Get unique values for filters
  const uniqueYears = useMemo(() => {
    const years = new Set<number>()
    bills.forEach((bill) => {
      if (bill.billingYear) years.add(bill.billingYear)
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [bills])

  // Filter bills
  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      // Property filter
      if (selectedProperty !== "all" && bill.propertyId !== selectedProperty) {
        return false
      }

      // Bill type filter
      if (selectedBillType !== "all" && bill.billType !== selectedBillType) {
        return false
      }

      // Status filter
      if (selectedStatus !== "all" && bill.status !== selectedStatus) {
        return false
      }

      // Source filter
      if (selectedSource !== "all" && bill.source !== selectedSource) {
        return false
      }

      // Year filter
      if (selectedYear !== "all" && bill.billingYear?.toString() !== selectedYear) {
        return false
      }

      // Month filter
      if (selectedMonth !== "all" && bill.billingMonth?.toString() !== selectedMonth) {
        return false
      }

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesFileName = bill.fileName.toLowerCase().includes(query)
        const matchesProperty = bill.propertyName.toLowerCase().includes(query)
        if (!matchesFileName && !matchesProperty) {
          return false
        }
      }

      return true
    })
  }, [
    bills,
    selectedProperty,
    selectedBillType,
    selectedStatus,
    selectedSource,
    selectedYear,
    selectedMonth,
    searchQuery
  ])

  // Count active filters
  const activeFiltersCount =
    (selectedProperty !== "all" ? 1 : 0) +
    (selectedBillType !== "all" ? 1 : 0) +
    (selectedStatus !== "all" ? 1 : 0) +
    (selectedSource !== "all" ? 1 : 0) +
    (selectedYear !== "all" ? 1 : 0) +
    (selectedMonth !== "all" ? 1 : 0) +
    (searchQuery ? 1 : 0)

  const clearAllFilters = () => {
    setSelectedProperty("all")
    setSelectedBillType("all")
    setSelectedStatus("all")
    setSelectedSource("all")
    setSelectedYear("all")
    setSelectedMonth("all")
    setSearchQuery("")
  }

  if (bills.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-2">No bills found.</p>
          <p className="text-muted-foreground text-sm">
            Bills will appear here when you upload them or receive them via email.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-lg">Filters</CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
          <CardDescription>Filter bills by property, type, status, and more</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="lg:col-span-4">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by file name or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Property Filter */}
            <div>
              <Label htmlFor="property">Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger id="property">
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

            {/* Bill Type Filter */}
            <div>
              <Label htmlFor="billType">Bill Type</Label>
              <Select value={selectedBillType} onValueChange={setSelectedBillType}>
                <SelectTrigger id="billType">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="municipality">Municipality</SelectItem>
                  <SelectItem value="levy">Levy</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div>
              <Label htmlFor="source">Source</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger id="source">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="manual_upload">Manual Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            {uniqueYears.length > 0 && (
              <div>
                <Label htmlFor="year">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger id="year">
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
            )}

            {/* Month Filter */}
            {selectedYear !== "all" && (
              <div>
                <Label htmlFor="month">Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger id="month">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Showing {filteredBills.length} of {bills.length} bill{filteredBills.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">File Name</TableHead>
                  <TableHead className="min-w-[150px]">Property</TableHead>
                  <TableHead className="min-w-[120px]">Bill Type</TableHead>
                  <TableHead className="min-w-[100px]">Period</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Source</TableHead>
                  <TableHead className="min-w-[120px]">Extracted Data</TableHead>
                  <TableHead className="min-w-[120px]">Uploaded</TableHead>
                  <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No bills match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((bill) => {
                    const billingPeriod = formatBillingPeriod(bill)
                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/bills/${bill.id}`}
                            className="text-primary hover:underline"
                          >
                            {bill.fileName}
                          </Link>
                        </TableCell>
                        <TableCell>{bill.propertyName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {bill.billType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {billingPeriod ? (
                            <Badge variant="outline" className="text-xs bg-primary/10">
                              {billingPeriod}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              bill.status === "processed"
                                ? "default"
                                : bill.status === "error"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {bill.source === "email" ? "Email" : "Manual"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {bill.invoiceExtractionData && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                                <FileText className="mr-1 h-3 w-3" />
                                Invoice
                              </Badge>
                            )}
                            {bill.paymentExtractionData && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                <DollarSign className="mr-1 h-3 w-3" />
                                Payment
                              </Badge>
                            )}
                            {!bill.invoiceExtractionData && !bill.paymentExtractionData && (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(bill.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <BillActions billId={bill.id} billName={bill.fileName} />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

