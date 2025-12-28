"use server"

import { db } from "@/db"
import {
  extractionJobsTable,
  type InsertExtractionJob,
  type SelectExtractionJob
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function createExtractionJobAction(
  job: InsertExtractionJob
): Promise<ActionState<SelectExtractionJob>> {
  try {
    const [newJob] = await db.insert(extractionJobsTable).values(job).returning()

    if (!newJob) {
      return { isSuccess: false, message: "Failed to create extraction job" }
    }

    return {
      isSuccess: true,
      message: "Extraction job created successfully",
      data: newJob
    }
  } catch (error) {
    console.error("Error creating extraction job:", error)
    return { isSuccess: false, message: "Failed to create extraction job" }
  }
}

export async function updateExtractionJobAction(
  jobId: string,
  data: Partial<InsertExtractionJob>
): Promise<ActionState<SelectExtractionJob>> {
  try {
    const [updatedJob] = await db
      .update(extractionJobsTable)
      .set(data)
      .where(eq(extractionJobsTable.id, jobId))
      .returning()

    if (!updatedJob) {
      return { isSuccess: false, message: "Extraction job not found" }
    }

    return {
      isSuccess: true,
      message: "Extraction job updated successfully",
      data: updatedJob
    }
  } catch (error) {
    console.error("Error updating extraction job:", error)
    return { isSuccess: false, message: "Failed to update extraction job" }
  }
}

export async function addTraceToExtractionJob(
  jobId: string,
  step: string,
  data?: unknown
): Promise<void> {
  try {
    const job = await db
      .select()
      .from(extractionJobsTable)
      .where(eq(extractionJobsTable.id, jobId))
      .limit(1)
      .then((jobs) => jobs[0] || null)

    if (!job) {
      console.warn(`[Extraction Job] Job ${jobId} not found for trace update`)
      return
    }

    const currentTrace = (job.trace as Array<{ step: string; timestamp: Date; data?: unknown }>) || []
    const newTrace = [
      ...currentTrace,
      {
        step,
        timestamp: new Date(),
        data
      }
    ]

    await db
      .update(extractionJobsTable)
      .set({ trace: newTrace })
      .where(eq(extractionJobsTable.id, jobId))
  } catch (error) {
    console.error(`[Extraction Job] Error adding trace to job ${jobId}:`, error)
  }
}

