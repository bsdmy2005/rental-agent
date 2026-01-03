"use server"

import { db } from "@/db"
import {
  leaseEscalationsTable,
  type InsertLeaseEscalation,
  type SelectLeaseEscalation
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, gte, lte } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

export async function createLeaseEscalationAction(
  escalation: InsertLeaseEscalation
): Promise<ActionState<SelectLeaseEscalation>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [newEscalation] = await db
      .insert(leaseEscalationsTable)
      .values(escalation)
      .returning()

    if (!newEscalation) {
      return { isSuccess: false, message: "Failed to create lease escalation" }
    }

    return {
      isSuccess: true,
      message: "Lease escalation created successfully",
      data: newEscalation
    }
  } catch (error) {
    console.error("Error creating lease escalation:", error)
    return { isSuccess: false, message: "Failed to create lease escalation" }
  }
}

export async function getLeaseEscalationsAction(
  leaseAgreementId: string
): Promise<ActionState<SelectLeaseEscalation[]>> {
  try {
    const escalations = await db.query.leaseEscalations.findMany({
      where: eq(leaseEscalationsTable.leaseAgreementId, leaseAgreementId),
      orderBy: (escalations, { desc }) => [desc(escalations.escalationDate)]
    })

    return {
      isSuccess: true,
      message: "Lease escalations retrieved successfully",
      data: escalations
    }
  } catch (error) {
    console.error("Error getting lease escalations:", error)
    return { isSuccess: false, message: "Failed to get lease escalations" }
  }
}

export async function getUpcomingEscalationsAction(
  daysAhead: number = 30
): Promise<ActionState<SelectLeaseEscalation[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead)

    const escalations = await db.query.leaseEscalations.findMany({
      where: and(
        gte(leaseEscalationsTable.escalationDate, new Date()),
        lte(leaseEscalationsTable.escalationDate, cutoffDate)
      ),
      orderBy: (escalations, { asc }) => [asc(escalations.escalationDate)]
    })

    return {
      isSuccess: true,
      message: "Upcoming escalations retrieved successfully",
      data: escalations
    }
  } catch (error) {
    console.error("Error getting upcoming escalations:", error)
    return { isSuccess: false, message: "Failed to get upcoming escalations" }
  }
}

export async function signEscalationAction(
  escalationId: string,
  signerType: "tenant" | "landlord",
  signatureData: Record<string, unknown>
): Promise<ActionState<SelectLeaseEscalation>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const escalation = await db.query.leaseEscalations.findFirst({
      where: eq(leaseEscalationsTable.id, escalationId)
    })

    if (!escalation) {
      return { isSuccess: false, message: "Escalation not found" }
    }

    const updateData: Partial<InsertLeaseEscalation> = {}
    if (signerType === "tenant") {
      updateData.signedByTenant = true
      updateData.tenantSignatureData = signatureData as any
    } else {
      updateData.signedByLandlord = true
      updateData.landlordSignatureData = signatureData as any
    }

    // If both parties have signed, set signedAt
    const bothSigned =
      (signerType === "tenant" && escalation.signedByLandlord) ||
      (signerType === "landlord" && escalation.signedByTenant)

    if (bothSigned) {
      updateData.signedAt = new Date()
    }

    const [updatedEscalation] = await db
      .update(leaseEscalationsTable)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(leaseEscalationsTable.id, escalationId))
      .returning()

    if (!updatedEscalation) {
      return { isSuccess: false, message: "Failed to sign escalation" }
    }

    return {
      isSuccess: true,
      message: "Escalation signed successfully",
      data: updatedEscalation
    }
  } catch (error) {
    console.error("Error signing escalation:", error)
    return { isSuccess: false, message: "Failed to sign escalation" }
  }
}

export async function uploadEscalationDocumentAction(
  escalationId: string,
  fileUrl: string,
  fileName: string
): Promise<ActionState<SelectLeaseEscalation>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [updatedEscalation] = await db
      .update(leaseEscalationsTable)
      .set({
        documentFileUrl: fileUrl,
        documentFileName: fileName,
        updatedAt: new Date()
      })
      .where(eq(leaseEscalationsTable.id, escalationId))
      .returning()

    if (!updatedEscalation) {
      return { isSuccess: false, message: "Escalation not found" }
    }

    return {
      isSuccess: true,
      message: "Escalation document uploaded successfully",
      data: updatedEscalation
    }
  } catch (error) {
    console.error("Error uploading escalation document:", error)
    return { isSuccess: false, message: "Failed to upload escalation document" }
  }
}

