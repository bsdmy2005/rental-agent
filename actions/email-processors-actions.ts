"use server"

import { db } from "@/db"
import {
  emailProcessorsTable,
  type InsertEmailProcessor,
  type SelectEmailProcessor
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export interface PostmarkWebhookPayload {
  MessageID: string
  From: string
  Subject?: string
  ReceivedAt: string
  Attachments?: Array<{
    Name: string
    Content: string
    ContentType: string
  }>
}

export async function createEmailProcessorAction(
  processor: InsertEmailProcessor
): Promise<ActionState<SelectEmailProcessor>> {
  try {
    const [newProcessor] = await db.insert(emailProcessorsTable).values(processor).returning()

    if (!newProcessor) {
      return { isSuccess: false, message: "Failed to create email processor" }
    }

    return {
      isSuccess: true,
      message: "Email processor created successfully",
      data: newProcessor
    }
  } catch (error) {
    console.error("Error creating email processor:", error)
    return { isSuccess: false, message: "Failed to create email processor" }
  }
}

export async function updateEmailProcessorAction(
  processorId: string,
  data: Partial<InsertEmailProcessor>
): Promise<ActionState<SelectEmailProcessor>> {
  try {
    const [updatedProcessor] = await db
      .update(emailProcessorsTable)
      .set(data)
      .where(eq(emailProcessorsTable.id, processorId))
      .returning()

    if (!updatedProcessor) {
      return { isSuccess: false, message: "Email processor not found" }
    }

    return {
      isSuccess: true,
      message: "Email processor updated successfully",
      data: updatedProcessor
    }
  } catch (error) {
    console.error("Error updating email processor:", error)
    return { isSuccess: false, message: "Failed to update email processor" }
  }
}

export async function processEmailWebhookAction(
  payload: PostmarkWebhookPayload
): Promise<ActionState<void>> {
  try {
    // TODO: Implement email processing logic
    // This will extract PDFs, match to rules, create bills, etc.
    // For now, just acknowledge receipt

    return {
      isSuccess: true,
      message: "Email webhook processed successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error processing email webhook:", error)
    return { isSuccess: false, message: "Failed to process email webhook" }
  }
}

