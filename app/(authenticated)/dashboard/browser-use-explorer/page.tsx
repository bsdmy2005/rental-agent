"use server"

import { BrowserUseExplorerConsole } from "./_components/browser-use-explorer-console"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function BrowserUseExplorerPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Browser Use Explorer</h1>
          <p className="text-muted-foreground mt-2">
            Explore and test Browser Use Cloud API capabilities. This is a development/testing
            tool for experimenting with different Browser Use features including File Output,
            Structured Output, Session Management, and real-world PDF extraction scenarios.
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Development Tool</AlertTitle>
        <AlertDescription>
          This page is for testing and exploring Browser Use Cloud API capabilities. Your API key
          is never stored and is only used for the current session. Use this tool to compare
          different approaches (File Output vs Structured Output) and test real-world scenarios.
        </AlertDescription>
      </Alert>

      <BrowserUseExplorerConsole />
    </div>
  )
}

