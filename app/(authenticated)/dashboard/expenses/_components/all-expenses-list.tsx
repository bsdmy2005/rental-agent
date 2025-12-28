"use client"

import { useState } from "react"
import type { ExpenseWithCategory } from "@/queries/expenses-queries"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import Link from "next/link"
import { Eye, Edit, Building2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AllExpensesListProps {
  expenses: ExpenseWithCategory[]
}

export function AllExpensesList({ expenses }: AllExpensesListProps) {
  const [selectedProperty, setSelectedProperty] = useState<string>("all")
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set())

  // Group expenses by property
  const expensesByProperty = expenses.reduce((acc, expense) => {
    if (!acc[expense.propertyId]) {
      acc[expense.propertyId] = {
        propertyName: expense.property.name,
        expenses: []
      }
    }
    acc[expense.propertyId].expenses.push(expense)
    return acc
  }, {} as Record<string, { propertyName: string; expenses: ExpenseWithCategory[] }>)

  const propertyEntries = Object.entries(expensesByProperty)
  const filteredProperties = selectedProperty === "all" 
    ? propertyEntries 
    : propertyEntries.filter(([id]) => id === selectedProperty)

  const toggleProperty = (propertyId: string) => {
    const newExpanded = new Set(expandedProperties)
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId)
    } else {
      newExpanded.add(propertyId)
    }
    setExpandedProperties(newExpanded)
  }

  // Calculate totals
  const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const totalByProperty = propertyEntries.map(([id, data]) => ({
    id,
    name: data.propertyName,
    total: data.expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0),
    count: data.expenses.length
  }))

  return (
    <div className="space-y-4">
      {/* Filter and Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {propertyEntries.map(([id, data]) => (
                <SelectItem key={id} value={id}>
                  {data.propertyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-semibold">R {totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Property Groups */}
      <div className="space-y-2">
        {filteredProperties.map(([propertyId, { propertyName, expenses: propertyExpenses }]) => {
          const isExpanded = expandedProperties.has(propertyId)
          const propertyTotal = propertyExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
          
          return (
            <Collapsible
              key={propertyId}
              open={isExpanded}
              onOpenChange={() => toggleProperty(propertyId)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div className="text-left">
                          <CardTitle className="text-lg">{propertyName}</CardTitle>
                          <CardDescription>
                            {propertyExpenses.length} expense{propertyExpenses.length !== 1 ? "s" : ""} • R {propertyTotal.toFixed(2)} total
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/properties/${propertyId}/expenses`}>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            View All
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Tax Year</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {propertyExpenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="max-w-md truncate">{expense.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{expense.category.name}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              R {parseFloat(expense.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {expense.taxYear || new Date(expense.expenseDate).getFullYear()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Link href={`/dashboard/properties/${propertyId}/expenses/${expense.id}`}>
                                  <Button variant="ghost" size="icon">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Link href={`/dashboard/properties/${propertyId}/expenses/${expense.id}/edit`}>
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}

