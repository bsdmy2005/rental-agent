"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { deleteServiceProviderAction } from "@/actions/service-providers-actions"
import { toast } from "sonner"
import { Loader2, Trash2 } from "lucide-react"

interface DeleteServiceProviderButtonProps {
  providerId: string
  providerName: string
}

export function DeleteServiceProviderButton({
  providerId,
  providerName
}: DeleteServiceProviderButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const result = await deleteServiceProviderAction(providerId)
      if (result.isSuccess) {
        toast.success("Service provider deleted successfully")
        router.push("/dashboard/service-providers")
      } else {
        toast.error(result.message)
        setOpen(false)
      }
    } catch (error) {
      console.error("Error deleting service provider:", error)
      toast.error("Failed to delete service provider")
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Service Provider</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{providerName}</strong>? This action cannot be
            undone. The service provider will be removed from your directory.
            <br />
            <br />
            <strong>Note:</strong> This action cannot be performed if the service provider has
            active quote requests. Please resolve or cancel active quotes first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

