"use server"

import { db } from "@/db"
import {
  propertyManagementsTable,
  type InsertPropertyManagement,
  type SelectPropertyManagement
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, inArray } from "drizzle-orm"
import { getUserAgencies } from "@/lib/agency-access"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"

export async function assignRentalAgentToPropertyAction(
  propertyId: string,
  rentalAgentId: string,
  managementData: Partial<InsertPropertyManagement>
): Promise<ActionState<SelectPropertyManagement>> {
  try {
    // Ensure agencyId is null when assigning to individual agent
    const [newManagement] = await db
      .insert(propertyManagementsTable)
      .values({
        propertyId,
        rentalAgentId,
        agencyId: null,
        ...managementData
      })
      .returning()

    if (!newManagement) {
      return { isSuccess: false, message: "Failed to assign rental agent to property" }
    }

    return {
      isSuccess: true,
      message: "Rental agent assigned to property successfully",
      data: newManagement
    }
  } catch (error) {
    console.error("Error assigning rental agent to property:", error)
    return { isSuccess: false, message: "Failed to assign rental agent to property" }
  }
}

export async function assignAgencyToPropertyAction(
  propertyId: string,
  agencyId: string,
  managementData: Partial<InsertPropertyManagement>
): Promise<ActionState<SelectPropertyManagement>> {
  try {
    // Ensure rentalAgentId is null when assigning to agency
    const [newManagement] = await db
      .insert(propertyManagementsTable)
      .values({
        propertyId,
        agencyId,
        rentalAgentId: null,
        ...managementData
      })
      .returning()

    if (!newManagement) {
      return { isSuccess: false, message: "Failed to assign agency to property" }
    }

    return {
      isSuccess: true,
      message: "Agency assigned to property successfully",
      data: newManagement
    }
  } catch (error) {
    console.error("Error assigning agency to property:", error)
    return { isSuccess: false, message: "Failed to assign agency to property" }
  }
}

export async function updatePropertyManagementAction(
  managementId: string,
  data: Partial<InsertPropertyManagement>
): Promise<ActionState<SelectPropertyManagement>> {
  try {
    const [updatedManagement] = await db
      .update(propertyManagementsTable)
      .set(data)
      .where(eq(propertyManagementsTable.id, managementId))
      .returning()

    if (!updatedManagement) {
      return { isSuccess: false, message: "Property management not found" }
    }

    return {
      isSuccess: true,
      message: "Property management updated successfully",
      data: updatedManagement
    }
  } catch (error) {
    console.error("Error updating property management:", error)
    return { isSuccess: false, message: "Failed to update property management" }
  }
}

export async function removeRentalAgentFromPropertyAction(
  propertyId: string,
  rentalAgentId: string
): Promise<ActionState<void>> {
  try {
    await db
      .delete(propertyManagementsTable)
      .where(
        and(
          eq(propertyManagementsTable.propertyId, propertyId),
          eq(propertyManagementsTable.rentalAgentId, rentalAgentId)
        )
      )

    return {
      isSuccess: true,
      message: "Rental agent removed from property successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error removing rental agent from property:", error)
    return { isSuccess: false, message: "Failed to remove rental agent from property" }
  }
}

export async function removeAgencyFromPropertyAction(
  propertyId: string,
  agencyId: string
): Promise<ActionState<void>> {
  try {
    await db
      .delete(propertyManagementsTable)
      .where(
        and(
          eq(propertyManagementsTable.propertyId, propertyId),
          eq(propertyManagementsTable.agencyId, agencyId)
        )
      )

    return {
      isSuccess: true,
      message: "Agency removed from property successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error removing agency from property:", error)
    return { isSuccess: false, message: "Failed to remove agency from property" }
  }
}

export async function deactivatePropertyManagementAction(
  managementId: string
): Promise<ActionState<SelectPropertyManagement>> {
  try {
    const [updatedManagement] = await db
      .update(propertyManagementsTable)
      .set({ isActive: false })
      .where(eq(propertyManagementsTable.id, managementId))
      .returning()

    if (!updatedManagement) {
      return { isSuccess: false, message: "Property management not found" }
    }

    return {
      isSuccess: true,
      message: "Property management deactivated successfully",
      data: updatedManagement
    }
  } catch (error) {
    console.error("Error deactivating property management:", error)
    return { isSuccess: false, message: "Failed to deactivate property management" }
  }
}

