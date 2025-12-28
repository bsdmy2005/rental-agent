"use server"

import { notFound, redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getExpenseByIdWithCategoryQuery } from "@/queries/expenses-queries"
import { ExpenseForm } from "../../_components/expense-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function EditExpensePage({
  params
}: {
  params: Promise<{ propertyId: string; expenseId: string }>
}) {
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    redirect("/onboarding")
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/properties/${propertyId}/expenses/${expenseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Expense</h1>
      </div>
      <ExpenseForm
        propertyId={propertyId}
        paidBy={expense.paidBy || userProfile.id}
        expenseId={expenseId}
        initialData={{
          categoryId: expense.categoryId,
          amount: expense.amount,
          description: expense.description,
          expenseDate: new Date(expense.expenseDate).toISOString().split("T")[0],
          paymentMethod: expense.paymentMethod || undefined,
          isTaxDeductible: expense.isTaxDeductible,
          taxYear: expense.taxYear || undefined
        }}
      />
    </div>
  )
}

