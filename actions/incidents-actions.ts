"use server"

import { db } from "@/db"
import {
  incidentsTable,
  incidentAttachmentsTable,
  incidentStatusHistoryTable,
  tenantsTable,
  type InsertIncident,
  type SelectIncident,
  type InsertIncidentAttachment,
  type SelectIncidentAttachment,
  type InsertIncidentStatusHistory,
  type SelectIncidentStatusHistory,
  incidentStatusEnum
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, desc } from "drizzle-orm"

// Incident CRUD Operations

export async function createIncidentAction(
  incident: InsertIncident
): Promise<ActionState<SelectIncident>> {
  try {
    const [newIncident] = await db.insert(incidentsTable).values(incident).returning()

    if (!newIncident) {
      return { isSuccess: false, message: "Failed to create incident" }
    }

    // Create initial status history entry
    await db.insert(incidentStatusHistoryTable).values({
      incidentId: newIncident.id,
      status: newIncident.status,
      changedBy: null, // Tenant created it, no user profile needed
      notes: "Incident reported"
    })

    return {
      isSuccess: true,
      message: "Incident created successfully",
      data: newIncident
    }
  } catch (error) {
    console.error("Error creating incident:", error)
    return { isSuccess: false, message: "Failed to create incident" }
  }
}

export async function getIncidentsByPropertyIdAction(
  propertyId: string
): Promise<ActionState<SelectIncident[]>> {
  try {
    const incidents = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.propertyId, propertyId))
      .orderBy(desc(incidentsTable.reportedAt))

    return {
      isSuccess: true,
      message: "Incidents retrieved successfully",
      data: incidents
    }
  } catch (error) {
    console.error("Error getting incidents:", error)
    return { isSuccess: false, message: "Failed to get incidents" }
  }
}

export async function getIncidentsByTenantIdAction(
  tenantId: string
): Promise<ActionState<SelectIncident[]>> {
  try {
    const incidents = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.tenantId, tenantId))
      .orderBy(desc(incidentsTable.reportedAt))

    return {
      isSuccess: true,
      message: "Incidents retrieved successfully",
      data: incidents
    }
  } catch (error) {
    console.error("Error getting incidents:", error)
    return { isSuccess: false, message: "Failed to get incidents" }
  }
}

export async function updateIncidentAction(
  incidentId: string,
  data: Partial<InsertIncident>
): Promise<ActionState<SelectIncident>> {
  try {
    const [updatedIncident] = await db
      .update(incidentsTable)
      .set(data)
      .where(eq(incidentsTable.id, incidentId))
      .returning()

    if (!updatedIncident) {
      return { isSuccess: false, message: "Incident not found" }
    }

    return {
      isSuccess: true,
      message: "Incident updated successfully",
      data: updatedIncident
    }
  } catch (error) {
    console.error("Error updating incident:", error)
    return { isSuccess: false, message: "Failed to update incident" }
  }
}

export async function updateIncidentStatusAction(
  incidentId: string,
  status: SelectIncident["status"],
  changedBy: string,
  notes?: string
): Promise<ActionState<SelectIncident>> {
  try {
    // Update incident status
    const updateData: Partial<InsertIncident> = { status }
    if (status === "resolved" || status === "closed") {
      updateData.resolvedAt = new Date()
    }

    const [updatedIncident] = await db
      .update(incidentsTable)
      .set(updateData)
      .where(eq(incidentsTable.id, incidentId))
      .returning()

    if (!updatedIncident) {
      return { isSuccess: false, message: "Incident not found" }
    }

    // Create status history entry
    await db.insert(incidentStatusHistoryTable).values({
      incidentId,
      status,
      changedBy,
      notes: notes || `Status changed to ${status}`
    })

    return {
      isSuccess: true,
      message: "Incident status updated successfully",
      data: updatedIncident
    }
  } catch (error) {
    console.error("Error updating incident status:", error)
    return { isSuccess: false, message: "Failed to update incident status" }
  }
}

