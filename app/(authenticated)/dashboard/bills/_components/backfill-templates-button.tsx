"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"

interface BackfillTemplatesButtonProps {
  propertyId?: string
}

export function BackfillTemplatesButton({ propertyId }: BackfillTemplatesButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleBackfill = async () => {
    setLoading(true)
    try {
      const url = propertyId 
        ? `/api/bills/backfill-templates?propertyId=${propertyId}`
        : "/api/bills/backfill-templates"
      
      const response = await fetch(url, {
        method: "POST"
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(
          `Backfill completed: ${data.data.updatedCount} bills linked to templates out of ${data.data.totalProcessed} processed`
        )
      } else {
        toast.error(data.error || "Failed to backfill template links")
      }
    } catch (error) {
      console.error("Error running backfill:", error)
      toast.error("Failed to run backfill")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Running..." : "Backfill Template Links"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Backfill Bill Template Links</AlertDialogTitle>
          <AlertDialogDescription>
            This will attempt to link all processed bills that don't have template IDs to their appropriate bill templates.
            {propertyId ? (
              <span className="block mt-2 font-medium">Only bills for this property will be processed.</span>
            ) : (
              <span className="block mt-2 font-medium text-yellow-600">All bills across all properties will be processed.</span>
            )}
            <span className="block mt-2">This action may take a few moments depending on the number of bills.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleBackfill} disabled={loading}>
            {loading ? "Running..." : "Run Backfill"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

