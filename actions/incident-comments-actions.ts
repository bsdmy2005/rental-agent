"use server"

import { db } from "@/db"
import { incidentCommentsTable } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import type { ActionState } from "@/types"
import type {
  InsertIncidentComment,
  SelectIncidentComment
} from "@/db/schema/incident-comments"

/**
 * Add a comment to an incident.
 *
 * @param comment - The comment data to insert
 * @returns ActionState with the created comment or error message
 */
export async function addIncidentCommentAction(
  comment: InsertIncidentComment
): Promise<ActionState<SelectIncidentComment>> {
  try {
    const [newComment] = await db
      .insert(incidentCommentsTable)
      .values(comment)
      .returning()

    if (!newComment) {
      return { isSuccess: false, message: "Failed to add comment" }
    }

    return {
      isSuccess: true,
      message: "Comment added successfully",
      data: newComment
    }
  } catch (error) {
    console.error("Error adding comment:", error)
    return { isSuccess: false, message: "Failed to add comment" }
  }
}

/**
 * Get all comments for a specific incident.
 *
 * @param incidentId - The ID of the incident to get comments for
 * @returns ActionState with array of comments ordered by creation date (newest first)
 */
export async function getIncidentCommentsAction(
  incidentId: string
): Promise<ActionState<SelectIncidentComment[]>> {
  try {
    const comments = await db
      .select()
      .from(incidentCommentsTable)
      .where(eq(incidentCommentsTable.incidentId, incidentId))
      .orderBy(desc(incidentCommentsTable.createdAt))

    return {
      isSuccess: true,
      message: "Comments retrieved",
      data: comments
    }
  } catch (error) {
    console.error("Error getting comments:", error)
    return { isSuccess: false, message: "Failed to get comments" }
  }
}

/**
 * Add a comment from a WhatsApp message.
 * This is a convenience function that sets the author type to "tenant"
 * and uses the phone number as the identifier.
 *
 * @param incidentId - The ID of the incident to add the comment to
 * @param phoneNumber - The WhatsApp phone number of the commenter
 * @param content - The content of the comment
 * @param tenantName - Optional name of the tenant
 * @returns ActionState with the created comment or error message
 */
export async function addWhatsAppCommentAction(
  incidentId: string,
  phoneNumber: string,
  content: string,
  tenantName?: string
): Promise<ActionState<SelectIncidentComment>> {
  return addIncidentCommentAction({
    incidentId,
    authorType: "tenant",
    authorPhone: phoneNumber,
    authorName: tenantName,
    content
  })
}
