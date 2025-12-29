"use server"

import { db } from "@/db"
import { whatsappExplorerMessagesTable } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { ActionState } from "@/types"

/**
 * Valid message classifications
 */
export type MessageClassification =
  | "incident_report"
  | "follow_up"
  | "closure_confirmation"
  | "general"

/**
 * Link a WhatsApp message to an incident
 * Called when user confirms which incident a message belongs to
 */
export async function linkMessageToIncidentAction(
  messageId: string,
  incidentId: string,
  classification: MessageClassification
): Promise<ActionState<void>> {
  try {
    await db
      .update(whatsappExplorerMessagesTable)
      .set({
        incidentId,
        messageClassification: classification,
        classifiedAt: new Date()
      })
      .where(eq(whatsappExplorerMessagesTable.id, messageId))

    return {
      isSuccess: true,
      message: "Message linked to incident"
    }
  } catch (error) {
    console.error("Error linking message to incident:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to link message"
    }
  }
}

/**
 * Mark a message as general (not linked to any incident)
 */
export async function markMessageAsGeneralAction(
  messageId: string
): Promise<ActionState<void>> {
  try {
    await db
      .update(whatsappExplorerMessagesTable)
      .set({
        incidentId: null,
        messageClassification: "general",
        classifiedAt: new Date()
      })
      .where(eq(whatsappExplorerMessagesTable.id, messageId))

    return {
      isSuccess: true,
      message: "Message marked as general"
    }
  } catch (error) {
    console.error("Error marking message as general:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to mark message"
    }
  }
}

/**
 * Get the database ID of a message by its WhatsApp message ID
 */
export async function getMessageDbIdAction(
  whatsappMessageId: string,
  sessionId: string
): Promise<ActionState<string>> {
  try {
    const [message] = await db
      .select({ id: whatsappExplorerMessagesTable.id })
      .from(whatsappExplorerMessagesTable)
      .where(
        and(
          eq(whatsappExplorerMessagesTable.messageId, whatsappMessageId),
          eq(whatsappExplorerMessagesTable.sessionId, sessionId)
        )
      )
      .limit(1)

    if (!message) {
      return {
        isSuccess: false,
        message: "Message not found"
      }
    }

    return {
      isSuccess: true,
      message: "Message found",
      data: message.id
    }
  } catch (error) {
    console.error("Error getting message DB ID:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get message"
    }
  }
}
