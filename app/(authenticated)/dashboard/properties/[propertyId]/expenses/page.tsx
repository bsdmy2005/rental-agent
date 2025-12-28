"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getExpensesByPropertyIdWithCategoryQuery } from "@/queries/expenses-queries"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpensesList } from "./_components/expenses-list"
import { DepreciationCalculator } from "./_components/depreciation-calculator"
import { TaxReportGenerator } from "./_components/tax-report-generator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function PropertyExpensesPage({
  params
}: {
  params: Promise<{ propertyId: string }>
}) {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const { propertyId } = await params
  const property = await getPropertyByIdQuery(propertyId)

  if (!property) {
    notFound()
  }

  const expenses = await getExpensesByPropertyIdWithCategoryQuery(propertyId)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/properties/${propertyId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Expenses</h1>
            <p className="text-muted-foreground">{property.name}</p>
          </div>
        </div>
        <Link href={`/dashboard/properties/${propertyId}/expenses/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
          <TabsTrigger value="tax-report">Tax Report</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Property Expenses</CardTitle>
              <CardDescription>Track expenses for tax purposes</CardDescription>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
                <ExpensesList expenses={expenses} propertyId={propertyId} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No expenses recorded yet. Add your first expense to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciation">
          <DepreciationCalculator propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="tax-report">
          <TaxReportGenerator propertyId={propertyId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

