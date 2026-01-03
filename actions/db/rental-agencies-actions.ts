"use server"

import { db } from "@/db"
import {
  rentalAgenciesTable,
  agencyAdminsTable,
  type InsertRentalAgency,
  type SelectRentalAgency
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"

export async function createRentalAgencyAction(
  data: Omit<InsertRentalAgency, "id" | "createdAt" | "updatedAt" | "ownerUserProfileId">,
  ownerUserProfileId: string
): Promise<ActionState<SelectRentalAgency>> {
  try {
    const [newAgency] = await db
      .insert(rentalAgenciesTable)
      .values({
        ...data,
        ownerUserProfileId
      })
      .returning()

    if (!newAgency) {
      return { isSuccess: false, message: "Failed to create rental agency" }
    }

    // Create agency admin record for the owner
    await db.insert(agencyAdminsTable).values({
      agencyId: newAgency.id,
      userProfileId: ownerUserProfileId,
      role: "owner"
    })

    return {
      isSuccess: true,
      message: "Rental agency created successfully",
      data: newAgency
    }
  } catch (error) {
    console.error("Error creating rental agency:", error)
    return { isSuccess: false, message: "Failed to create rental agency" }
  }
}

export async function updateRentalAgencyAction(
  agencyId: string,
  data: Partial<Omit<InsertRentalAgency, "id" | "createdAt" | "updatedAt" | "ownerUserProfileId">>
): Promise<ActionState<SelectRentalAgency>> {
  try {
    const [updatedAgency] = await db
      .update(rentalAgenciesTable)
      .set(data)
      .where(eq(rentalAgenciesTable.id, agencyId))
      .returning()

    if (!updatedAgency) {
      return { isSuccess: false, message: "Rental agency not found" }
    }

    return {
      isSuccess: true,
      message: "Rental agency updated successfully",
      data: updatedAgency
    }
  } catch (error) {
    console.error("Error updating rental agency:", error)
    return { isSuccess: false, message: "Failed to update rental agency" }
  }
}

export async function deleteRentalAgencyAction(
  agencyId: string
): Promise<ActionState<void>> {
  try {
    // Soft delete by setting isActive to false
    await db
      .update(rentalAgenciesTable)
      .set({ isActive: false })
      .where(eq(rentalAgenciesTable.id, agencyId))

    return {
      isSuccess: true,
      message: "Rental agency deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting rental agency:", error)
    return { isSuccess: false, message: "Failed to delete rental agency" }
  }
}

export async function getRentalAgenciesAction(): Promise<
  ActionState<SelectRentalAgency[]>
> {
  try {
    const agencies = await db
      .select()
      .from(rentalAgenciesTable)
      .where(eq(rentalAgenciesTable.isActive, true))

    return {
      isSuccess: true,
      message: "Rental agencies retrieved successfully",
      data: agencies
    }
  } catch (error) {
    console.error("Error getting rental agencies:", error)
    return { isSuccess: false, message: "Failed to get rental agencies" }
  }
}

export async function createRentalAgencyWithAuthAction(
  data: Omit<InsertRentalAgency, "id" | "createdAt" | "updatedAt" | "ownerUserProfileId">
): Promise<ActionState<SelectRentalAgency>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "You must be logged in" }
    }

    const userProfile = await getUserProfileByClerkIdQuery(userId)
    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    return await createRentalAgencyAction(data, userProfile.id)
  } catch (error) {
    console.error("Error creating rental agency with auth:", error)
    return { isSuccess: false, message: "Failed to create rental agency" }
  }
}

