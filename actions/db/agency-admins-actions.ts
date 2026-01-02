"use server"

import { db } from "@/db"
import {
  agencyAdminsTable,
  type InsertAgencyAdmin,
  type SelectAgencyAdmin
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and } from "drizzle-orm"

export async function addAgencyAdminAction(
  agencyId: string,
  userProfileId: string,
  role: "owner" | "admin",
  addedBy: string
): Promise<ActionState<SelectAgencyAdmin>> {
  try {
    // Verify that addedBy is the owner (only owners can add admins)
    const [ownerCheck] = await db
      .select()
      .from(agencyAdminsTable)
      .where(
        and(
          eq(agencyAdminsTable.agencyId, agencyId),
          eq(agencyAdminsTable.userProfileId, addedBy),
          eq(agencyAdminsTable.role, "owner")
        )
      )
      .limit(1)

    if (!ownerCheck) {
      return {
        isSuccess: false,
        message: "Only agency owners can add admins"
      }
    }

    // Check if admin already exists
    const [existing] = await db
      .select()
      .from(agencyAdminsTable)
      .where(
        and(
          eq(agencyAdminsTable.agencyId, agencyId),
          eq(agencyAdminsTable.userProfileId, userProfileId)
        )
      )
      .limit(1)

    if (existing) {
      return {
        isSuccess: false,
        message: "User is already an admin of this agency"
      }
    }

    const [newAdmin] = await db
      .insert(agencyAdminsTable)
      .values({
        agencyId,
        userProfileId,
        role
      })
      .returning()

    if (!newAdmin) {
      return { isSuccess: false, message: "Failed to add agency admin" }
    }

    return {
      isSuccess: true,
      message: "Agency admin added successfully",
      data: newAdmin
    }
  } catch (error) {
    console.error("Error adding agency admin:", error)
    return { isSuccess: false, message: "Failed to add agency admin" }
  }
}

export async function removeAgencyAdminAction(
  agencyId: string,
  userProfileId: string,
  removedBy: string
): Promise<ActionState<void>> {
  try {
    // Verify that removedBy is the owner (only owners can remove admins)
    const [ownerCheck] = await db
      .select()
      .from(agencyAdminsTable)
      .where(
        and(
          eq(agencyAdminsTable.agencyId, agencyId),
          eq(agencyAdminsTable.userProfileId, removedBy),
          eq(agencyAdminsTable.role, "owner")
        )
      )
      .limit(1)

    if (!ownerCheck) {
      return {
        isSuccess: false,
        message: "Only agency owners can remove admins"
      }
    }

    // Prevent removing the owner
    const [adminToRemove] = await db
      .select()
      .from(agencyAdminsTable)
      .where(
        and(
          eq(agencyAdminsTable.agencyId, agencyId),
          eq(agencyAdminsTable.userProfileId, userProfileId)
        )
      )
      .limit(1)

    if (!adminToRemove) {
      return { isSuccess: false, message: "Admin not found" }
    }

    if (adminToRemove.role === "owner") {
      return {
        isSuccess: false,
        message: "Cannot remove the agency owner"
      }
    }

    await db
      .delete(agencyAdminsTable)
      .where(
        and(
          eq(agencyAdminsTable.agencyId, agencyId),
          eq(agencyAdminsTable.userProfileId, userProfileId)
        )
      )

    return {
      isSuccess: true,
      message: "Agency admin removed successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error removing agency admin:", error)
    return { isSuccess: false, message: "Failed to remove agency admin" }
  }
}

export async function getAgencyAdminsAction(
  agencyId: string
): Promise<ActionState<SelectAgencyAdmin[]>> {
  try {
    const admins = await db
      .select()
      .from(agencyAdminsTable)
      .where(eq(agencyAdminsTable.agencyId, agencyId))

    return {
      isSuccess: true,
      message: "Agency admins retrieved successfully",
      data: admins
    }
  } catch (error) {
    console.error("Error getting agency admins:", error)
    return { isSuccess: false, message: "Failed to get agency admins" }
  }
}

