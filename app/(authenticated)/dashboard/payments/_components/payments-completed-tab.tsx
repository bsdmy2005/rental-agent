"use client"

import { useMemo } from "react"
import { PaymentsTable } from "./payments-table"
import type { PayableInstanceWithDetails } from "@/queries/payable-instances-queries"

interface PaymentsCompletedTabProps {
  payables: PayableInstanceWithDetails[]
  properties: Array<{ id: string; name: string }>
}

export function PaymentsCompletedTab({ payables, properties }: PaymentsCompletedTabProps) {
  // Filter: Show payables that have been paid
  // Criteria:
  // 1. Payable status is "paid"
  // 2. OR has ANY payment record (payment was attempted, regardless of status)
  const completedPayables = useMemo(() => {
    const filtered = payables.filter((payable) => {
      // If status is "paid", definitely include it
      if (payable.status === "paid") {
        return true
      }
      
      // If there's ANY payment record, include it (payment was attempted)
      if (payable.latestPayment) {
        return true
      }
      
      return false
    })
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("[PaymentsCompletedTab] Total payables:", payables.length)
      console.log("[PaymentsCompletedTab] Filtered completed:", filtered.length)
      console.log("[PaymentsCompletedTab] Payables with status 'paid':", payables.filter(p => p.status === "paid").length)
      console.log("[PaymentsCompletedTab] Payables with latestPayment:", payables.filter(p => p.latestPayment !== null).length)
      console.log("[PaymentsCompletedTab] Sample payables:", payables.slice(0, 3).map(p => ({
        id: p.id,
        status: p.status,
        hasPayment: !!p.latestPayment,
        paymentStatus: p.latestPayment?.status
      })))
    }
    
    return filtered
  }, [payables])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Completed</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {completedPayables.length} completed payment{completedPayables.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {completedPayables.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p>No completed payments yet.</p>
        </div>
      ) : (
        <PaymentsTable payables={completedPayables} properties={properties} />
      )}
    </div>
  )
}