export async function bulkAssignPropertiesToAgentAction(
  propertyIds: string[],
  rentalAgentId: string,
  managementData: Partial<InsertPropertyManagement>
): Promise<ActionState<SelectPropertyManagement[]>> {
  try {
    if (propertyIds.length === 0) {
      return { isSuccess: false, message: "No properties selected" }
    }

    const managements = await Promise.all(
      propertyIds.map(async (propertyId) => {
        // Check if assignment already exists
        const [existing] = await db
          .select()
          .from(propertyManagementsTable)
          .where(
            and(
              eq(propertyManagementsTable.propertyId, propertyId),
              eq(propertyManagementsTable.rentalAgentId, rentalAgentId)
            )
          )
          .limit(1)

        if (existing) {
          // Update existing if inactive
          if (!existing.isActive) {
            const [updated] = await db
              .update(propertyManagementsTable)
              .set({ isActive: true, ...managementData })
              .where(eq(propertyManagementsTable.id, existing.id))
              .returning()
            return updated
          }
          return existing
        }

        // Create new assignment
        const [newManagement] = await db
          .insert(propertyManagementsTable)
          .values({
            propertyId,
            rentalAgentId,
            agencyId: null,
            ...managementData
          })
          .returning()

        return newManagement
      })
    )

    return {
      isSuccess: true,
      message: `${managements.length} properties assigned successfully`,
      data: managements.filter((m): m is SelectPropertyManagement => m !== undefined)
    }
  } catch (error) {
    console.error("Error bulk assigning properties to agent:", error)
    return { isSuccess: false, message: "Failed to assign properties" }
  }
}

export async function bulkDeassignPropertiesFromAgentAction(
  propertyIds: string[],
  rentalAgentId: string
): Promise<ActionState<void>> {
  try {
    if (propertyIds.length === 0) {
      return { isSuccess: false, message: "No properties selected" }
    }

    await db
      .delete(propertyManagementsTable)
      .where(
        and(
          eq(propertyManagementsTable.rentalAgentId, rentalAgentId),
          inArray(propertyManagementsTable.propertyId, propertyIds)
        )
      )

    return {
      isSuccess: true,
      message: `${propertyIds.length} properties deassigned successfully`,
      data: undefined
    }
  } catch (error) {
    console.error("Error bulk deassigning properties from agent:", error)
    return { isSuccess: false, message: "Failed to deassign properties" }
  }
}

/**
 * Server action wrapper that gets current user and auto-assigns property
 * This can be called from client components
 */
export async function autoAssignPropertyToAgencyOrAgentForCurrentUserAction(
  propertyId: string
): Promise<ActionState<SelectPropertyManagement | null>> {
  try {
    const { currentUser } = await import("@clerk/nextjs/server")
    const { getUserProfileByClerkIdQuery } = await import("@/queries/user-profiles-queries")

    const user = await currentUser()
    if (!user) {
      return {
        isSuccess: false,
        message: "User not authenticated"
      }
    }

    const userProfile = await getUserProfileByClerkIdQuery(user.id)
    if (!userProfile) {
      return {
        isSuccess: false,
        message: "User profile not found"
      }
    }

    return await autoAssignPropertyToAgencyOrAgentAction(propertyId, userProfile.id)
  } catch (error) {
    console.error("Error auto-assigning property for current user:", error)
    return {
      isSuccess: false,
      message: "Failed to auto-assign property"
    }
  }
}

/**
 * Automatically assign a property to an agency or agent based on the creator's role
 * Rules:
 * - Agency Owners/Admins: Assign to agency
 * - Rental Agents: Assign individually to agent (even if they belong to an agency)
 */
export async function autoAssignPropertyToAgencyOrAgentAction(
  propertyId: string,
  userProfileId: string
): Promise<ActionState<SelectPropertyManagement | null>> {
  try {
    // Step 1: Check if user is an agency owner/admin
    const userAgencies = await getUserAgencies(userProfileId)
    const ownerOrAdminAgency = userAgencies.find(
      (agency) => agency.role === "owner" || agency.role === "admin"
    )

    if (ownerOrAdminAgency) {
      // Agency owners/admins: assign to agency
      const result = await assignAgencyToPropertyAction(propertyId, ownerOrAdminAgency.agencyId, {
        isActive: true
      })
      if (result.isSuccess && result.data) {
        return {
          isSuccess: true,
          message: "Property assigned to agency successfully",
          data: result.data
        }
      }
      // If assignment failed, continue to check other options
    }

    // Step 2: Check if user is a rental agent
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfileId)
    if (rentalAgent) {
      // Rental agents: assign individually to agent (NOT to agency)
      // This ensures agents can see properties they create, but not all agency properties
      const result = await assignRentalAgentToPropertyAction(propertyId, rentalAgent.id, {
        isActive: true
      })
      if (result.isSuccess && result.data) {
        return {
          isSuccess: true,
          message: "Property assigned to rental agent successfully",
          data: result.data
        }
      }
    }

    // No assignment made (e.g., landlord created the property)
    return {
      isSuccess: true,
      message: "Property created without automatic assignment",
      data: null
    }
  } catch (error) {
    console.error("Error auto-assigning property:", error)
    return {
      isSuccess: false,
      message: "Failed to auto-assign property"
    }
  }
}

