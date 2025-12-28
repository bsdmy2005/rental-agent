"use client"

import type { ExpenseWithCategory } from "@/queries/expenses-queries"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import Link from "next/link"
import { Eye, Edit } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

interface ExpensesListProps {
  expenses: ExpenseWithCategory[]
  propertyId: string
}

export function ExpensesList({ expenses, propertyId }: ExpensesListProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No expenses recorded yet. Add your first expense to get started.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Tax Year</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>
                {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
              </TableCell>
              <TableCell className="max-w-md truncate">{expense.description}</TableCell>
              <TableCell>R {parseFloat(expense.amount).toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant="outline">{expense.category.name}</Badge>
              </TableCell>
              <TableCell>{expense.taxYear || new Date(expense.expenseDate).getFullYear()}</TableCell>
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
    </div>
  )
}

