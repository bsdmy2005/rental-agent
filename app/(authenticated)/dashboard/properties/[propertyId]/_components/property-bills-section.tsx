"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { SelectBill } from "@/db/schema"

interface PropertyBillsSectionProps {
  bills: SelectBill[]
  billsByType: {
    municipality: SelectBill[]
    levy: SelectBill[]
    utility: SelectBill[]
    other: SelectBill[]
  }
}

export function PropertyBillsSection({ bills, billsByType }: PropertyBillsSectionProps) {
  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-muted-foreground text-sm">No bills found for this property.</p>
        <Link href="/dashboard/bills" className="text-primary hover:underline text-sm mt-2">
          Upload a bill →
        </Link>
      </div>
    )
  }

  const billTypes = [
    { key: "municipality", label: "Municipality Bills" },
    { key: "levy", label: "Levy Bills" },
    { key: "utility", label: "Utility Bills" },
    { key: "other", label: "Other Bills" }
  ] as const

  return (
    <div className="space-y-4">
      {billTypes.map(({ key, label }) => {
        const typeBills = billsByType[key]
        if (typeBills.length === 0) return null

        return (
          <div key={key}>
            <h4 className="font-medium text-sm mb-2">{label} ({typeBills.length})</h4>
            <div className="space-y-2">
              {typeBills.map((bill) => (
                <Link
                  key={bill.id}
                  href={`/dashboard/bills/${bill.id}`}
                  className="flex items-center justify-between rounded-md border p-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{bill.fileName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          bill.status === "processed"
                            ? "default"
                            : bill.status === "error"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {bill.status}
                      </Badge>
                      {!!bill.invoiceExtractionData && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                          Invoice ✓
                        </Badge>
                      )}
                      {!!bill.paymentExtractionData && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                          Payment ✓
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

