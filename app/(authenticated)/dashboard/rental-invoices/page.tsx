"use server"

import { Suspense } from "react"
import { RentalInvoicesList } from "./_components/rental-invoices-list"
import { RentalInvoicesListSkeleton } from "./_components/rental-invoices-list-skeleton"

export default async function RentalInvoicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rental Invoices</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all rental invoices generated for your properties.
          </p>
        </div>
      </div>

      <div>
        <Suspense fallback={<RentalInvoicesListSkeleton />}>
          <RentalInvoicesList />
        </Suspense>
      </div>
    </div>
  )
}

