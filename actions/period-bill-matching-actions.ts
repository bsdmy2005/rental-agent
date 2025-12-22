"use server"

import { manuallyMatchBillToPeriod } from "@/lib/period-bill-matcher"
import { ActionState } from "@/types"

export async function manuallyMatchBillToPeriodAction(
  billId: string,
  periodId: string,
  userId: string
): Promise<ActionState<void>> {
  try {
    const { getUserProfileByClerkIdQuery } = await import("@/queries/user-profiles-queries")
    const userProfile = await getUserProfileByClerkIdQuery(userId)
    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    await manuallyMatchBillToPeriod(billId, periodId, userProfile.id)

    return {
      isSuccess: true,
      message: "Bill matched to period successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error manually matching bill to period:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to match bill to period"
    }
  }
}

