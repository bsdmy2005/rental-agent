"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { deleteBillAction } from "@/actions/bills-actions"
import { toast } from "sonner"

interface BillActionsProps {
  billId: string
  billName: string
}

export function BillActions({ billId, billName }: BillActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${billName}"? This will permanently delete the bill and its PDF file. This action cannot be undone.`
      )
    ) {
      return
    }

    setLoading(true)
    try {
      const result = await deleteBillAction(billId)
      if (result.isSuccess) {
        toast.success("Bill deleted successfully!")
        router.push("/dashboard/bills")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to delete bill")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={loading}
      title="Delete Bill"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}

