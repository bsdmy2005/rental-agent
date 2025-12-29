"use server"

import { db } from "@/db"
import { whatsappConversationStatesTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"
import type {
  InsertWhatsappConversationState,
  SelectWhatsappConversationState
} from "@/db/schema"

const STATE_EXPIRY_MINUTES = 30

/**
 * Calculate the expiry time for conversation state.
 * Default expiry is 30 minutes from now.
 * @returns Date object representing the expiry time
 */
function getExpiryTime(): Date {
  return new Date(Date.now() + STATE_EXPIRY_MINUTES * 60 * 1000)
}

/**
 * Get or create conversation state for a phone number.
 * If an existing state is found but expired, it will be reset to idle.
 * If an existing state is found and valid, its expiry will be extended.
 * If no state exists, a new one will be created in idle state.
 *
 * @param phoneNumber - The phone number to get/create state for
 * @param sessionId - Optional session ID to associate with the state
 * @returns ActionState with the conversation state data
 */
export async function getOrCreateConversationStateAction(
  phoneNumber: string,
  sessionId?: string
): Promise<ActionState<SelectWhatsappConversationState>> {
  try {
    // Try to find existing state
    const [existing] = await db
      .select()
      .from(whatsappConversationStatesTable)
      .where(eq(whatsappConversationStatesTable.phoneNumber, phoneNumber))
      .limit(1)

    if (existing) {
      // Check if expired
      if (new Date(existing.expiresAt) < new Date()) {
        // Reset to idle
        const [updated] = await db
          .update(whatsappConversationStatesTable)
          .set({
            state: "idle",
            incidentId: null,
            context: null,
            expiresAt: getExpiryTime()
          })
          .where(eq(whatsappConversationStatesTable.id, existing.id))
          .returning()

        return {
          isSuccess: true,
          message: "Conversation state reset (expired)",
          data: updated
        }
      }

      // Extend expiry
      const [updated] = await db
        .update(whatsappConversationStatesTable)
        .set({ expiresAt: getExpiryTime() })
        .where(eq(whatsappConversationStatesTable.id, existing.id))
        .returning()

      return {
        isSuccess: true,
        message: "Conversation state retrieved",
        data: updated
      }
    }

    // Create new state
    const [newState] = await db
      .insert(whatsappConversationStatesTable)
      .values({
        phoneNumber,
        sessionId,
        state: "idle",
        expiresAt: getExpiryTime()
      })
      .returning()

    return {
      isSuccess: true,
      message: "Conversation state created",
      data: newState
    }
  } catch (error) {
    console.error("Error getting/creating conversation state:", error)
    return {
      isSuccess: false,
      message: "Failed to get/create conversation state"
    }
  }
}

/**
 * Update conversation state for a phone number.
 * Automatically extends the expiry time on each update.
 *
 * @param phoneNumber - The phone number whose state to update
 * @param updates - Partial state updates to apply
 * @returns ActionState with the updated conversation state
 */
export async function updateConversationStateAction(
  phoneNumber: string,
  updates: Partial<InsertWhatsappConversationState>
): Promise<ActionState<SelectWhatsappConversationState>> {
  try {
    const [updated] = await db
      .update(whatsappConversationStatesTable)
      .set({
        ...updates,
        expiresAt: getExpiryTime()
      })
      .where(eq(whatsappConversationStatesTable.phoneNumber, phoneNumber))
      .returning()

    if (!updated) {
      return {
        isSuccess: false,
        message: "Conversation state not found"
      }
    }

    return {
      isSuccess: true,
      message: "Conversation state updated",
      data: updated
    }
  } catch (error) {
    console.error("Error updating conversation state:", error)
    return {
      isSuccess: false,
      message: "Failed to update conversation state"
    }
  }
}

/**
 * Reset conversation state to idle for a phone number.
 * Clears the incident ID and context, and extends expiry.
 *
 * @param phoneNumber - The phone number whose state to reset
 * @returns ActionState indicating success or failure
 */
export async function resetConversationStateAction(
  phoneNumber: string
): Promise<ActionState<void>> {
  try {
    await db
      .update(whatsappConversationStatesTable)
      .set({
        state: "idle",
        incidentId: null,
        context: null,
        expiresAt: getExpiryTime()
      })
      .where(eq(whatsappConversationStatesTable.phoneNumber, phoneNumber))

    return {
      isSuccess: true,
      message: "Conversation state reset",
      data: undefined
    }
  } catch (error) {
    console.error("Error resetting conversation state:", error)
    return {
      isSuccess: false,
      message: "Failed to reset conversation state"
    }
  }
}
