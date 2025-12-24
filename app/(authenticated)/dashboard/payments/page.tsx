import { Suspense } from "react"
import { PaymentsList } from "./_components/payments-list"
import { PaymentsListSkeleton } from "./_components/payments-list-skeleton"

export default async function PaymentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground mt-2">
            Manage and execute payments for your properties.
          </p>
        </div>
      </div>

      <div>
        <Suspense fallback={<PaymentsListSkeleton />}>
          <PaymentsList />
        </Suspense>
      </div>
    </div>
  )
}

