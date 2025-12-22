"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function DeleteAllBillingPeriodsButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/dev/delete-all-billing-periods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(`Successfully deleted ${data.deletedCount} billing periods`)
        setOpen(false)
        router.refresh()
      } else {
        toast.error(data.error || "Failed to delete billing periods")
      }
    } catch (error) {
      console.error("Error deleting billing periods:", error)
      toast.error("Failed to delete billing periods")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={loading}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete All Billing Periods
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete All Billing Periods?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete ALL billing periods from the entire system, including:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>All invoice periods</li>
              <li>All payable periods</li>
              <li>All period-bill matches (cascade delete)</li>
            </ul>
            <strong className="block mt-4 text-destructive">
              This action cannot be undone!
            </strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete All"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

