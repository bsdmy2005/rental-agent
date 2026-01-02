"use server"

import { db } from "@/db"
import {
  agencyMembershipsTable,
  rentalAgentsTable,
  type InsertAgencyMembership,
  type SelectAgencyMembership
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"

export async function requestAgencyMembershipAction(
  rentalAgentId: string,
  agencyId: string,
  requestedBy: string
): Promise<ActionState<SelectAgencyMembership>> {
  try {
    // Check if membership already exists
    const existing = await db
      .select()
      .from(agencyMembershipsTable)
      .where(
        and(
          eq(agencyMembershipsTable.rentalAgentId, rentalAgentId),
          eq(agencyMembershipsTable.agencyId, agencyId)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      const membership = existing[0]
      if (membership.status === "pending") {
        return {
          isSuccess: false,
          message: "Membership request already pending"
        }
      }
      if (membership.status === "approved") {
        return {
          isSuccess: false,
          message: "Agent is already a member of this agency"
        }
      }
    }

    const [newMembership] = await db
      .insert(agencyMembershipsTable)
      .values({
        rentalAgentId,
        agencyId,
        requestedBy,
        status: "pending"
      })
      .returning()

    if (!newMembership) {
      return { isSuccess: false, message: "Failed to create membership request" }
    }

    return {
      isSuccess: true,
      message: "Membership request created successfully",
      data: newMembership
    }
  } catch (error) {
    console.error("Error requesting agency membership:", error)
    return { isSuccess: false, message: "Failed to request agency membership" }
  }
}

export async function approveAgencyMembershipAction(
  membershipId: string,
  approvedBy: string
): Promise<ActionState<SelectAgencyMembership>> {
  try {
    const [membership] = await db
      .select()
      .from(agencyMembershipsTable)
      .where(eq(agencyMembershipsTable.id, membershipId))
      .limit(1)

    if (!membership) {
      return { isSuccess: false, message: "Membership request not found" }
    }

    if (membership.status !== "pending") {
      return {
        isSuccess: false,
        message: `Membership request is already ${membership.status}`
      }
    }

    const [updatedMembership] = await db
      .update(agencyMembershipsTable)
      .set({
        status: "approved",
        approvedBy,
        approvedAt: new Date()
      })
      .where(eq(agencyMembershipsTable.id, membershipId))
      .returning()

    if (!updatedMembership) {
      return { isSuccess: false, message: "Failed to approve membership" }
    }

    // Update rental agent's agencyId for quick lookup
    await db
      .update(rentalAgentsTable)
      .set({ agencyId: membership.agencyId })
      .where(eq(rentalAgentsTable.id, membership.rentalAgentId))

    return {
      isSuccess: true,
      message: "Membership approved successfully",
      data: updatedMembership
    }
  } catch (error) {
    console.error("Error approving agency membership:", error)
    return { isSuccess: false, message: "Failed to approve agency membership" }
  }
}

export async function rejectAgencyMembershipAction(
  membershipId: string,
  rejectedBy: string,
  reason?: string
): Promise<ActionState<SelectAgencyMembership>> {
  try {
    const [membership] = await db
      .select()
      .from(agencyMembershipsTable)
      .where(eq(agencyMembershipsTable.id, membershipId))
      .limit(1)

    if (!membership) {
      return { isSuccess: false, message: "Membership request not found" }
    }

    if (membership.status !== "pending") {
      return {
        isSuccess: false,
        message: `Membership request is already ${membership.status}`
      }
    }

    const [updatedMembership] = await db
      .update(agencyMembershipsTable)
      .set({
        status: "rejected",
        rejectedBy,
        rejectionReason: reason || null
      })
      .where(eq(agencyMembershipsTable.id, membershipId))
      .returning()

    if (!updatedMembership) {
      return { isSuccess: false, message: "Failed to reject membership" }
    }

    return {
      isSuccess: true,
      message: "Membership rejected successfully",
      data: updatedMembership
    }
  } catch (error) {
    console.error("Error rejecting agency membership:", error)
    return { isSuccess: false, message: "Failed to reject agency membership" }
  }
}

export async function removeAgencyMemberAction(
  membershipId: string,
  removedBy: string
): Promise<ActionState<SelectAgencyMembership>> {
  try {
    const [membership] = await db
      .select()
      .from(agencyMembershipsTable)
      .where(eq(agencyMembershipsTable.id, membershipId))
      .limit(1)

    if (!membership) {
      return { isSuccess: false, message: "Membership not found" }
    }

    const [updatedMembership] = await db
      .update(agencyMembershipsTable)
      .set({
        status: "removed"
      })
      .where(eq(agencyMembershipsTable.id, membershipId))
      .returning()

    if (!updatedMembership) {
      return { isSuccess: false, message: "Failed to remove member" }
    }

    // Clear agencyId from rental agent
    await db
      .update(rentalAgentsTable)
      .set({ agencyId: null })
      .where(eq(rentalAgentsTable.id, membership.rentalAgentId))

    return {
      isSuccess: true,
      message: "Member removed successfully",
      data: updatedMembership
    }
  } catch (error) {
    console.error("Error removing agency member:", error)
    return { isSuccess: false, message: "Failed to remove agency member" }
  }
}

export async function getPendingMembershipRequestsAction(
  agencyId?: string
): Promise<ActionState<SelectAgencyMembership[]>> {
  try {
    const conditions = [eq(agencyMembershipsTable.status, "pending")]
    if (agencyId) {
      conditions.push(eq(agencyMembershipsTable.agencyId, agencyId))
    }

    const requests = await db
      .select()
      .from(agencyMembershipsTable)
      .where(and(...conditions))

    return {
      isSuccess: true,
      message: "Pending membership requests retrieved successfully",
      data: requests
    }
  } catch (error) {
    console.error("Error getting pending membership requests:", error)
    return {
      isSuccess: false,
      message: "Failed to get pending membership requests"
    }
  }
}

export async function requestAgencyMembershipWithAuthAction(
  rentalAgentId: string,
  agencyId: string
): Promise<ActionState<SelectAgencyMembership>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "You must be logged in" }
    }

    const userProfile = await getUserProfileByClerkIdQuery(userId)
    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    return await requestAgencyMembershipAction(
      rentalAgentId,
      agencyId,
      userProfile.id
    )
  } catch (error) {
    console.error("Error requesting agency membership with auth:", error)
    return { isSuccess: false, message: "Failed to request agency membership" }
  }
}

export async function approveAgencyMembershipWithAuthAction(
  membershipId: string
): Promise<ActionState<SelectAgencyMembership>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "You must be logged in" }
    }

    const userProfile = await getUserProfileByClerkIdQuery(userId)
    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    return await approveAgencyMembershipAction(membershipId, userProfile.id)
  } catch (error) {
    console.error("Error approving agency membership with auth:", error)
    return { isSuccess: false, message: "Failed to approve agency membership" }
  }
}

export async function rejectAgencyMembershipWithAuthAction(
  membershipId: string,
  reason?: string
): Promise<ActionState<SelectAgencyMembership>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "You must be logged in" }
    }

    const userProfile = await getUserProfileByClerkIdQuery(userId)
    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    return await rejectAgencyMembershipAction(membershipId, userProfile.id, reason)
  } catch (error) {
    console.error("Error rejecting agency membership with auth:", error)
    return { isSuccess: false, message: "Failed to reject agency membership" }
  }
}

