"use client"

import type { SelectBillingSchedule } from "@/db/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, FileText, Receipt, CreditCard, Info } from "lucide-react"

interface WorkflowDAGProps {
  propertyId: string
  schedules: SelectBillingSchedule[]
}

export function WorkflowDAG({ schedules }: WorkflowDAGProps) {
  // Group schedules by type
  const billInputSchedules = schedules.filter((s) => s.scheduleType === "bill_input")
  const invoiceOutputSchedules = schedules.filter((s) => s.scheduleType === "invoice_output")
  const payableOutputSchedules = schedules.filter((s) => s.scheduleType === "payable_output")

  const invoiceSchedule = invoiceOutputSchedules[0]
  const payableSchedule = payableOutputSchedules[0]

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">Billing Flow</h3>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          <span className="capitalize">
            {billInputSchedules.length > 0
              ? `${billInputSchedules.map((s) => s.billType).join(", ")} Bills`
              : "Bills"}
          </span>
        </div>
        <ArrowRight className="h-3 w-3" />
        <div className="flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5" />
          <span>{invoiceSchedule ? "Invoices" : "Invoices (not configured)"}</span>
        </div>
        <span className="text-muted-foreground/50">+</span>
        <div className="flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5" />
          <span>{payableSchedule ? "Payables" : "Payables (not configured)"}</span>
        </div>
        {invoiceSchedule?.waitForBills || payableSchedule?.waitForBills ? (
          <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">⏳</span>
        ) : null}
      </div>
    </div>
  )
}

