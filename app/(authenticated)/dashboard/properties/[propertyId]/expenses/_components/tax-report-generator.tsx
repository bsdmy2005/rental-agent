"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { generateTaxReportAction } from "@/actions/expenses-actions"
import { toast } from "sonner"
import { Loader2, Download, FileText } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

interface TaxReportGeneratorProps {
  propertyId: string
}

export function TaxReportGenerator({ propertyId }: TaxReportGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [taxYear, setTaxYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<{
    expenses: any[]
    depreciation: any[]
  } | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const result = await generateTaxReportAction(propertyId, taxYear)
      if (result.isSuccess && result.data) {
        setReportData(result.data)
        toast.success("Tax report generated successfully")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error generating tax report:", error)
      toast.error("Failed to generate tax report")
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!reportData) return

    // Group expenses by category
    const categoryTotals = new Map<string, number>()
    reportData.expenses.forEach((expense) => {
      const category = expense.category?.name || "Unknown"
      const amount = parseFloat(expense.amount)
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount)
    })

    // Create CSV content
    let csv = "Category,Amount\n"
    categoryTotals.forEach((amount, category) => {
      csv += `${category},R ${amount.toFixed(2)}\n`
    })

    csv += "\nDepreciation\n"
    csv += "Asset Name,Current Value\n"
    reportData.depreciation.forEach((dep) => {
      csv += `${dep.assetName},R ${parseFloat(dep.currentValue).toFixed(2)}\n`
    })

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tax-report-${propertyId}-${taxYear}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Group expenses by category
  const categoryTotals = new Map<string, { amount: number; count: number }>()
  if (reportData) {
    reportData.expenses.forEach((expense) => {
      const category = expense.category?.name || "Unknown"
      const amount = parseFloat(expense.amount)
      const current = categoryTotals.get(category) || { amount: 0, count: 0 }
      categoryTotals.set(category, {
        amount: current.amount + amount,
        count: current.count + 1
      })
    })
  }

  const totalExpenses = reportData
    ? reportData.expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
    : 0
  const totalDepreciation = reportData
    ? reportData.depreciation.reduce((sum, d) => sum + parseFloat(d.currentValue), 0)
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Tax Report Generator
        </CardTitle>
        <CardDescription>Generate SARS-compliant tax reports</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="taxYear">Tax Year *</Label>
          <Input
            id="taxYear"
            type="number"
            required
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value))}
            min={2020}
            max={2100}
          />
        </div>

        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Generate Report
        </Button>

        {reportData && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tax Report for {taxYear}</h3>
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div>
              <h4 className="font-medium mb-2">Expenses by Category</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(categoryTotals.entries()).map(([categoryId, data]) => (
                    <TableRow key={categoryId}>
                      <TableCell>Category {categoryId.substring(0, 8)}</TableCell>
                      <TableCell>{data.count}</TableCell>
                      <TableCell className="text-right">
                        R {data.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Total Expenses</TableCell>
                    <TableCell>{reportData.expenses.length}</TableCell>
                    <TableCell className="text-right">R {totalExpenses.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {reportData.depreciation.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Depreciation</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead className="text-right">Current Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.depreciation.map((dep) => (
                      <TableRow key={dep.id}>
                        <TableCell>{dep.assetName}</TableCell>
                        <TableCell className="text-right">
                          R {parseFloat(dep.currentValue).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>Total Depreciation</TableCell>
                      <TableCell className="text-right">
                        R {totalDepreciation.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