export async function assignIncidentAction(
  incidentId: string,
  assignedTo: string
): Promise<ActionState<SelectIncident>> {
  try {
    const [updatedIncident] = await db
      .update(incidentsTable)
      .set({ assignedTo })
      .where(eq(incidentsTable.id, incidentId))
      .returning()

    if (!updatedIncident) {
      return { isSuccess: false, message: "Incident not found" }
    }

    // Update status to assigned if not already
    if (updatedIncident.status === "reported") {
      await updateIncidentStatusAction(incidentId, "assigned", assignedTo, "Incident assigned")
    }

    return {
      isSuccess: true,
      message: "Incident assigned successfully",
      data: updatedIncident
    }
  } catch (error) {
    console.error("Error assigning incident:", error)
    return { isSuccess: false, message: "Failed to assign incident" }
  }
}

// Incident Attachment Operations

export async function uploadIncidentAttachmentAction(
  attachment: InsertIncidentAttachment
): Promise<ActionState<SelectIncidentAttachment>> {
  try {
    const [newAttachment] = await db
      .insert(incidentAttachmentsTable)
      .values(attachment)
      .returning()

    if (!newAttachment) {
      return { isSuccess: false, message: "Failed to upload incident attachment" }
    }

    return {
      isSuccess: true,
      message: "Incident attachment uploaded successfully",
      data: newAttachment
    }
  } catch (error) {
    console.error("Error uploading incident attachment:", error)
    return { isSuccess: false, message: "Failed to upload incident attachment" }
  }
}

export async function getIncidentAttachmentsByIncidentIdAction(
  incidentId: string
): Promise<ActionState<SelectIncidentAttachment[]>> {
  try {
    const attachments = await db
      .select()
      .from(incidentAttachmentsTable)
      .where(eq(incidentAttachmentsTable.incidentId, incidentId))
      .orderBy(desc(incidentAttachmentsTable.uploadedAt))

    return {
      isSuccess: true,
      message: "Incident attachments retrieved successfully",
      data: attachments
    }
  } catch (error) {
    console.error("Error getting incident attachments:", error)
    return { isSuccess: false, message: "Failed to get incident attachments" }
  }
}

// Status History Operations

export async function getIncidentStatusHistoryAction(
  incidentId: string
): Promise<ActionState<SelectIncidentStatusHistory[]>> {
  try {
    const history = await db
      .select()
      .from(incidentStatusHistoryTable)
      .where(eq(incidentStatusHistoryTable.incidentId, incidentId))
      .orderBy(desc(incidentStatusHistoryTable.changedAt))

    return {
      isSuccess: true,
      message: "Incident status history retrieved successfully",
      data: history
    }
  } catch (error) {
    console.error("Error getting incident status history:", error)
    return { isSuccess: false, message: "Failed to get incident status history" }
  }
}

// Public Incident Submission

export interface PublicIncidentSubmission {
  propertyId: string
  title: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
  submittedName?: string
  submittedPhone?: string
  tenantId?: string // Optional - will be set if phone matches existing tenant
}

/**
 * Submit an incident from public (unauthenticated) form
 * Auto-links to tenant if phone matches
 */
export async function submitPublicIncidentAction(
  submission: PublicIncidentSubmission
): Promise<ActionState<SelectIncident>> {
  try {
    // Try to find tenant by phone if provided
    let tenantId: string | null = submission.tenantId || null
    
    if (!tenantId && submission.submittedPhone) {
      const [tenant] = await db
        .select({ id: tenantsTable.id })
        .from(tenantsTable)
        .where(eq(tenantsTable.phone, submission.submittedPhone))
        .limit(1)
      
      if (tenant) {
        tenantId = tenant.id
      }
    }

    const [newIncident] = await db
      .insert(incidentsTable)
      .values({
        propertyId: submission.propertyId,
        tenantId: tenantId,
        title: submission.title,
        description: submission.description,
        priority: submission.priority,
        status: "reported",
        submissionMethod: "web",
        submittedPhone: submission.submittedPhone || null,
        submittedName: submission.submittedName || null,
        isVerified: false
      })
      .returning()

    if (!newIncident) {
      return { isSuccess: false, message: "Failed to create incident" }
    }

    // Create initial status history entry
    await db.insert(incidentStatusHistoryTable).values({
      incidentId: newIncident.id,
      status: newIncident.status,
      changedBy: null,
      notes: submission.submittedName
        ? `Incident reported by ${submission.submittedName} via public submission`
        : "Incident reported via public submission"
    })

    return {
      isSuccess: true,
      message: "Incident submitted successfully",
      data: newIncident
    }
  } catch (error) {
    console.error("Error submitting public incident:", error)
    return { isSuccess: false, message: "Failed to submit incident" }
  }
}

