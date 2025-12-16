"use server"

import { db } from "@/db"
import {
  userProfilesTable,
  type InsertUserProfile,
  type SelectUserProfile
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export interface UserProfileData {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
}

export async function createUserProfileAction(
  clerkUserId: string,
  userType: "landlord" | "rental_agent" | "tenant" | "admin",
  data: UserProfileData
): Promise<ActionState<SelectUserProfile>> {
  try {
    const [newUserProfile] = await db
      .insert(userProfilesTable)
      .values({
        clerkUserId,
        userType,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone
      })
      .returning()

    if (!newUserProfile) {
      return { isSuccess: false, message: "Failed to create user profile" }
    }

    return {
      isSuccess: true,
      message: "User profile created successfully",
      data: newUserProfile
    }
  } catch (error) {
    console.error("Error creating user profile:", error)
    return { isSuccess: false, message: "Failed to create user profile" }
  }
}

export async function updateUserProfileAction(
  userProfileId: string,
  data: Partial<InsertUserProfile>
): Promise<ActionState<SelectUserProfile>> {
  try {
    const [updatedUserProfile] = await db
      .update(userProfilesTable)
      .set(data)
      .where(eq(userProfilesTable.id, userProfileId))
      .returning()

    if (!updatedUserProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    return {
      isSuccess: true,
      message: "User profile updated successfully",
      data: updatedUserProfile
    }
  } catch (error) {
    console.error("Error updating user profile:", error)
    return { isSuccess: false, message: "Failed to update user profile" }
  }
}

export async function completeOnboardingAction(
  userProfileId: string
): Promise<ActionState<SelectUserProfile>> {
  try {
    const [updatedUserProfile] = await db
      .update(userProfilesTable)
      .set({ onboardingCompleted: true })
      .where(eq(userProfilesTable.id, userProfileId))
      .returning()

    if (!updatedUserProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    return {
      isSuccess: true,
      message: "Onboarding completed successfully",
      data: updatedUserProfile
    }
  } catch (error) {
    console.error("Error completing onboarding:", error)
    return { isSuccess: false, message: "Failed to complete onboarding" }
  }
}

export async function activateUserProfileAction(
  userProfileId: string
): Promise<ActionState<SelectUserProfile>> {
  try {
    const [updatedUserProfile] = await db
      .update(userProfilesTable)
      .set({ isActive: true })
      .where(eq(userProfilesTable.id, userProfileId))
      .returning()

    if (!updatedUserProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    return {
      isSuccess: true,
      message: "User profile activated successfully",
      data: updatedUserProfile
    }
  } catch (error) {
    console.error("Error activating user profile:", error)
    return { isSuccess: false, message: "Failed to activate user profile" }
  }
}

export async function deactivateUserProfileAction(
  userProfileId: string
): Promise<ActionState<SelectUserProfile>> {
  try {
    const [updatedUserProfile] = await db
      .update(userProfilesTable)
      .set({ isActive: false })
      .where(eq(userProfilesTable.id, userProfileId))
      .returning()

    if (!updatedUserProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    return {
      isSuccess: true,
      message: "User profile deactivated successfully",
      data: updatedUserProfile
    }
  } catch (error) {
    console.error("Error deactivating user profile:", error)
    return { isSuccess: false, message: "Failed to deactivate user profile" }
  }
}

