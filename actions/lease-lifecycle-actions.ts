"use server"

import { db } from "@/db"
import { leaseAgreementsTable, type SelectLeaseAgreement } from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

export async function updateLeaseLifecycleStateAction(
  leaseAgreementId: string,
  lifecycleState: "waiting" | "signed" | "moving_in_pending" | "active" | "escalation_due" | "moving_out_pending" | "completed"
): Promise<ActionState<SelectLeaseAgreement>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [updatedLease] = await db
      .update(leaseAgreementsTable)
      .set({
        lifecycleState,
        updatedAt: new Date()
      })
      .where(eq(leaseAgreementsTable.id, leaseAgreementId))
      .returning()

    if (!updatedLease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    return {
      isSuccess: true,
      message: "Lease lifecycle state updated successfully",
      data: updatedLease
    }
  } catch (error) {
    console.error("Error updating lease lifecycle state:", error)
    return { isSuccess: false, message: "Failed to update lease lifecycle state" }
  }
}

export async function getLeaseLifecycleStatusAction(
  leaseAgreementId: string
): Promise<ActionState<SelectLeaseAgreement>> {
  try {
    const lease = await db.query.leaseAgreements.findFirst({
      where: eq(leaseAgreementsTable.id, leaseAgreementId)
    })

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    return {
      isSuccess: true,
      message: "Lease lifecycle status retrieved successfully",
      data: lease
    }
  } catch (error) {
    console.error("Error getting lease lifecycle status:", error)
    return { isSuccess: false, message: "Failed to get lease lifecycle status" }
  }
}

export async function transitionToNextStateAction(
  leaseAgreementId: string
): Promise<ActionState<SelectLeaseAgreement>> {
  try {
    const lease = await db.query.leaseAgreements.findFirst({
      where: eq(leaseAgreementsTable.id, leaseAgreementId)
    })

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    const stateTransitions: Record<string, string> = {
      waiting: "signed",
      signed: "moving_in_pending",
      moving_in_pending: "active",
      active: "escalation_due",
      escalation_due: "moving_out_pending",
      moving_out_pending: "completed"
    }

    const nextState = stateTransitions[lease.lifecycleState] || lease.lifecycleState

    const [updatedLease] = await db
      .update(leaseAgreementsTable)
      .set({
        lifecycleState: nextState as any,
        updatedAt: new Date()
      })
      .where(eq(leaseAgreementsTable.id, leaseAgreementId))
      .returning()

    if (!updatedLease) {
      return { isSuccess: false, message: "Failed to transition lease state" }
    }

    return {
      isSuccess: true,
      message: "Lease state transitioned successfully",
      data: updatedLease
    }
  } catch (error) {
    console.error("Error transitioning lease state:", error)
    return { isSuccess: false, message: "Failed to transition lease state" }
  }
}

