"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getPaymentInstructionByPropertyAction } from "@/actions/payment-instructions-actions"
import { PaymentInstructionsForm } from "./_components/payment-instructions-form"

export default async function PaymentInstructionsPage({
  params
}: {
  params: Promise<{ propertyId: string }>
}) {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const { propertyId } = await params
  const property = await getPropertyByIdQuery(propertyId)

  if (!property) {
    notFound()
  }

  // Get existing payment instruction if any
  const paymentInstructionResult = await getPaymentInstructionByPropertyAction(propertyId)
  const existingInstruction = paymentInstructionResult.isSuccess ? paymentInstructionResult.data : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Instructions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure payment provider credentials for {property.name}
        </p>
      </div>

      <PaymentInstructionsForm propertyId={propertyId} existingInstruction={existingInstruction} />
    </div>
  )
}

