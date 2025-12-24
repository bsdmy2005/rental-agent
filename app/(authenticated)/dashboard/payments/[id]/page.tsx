import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getPayableInstanceWithDetailsQuery } from "@/queries/payable-instances-queries"
import { PaymentDetailView } from "./_components/payment-detail-view"
import { PaymentDetailSkeleton } from "./_components/payment-detail-skeleton"

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payable = await getPayableInstanceWithDetailsQuery(id)

  if (!payable) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Details</h1>
          <p className="text-muted-foreground mt-2">
            {payable.templateName} - {payable.propertyName}
          </p>
        </div>
      </div>

      <Suspense fallback={<PaymentDetailSkeleton />}>
        <PaymentDetailView payable={payable} />
      </Suspense>
    </div>
  )
}

