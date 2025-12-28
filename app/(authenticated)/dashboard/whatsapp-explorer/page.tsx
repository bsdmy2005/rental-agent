"use server"

import { WhatsAppExplorerConsole } from "./_components/whatsapp-explorer-console"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function WhatsAppExplorerPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Explorer</h1>
          <p className="text-muted-foreground mt-2">
            Explore and test WhatsApp integration using Baileys. Connect your WhatsApp account,
            send and receive messages, and experiment with AI-powered auto-responses.
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Development Tool</AlertTitle>
        <AlertDescription>
          This page is for testing and exploring WhatsApp Baileys integration. Your credentials
          are only used for the current session. Make sure the Baileys server is running on port 3001.
          Run <code className="bg-muted px-1 rounded">npm run dev</code> in the whatsapp-baileys-server folder.
        </AlertDescription>
      </Alert>

      <WhatsAppExplorerConsole />
    </div>
  )
}
