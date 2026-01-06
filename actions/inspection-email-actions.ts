"use server"

import { db } from "@/db"
import { movingInspectionsTable, leaseAgreementsTable, tenantsTable } from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { getMovingInspectionAction } from "./moving-inspections-actions"
import crypto from "crypto"
import { getAppUrl } from "@/lib/utils/get-app-url"

export async function generateTenantAccessTokenAction(
  inspectionId: string
): Promise<ActionState<{ token: string; accessUrl: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex")

    // Update inspection with token
    const [updatedInspection] = await db
      .update(movingInspectionsTable)
      .set({
        tenantAccessToken: token,
        updatedAt: new Date()
      })
      .where(eq(movingInspectionsTable.id, inspectionId))
      .returning()

    if (!updatedInspection) {
      return { isSuccess: false, message: "Inspection not found" }
    }

    const accessUrl = `${getAppUrl()}/inspection/${token}`

    return {
      isSuccess: true,
      message: "Tenant access token generated successfully",
      data: { token, accessUrl }
    }
  } catch (error) {
    console.error("Error generating tenant access token:", error)
    return { isSuccess: false, message: "Failed to generate tenant access token" }
  }
}

export async function emailInspectionToTenantAction(
  inspectionId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const { sendInspectionToTenantAction } = await import("@/lib/email/moving-inspection-email-service")
    return await sendInspectionToTenantAction(inspectionId)
  } catch (error) {
    console.error("Error emailing inspection to tenant:", error)
    return { isSuccess: false, message: "Failed to email inspection to tenant" }
  }
}

export async function emailMoveOutReportToTenantAction(
  moveOutInspectionId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const { sendMoveOutReportToTenantAction } = await import("@/lib/email/moving-inspection-email-service")
    return await sendMoveOutReportToTenantAction(moveOutInspectionId)
  } catch (error) {
    console.error("Error emailing move-out report:", error)
    return { isSuccess: false, message: "Failed to email move-out report" }
  }
}

export async function generateInspectorAccessTokenAction(
  inspectionId: string
): Promise<ActionState<{ token: string; accessUrl: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex")

    // Update inspection with token
    const [updatedInspection] = await db
      .update(movingInspectionsTable)
      .set({
        inspectorAccessToken: token,
        inspectedByThirdParty: true,
        updatedAt: new Date()
      })
      .where(eq(movingInspectionsTable.id, inspectionId))
      .returning()

    if (!updatedInspection) {
      return { isSuccess: false, message: "Inspection not found" }
    }

    const accessUrl = `${getAppUrl()}/inspector/${token}`

    return {
      isSuccess: true,
      message: "Inspector access token generated successfully",
      data: { token, accessUrl }
    }
  } catch (error) {
    console.error("Error generating inspector access token:", error)
    return { isSuccess: false, message: "Failed to generate inspector access token" }
  }
}

export async function emailInspectionToInspectorAction(
  inspectionId: string,
  inspectorEmail: string,
  inspectorName: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const { sendInspectionToInspectorAction } = await import("@/lib/email/moving-inspection-email-service")
    return await sendInspectionToInspectorAction(inspectionId, inspectorEmail, inspectorName)
  } catch (error) {
    console.error("Error emailing inspection to inspector:", error)
    return { isSuccess: false, message: "Failed to email inspection to inspector" }
  }
}

export async function sendInspectionToTenantAfterInspectorAction(
  inspectionId: string
): Promise<ActionState<void>> {
  try {
    const { sendInspectionToTenantAfterInspectorAction } = await import("@/lib/email/moving-inspection-email-service")
    return await sendInspectionToTenantAfterInspectorAction(inspectionId)
  } catch (error) {
    console.error("Error sending inspection to tenant after inspector:", error)
    return { isSuccess: false, message: "Failed to send inspection to tenant" }
  }
}

