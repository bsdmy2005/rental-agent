"use server"

import { db } from "@/db"
import {
  leaseAgreementsTable,
  movingInspectionsTable,
  leaseEscalationsTable,
  type SelectLeaseAgreement,
  type SelectMovingInspection,
  type SelectLeaseEscalation
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

export async function signLeaseAgreementAction(
  leaseAgreementId: string,
  signerType: "tenant" | "landlord",
  signatureData: Record<string, unknown>
): Promise<ActionState<SelectLeaseAgreement>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const lease = await db.query.leaseAgreements.findFirst({
      where: eq(leaseAgreementsTable.id, leaseAgreementId)
    })

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    const updateData: Partial<typeof lease> = {}
    if (signerType === "tenant") {
      updateData.signedByTenant = true
      updateData.tenantSignatureData = signatureData as any
    } else {
      updateData.signedByLandlord = true
      updateData.landlordSignatureData = signatureData as any
    }

    // If both parties have signed, set signedAt and update lifecycle state
    const bothSigned =
      (signerType === "tenant" && lease.signedByLandlord) ||
      (signerType === "landlord" && lease.signedByTenant)

    if (bothSigned) {
      updateData.signedAt = new Date()
      updateData.lifecycleState = "signed"
    }

    const [updatedLease] = await db
      .update(leaseAgreementsTable)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(leaseAgreementsTable.id, leaseAgreementId))
      .returning()

    if (!updatedLease) {
      return { isSuccess: false, message: "Failed to sign lease agreement" }
    }

    return {
      isSuccess: true,
      message: "Lease agreement signed successfully",
      data: updatedLease
    }
  } catch (error) {
    console.error("Error signing lease agreement:", error)
    return { isSuccess: false, message: "Failed to sign lease agreement" }
  }
}

export async function signMovingInspectionAction(
  inspectionId: string,
  signerType: "tenant" | "landlord",
  signatureData: Record<string, unknown>
): Promise<ActionState<SelectMovingInspection>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const inspection = await db.query.movingInspections.findFirst({
      where: eq(movingInspectionsTable.id, inspectionId)
    })

    if (!inspection) {
      return { isSuccess: false, message: "Moving inspection not found" }
    }

    const updateData: Partial<typeof inspection> = {}
    if (signerType === "tenant") {
      updateData.signedByTenant = true
      updateData.tenantSignatureData = signatureData as any
    } else {
      updateData.signedByLandlord = true
      updateData.landlordSignatureData = signatureData as any
    }

    // If both parties have signed, set signedAt
    const bothSigned =
      (signerType === "tenant" && inspection.signedByLandlord) ||
      (signerType === "landlord" && inspection.signedByTenant)

    if (bothSigned) {
      updateData.signedAt = new Date()
      updateData.status = "signed"
    }

    const [updatedInspection] = await db
      .update(movingInspectionsTable)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(movingInspectionsTable.id, inspectionId))
      .returning()

    if (!updatedInspection) {
      return { isSuccess: false, message: "Failed to sign moving inspection" }
    }

    return {
      isSuccess: true,
      message: "Moving inspection signed successfully",
      data: updatedInspection
    }
  } catch (error) {
    console.error("Error signing moving inspection:", error)
    return { isSuccess: false, message: "Failed to sign moving inspection" }
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

    const updateData: Partial<typeof escalation> = {}
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

export async function verifySignatureAction(
  documentType: "lease" | "inspection" | "escalation",
  documentId: string
): Promise<ActionState<{ hasTenantSignature: boolean; hasLandlordSignature: boolean; isFullySigned: boolean }>> {
  try {
    let hasTenantSignature = false
    let hasLandlordSignature = false

    if (documentType === "lease") {
      const lease = await db.query.leaseAgreements.findFirst({
        where: eq(leaseAgreementsTable.id, documentId)
      })
      if (lease) {
        hasTenantSignature = lease.signedByTenant
        hasLandlordSignature = lease.signedByLandlord
      }
    } else if (documentType === "inspection") {
      const inspection = await db.query.movingInspections.findFirst({
        where: eq(movingInspectionsTable.id, documentId)
      })
      if (inspection) {
        hasTenantSignature = inspection.signedByTenant
        hasLandlordSignature = inspection.signedByLandlord
      }
    } else if (documentType === "escalation") {
      const escalation = await db.query.leaseEscalations.findFirst({
        where: eq(leaseEscalationsTable.id, documentId)
      })
      if (escalation) {
        hasTenantSignature = escalation.signedByTenant
        hasLandlordSignature = escalation.signedByLandlord
      }
    }

    return {
      isSuccess: true,
      message: "Signature verification completed",
      data: {
        hasTenantSignature,
        hasLandlordSignature,
        isFullySigned: hasTenantSignature && hasLandlordSignature
      }
    }
  } catch (error) {
    console.error("Error verifying signature:", error)
    return { isSuccess: false, message: "Failed to verify signature" }
  }
}

