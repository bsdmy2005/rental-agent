"use server"

import { currentUser } from "@clerk/nextjs/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteAllBillingPeriodsButton } from "./_components/delete-all-billing-periods-button"
import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function DevToolsPage() {
  const user = await currentUser()
  
  if (!user) {
    return <div>Not authenticated</div>
  }

  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This page is only available in development mode.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Development Tools</h1>
        <p className="text-muted-foreground mt-2">
          Utility tools for development and testing. These tools are only available in development mode.
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          These tools will permanently delete data. Use with caution!
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Billing Periods</CardTitle>
          <CardDescription>
            Delete all billing periods from the entire system. This will also delete all period-bill matches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAllBillingPeriodsButton />
        </CardContent>
      </Card>
    </div>
  )
}

