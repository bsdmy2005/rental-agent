"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { updateIncidentStatusAction } from "@/actions/incidents-actions"
import { toast } from "sonner"
import { Loader2, CheckCircle } from "lucide-react"

interface CloseIncidentButtonProps {
  incidentId: string
  currentStatus: string
  hasApprovedQuotes: boolean
  userProfileId: string
}

export function CloseIncidentButton({
  incidentId,
  currentStatus,
  hasApprovedQuotes,
  userProfileId
}: CloseIncidentButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClose() {
    setLoading(true)
    try {
      const result = await updateIncidentStatusAction(incidentId, "closed", userProfileId, "Incident closed")
      if (result.isSuccess) {
        toast.success("Incident closed successfully")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error closing incident:", error)
      toast.error("Failed to close incident")
    } finally {
      setLoading(false)
    }
  }

  // Only show close button if incident is resolved or has approved/completed quotes
  if (currentStatus === "closed") {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <CheckCircle className="h-4 w-4" />
        <span>Incident is closed</span>
      </div>
    )
  }

  if (currentStatus !== "resolved" && !hasApprovedQuotes) {
    return (
      <p className="text-sm text-muted-foreground">
        Close incident after resolving or approving a quote
      </p>
    )
  }

  return (
    <Button onClick={handleClose} disabled={loading} variant="default">
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Closing...
        </>
      ) : (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Close Incident
        </>
      )}
    </Button>
  )
}

