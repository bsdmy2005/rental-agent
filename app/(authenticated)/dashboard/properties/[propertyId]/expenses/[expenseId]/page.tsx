"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getExpenseByIdWithCategoryQuery } from "@/queries/expenses-queries"
import { getExpenseAttachmentsByExpenseIdAction } from "@/actions/expenses-actions"
import Link from "next/link"
import { ArrowLeft, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ExpenseAttachmentCard } from "./_components/expense-attachment-card"

export default async function ExpenseDetailPage({
  params
}: {
  params: Promise<{ propertyId: string; expenseId: string }>
}) {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const { propertyId, expenseId } = await params
  const property = await getPropertyByIdQuery(propertyId)

  if (!property) {
    notFound()
  }

  const expense = await getExpenseByIdWithCategoryQuery(expenseId)
  if (!expense) {
    notFound()
  }

  const attachmentsResult = await getExpenseAttachmentsByExpenseIdAction(expenseId)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/properties/${propertyId}/expenses`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Expense Details</h1>
            <p className="text-muted-foreground">{property.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/properties/${propertyId}/expenses/${expenseId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expense Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{expense.description}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold">R {parseFloat(expense.amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge>{expense.category.name}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p>{format(new Date(expense.expenseDate), "MMMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tax Year</p>
              <p>{expense.taxYear || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tax Deductible</p>
              <Badge variant={expense.isTaxDeductible ? "default" : "secondary"}>
                {expense.isTaxDeductible ? "Yes" : "No"}
              </Badge>
            </div>
            {expense.paymentMethod && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="capitalize">{expense.paymentMethod.replace("_", " ")}</p>
              </div>
            )}
            {expense.paidByUser && (
              <div>
                <p className="text-sm text-muted-foreground">Paid By</p>
                <p>
                  {expense.paidByUser.firstName} {expense.paidByUser.lastName}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receipts & Invoices</CardTitle>
            <CardDescription>Uploaded documents for this expense</CardDescription>
          </CardHeader>
          <CardContent>
            {attachmentsResult.isSuccess && attachmentsResult.data && attachmentsResult.data.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {attachmentsResult.data.map((attachment) => (
                  <ExpenseAttachmentCard key={attachment.id} attachment={attachment} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No attachments uploaded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

