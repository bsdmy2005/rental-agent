"use server"

import { getAgencyMembersQuery } from "@/queries/rental-agencies-queries"
import { ActionState } from "@/types"
import type { SelectAgencyMembership } from "@/db/schema"
import type { SelectRentalAgent } from "@/db/schema"
import type { SelectUserProfile } from "@/db/schema"

export interface AgencyMemberWithDetails extends SelectAgencyMembership {
  rentalAgent: SelectRentalAgent & { userProfile: SelectUserProfile }
}

export async function getAgencyMembersAction(
  agencyId: string,
  status?: "pending" | "approved" | "rejected" | "removed"
): Promise<ActionState<AgencyMemberWithDetails[]>> {
  try {
    const members = await getAgencyMembersQuery(agencyId, status)
    return {
      isSuccess: true,
      message: "Agency members retrieved successfully",
      data: members
    }
  } catch (error) {
    console.error("Error getting agency members:", error)
    return { isSuccess: false, message: "Failed to get agency members" }
  }
}

