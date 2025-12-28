"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesByRentalAgentIdQuery } from "@/queries/properties-queries"
import { getExpensesByPropertyIdsWithCategoryQuery } from "@/queries/expenses-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AllExpensesList } from "./_components/all-expenses-list"
import { AddExpenseDialog } from "./_components/add-expense-dialog"

export default async function AllExpensesPage() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  // Get user's properties
  let propertyIds: string[] = []
  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const properties = await getPropertiesByLandlordIdQuery(landlord.id)
      propertyIds = properties.map((p) => p.id)
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      const properties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
      propertyIds = properties.map((p) => p.id)
    }
  }

  // Get all expenses for user's properties
  const expenses = propertyIds.length > 0 
    ? await getExpensesByPropertyIdsWithCategoryQuery(propertyIds)
    : []

  // Get properties list for the dialog
  let properties: Array<{ id: string; name: string }> = []
  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      const agentProperties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
      properties = agentProperties.map((p) => ({ id: p.id, name: p.name }))
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Expenses</h1>
          <p className="text-muted-foreground">Track expenses across all your properties</p>
        </div>
        {properties.length > 0 && (
          <AddExpenseDialog properties={properties} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expenses by Property</CardTitle>
          <CardDescription>
            {expenses.length > 0 
              ? `Viewing ${expenses.length} expense${expenses.length !== 1 ? "s" : ""} across ${new Set(expenses.map(e => e.propertyId)).size} propert${new Set(expenses.map(e => e.propertyId)).size !== 1 ? "ies" : "y"}`
              : "No expenses found. Add expenses from property detail pages."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <AllExpensesList expenses={expenses} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {propertyIds.length === 0 
                ? "No properties found. Add properties to start tracking expenses."
                : "No expenses recorded yet. Add your first expense from a property detail page."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

