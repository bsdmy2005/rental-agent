"use client"

import { useMemo } from "react"
import { PaymentsTable } from "./payments-table"
import type { PayableInstanceWithDetails } from "@/queries/payable-instances-queries"

interface PaymentsInProgressTabProps {
  payables: PayableInstanceWithDetails[]
  properties: Array<{ id: string; name: string }>
}

export function PaymentsInProgressTab({ payables, properties }: PaymentsInProgressTabProps) {
  // Filter: Has payment with status "pending" or "processing"
  const inProgressPayables = useMemo(() => {
    return payables.filter(
      (payable) =>
        payable.latestPayment &&
        (payable.latestPayment.status === "pending" ||
          payable.latestPayment.status === "processing")
    )
  }, [payables])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">In Progress</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {inProgressPayables.length} payment{inProgressPayables.length !== 1 ? "s" : ""} in
            progress
          </p>
        </div>
      </div>

      <PaymentsTable payables={inProgressPayables} properties={properties} />
    </div>
  )
}

