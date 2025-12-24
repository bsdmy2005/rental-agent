"use server"

import { InvestecExplorerConsole } from "./_components/investec-explorer-console"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function InvestecExplorerPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investec API Explorer</h1>
          <p className="text-muted-foreground mt-2">
            Explore and test Investec Open Banking API endpoints. This is a development/testing
            tool and will eventually be integrated into the payables payment execution flow.
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Development Tool</AlertTitle>
        <AlertDescription>
          This page is for testing and exploring Investec API capabilities. Credentials are not
          stored and are only used for the current session. Payment execution will transfer real
          money - use with caution.
        </AlertDescription>
      </Alert>

      <InvestecExplorerConsole />
    </div>
  )
}

