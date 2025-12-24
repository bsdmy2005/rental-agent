"use client"

import { useMemo, useState } from "react"
import { PaymentsTable } from "./payments-table"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { refreshAllPayableInstancesForPropertyAction } from "@/actions/payable-instances-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { PayableInstanceWithDetails } from "@/queries/payable-instances-queries"

interface PaymentsReadyTabProps {
  payables: PayableInstanceWithDetails[]
  properties: Array<{ id: string; name: string }>
}

export function PaymentsReadyTab({ payables, properties }: PaymentsReadyTabProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  
  // Filter: status === "ready" (show all ready instances regardless of payment setup)
  const readyPayables = useMemo(() => {
    return payables.filter((payable) => payable.status === "ready")
  }, [payables])

  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      const propertyIds = [...new Set(properties.map((p) => p.id))]
      let totalUpdated = 0
      let totalRepaired = 0

      for (const propertyId of propertyIds) {
        const result = await refreshAllPayableInstancesForPropertyAction(propertyId)
        if (result.isSuccess && result.data) {
          totalUpdated += result.data.updated
          totalRepaired += result.data.repaired || 0
        }
      }

      if (totalUpdated > 0) {
        const message = totalRepaired > 0
          ? `Refreshed ${totalUpdated} payable instance(s), repaired ${totalRepaired} with re-discovered bills`
          : `Refreshed ${totalUpdated} payable instance(s)`
        toast.success(message)
        router.refresh()
      } else {
        toast.info("All payable instances are already up to date")
      }
    } catch (error) {
      toast.error("Failed to refresh payable instances")
      console.error("Error refreshing payable instances:", error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Ready to Pay</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {readyPayables.length} payable{readyPayables.length !== 1 ? "s" : ""} ready for payment
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh All Data
        </Button>
      </div>

      <PaymentsTable payables={readyPayables} properties={properties} />
    </div>
  )
}

