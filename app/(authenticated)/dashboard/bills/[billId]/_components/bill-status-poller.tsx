"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface BillStatusPollerProps {
  billId: string
  initialStatus: "pending" | "processing" | "processed" | "error"
  children: React.ReactNode
}

export function BillStatusPoller({
  billId,
  initialStatus,
  children
}: BillStatusPollerProps) {
  const router = useRouter()
  const [isPolling, setIsPolling] = useState(
    initialStatus === "pending" || initialStatus === "processing"
  )

  useEffect(() => {
    // Only poll if bill is pending or processing
    if (initialStatus !== "pending" && initialStatus !== "processing") {
      setIsPolling(false)
      return
    }

    // Poll every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/bills/${billId}/status`)
        if (response.ok) {
          const data = await response.json()
          if (data.status === "processed" || data.status === "error") {
            // Status changed, stop polling and refresh the page
            clearInterval(pollInterval)
            setIsPolling(false)
            router.refresh()
          }
        }
      } catch (error) {
        console.error("Error polling bill status:", error)
        // Continue polling even if there's an error
      }
    }, 2000) // Poll every 2 seconds

    // Cleanup interval on unmount
    return () => {
      clearInterval(pollInterval)
    }
  }, [billId, initialStatus, router])

  return (
    <>
      {isPolling && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing Bill
            </CardTitle>
            <CardDescription>
              Extracting data from your bill. This may take a few moments...
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      {children}
    </>
  )
}

