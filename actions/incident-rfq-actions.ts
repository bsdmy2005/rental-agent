"use server"

import { ActionState } from "@/types"
import { createBulkRfqAction } from "./service-providers-actions"
import { getIncidentByIdWithDetailsQuery } from "@/queries/incidents-queries"
import { updateIncidentStatusAction, getIncidentAttachmentsByIncidentIdAction } from "./incidents-actions"
import { transformIncidentToRfqDescriptionAction } from "@/lib/incident-rfq-transformer"
import { copyIncidentAttachmentsToRfqAction } from "./rfq-attachments-actions"

/**
 * Create RFQ from an incident
 * Fetches incident details and creates RFQs for selected providers
 */
export async function createRfqFromIncidentAction(
  incidentId: string,
  providerIds: string[],
  requestedBy: string,
  options?: {
    notes?: string | null
    dueDate?: Date | null
    channel?: "email" | "whatsapp" | "both"
  }
): Promise<ActionState<{ rfqId: string; quoteRequestIds: string[]; rfqCode: string | null }>> {
  try {
    // Get incident with property details
    const incident = await getIncidentByIdWithDetailsQuery(incidentId)
    
    if (!incident) {
      return { isSuccess: false, message: "Incident not found" }
    }

    if (providerIds.length === 0) {
      return { isSuccess: false, message: "At least one service provider must be selected" }
    }

    // Get incident attachments
    const attachmentsResult = await getIncidentAttachmentsByIncidentIdAction(incidentId)
    const incidentAttachments = attachmentsResult.isSuccess && attachmentsResult.data ? attachmentsResult.data : []

    // Transform incident description to professional RFQ description
    const propertyDetails = {
      name: incident.property.name,
      address: `${incident.property.streetAddress || ""}, ${incident.property.suburb || ""}, ${incident.property.province || ""}`.trim().replace(/^,\s*|,\s*$/g, "")
    }

    console.log(`[RFQ Creation] Transforming incident description...`)
    console.log(`[RFQ Creation] Original title: ${incident.title}`)
    console.log(`[RFQ Creation] Original description: ${incident.description.substring(0, 100)}...`)

    const transformResult = await transformIncidentToRfqDescriptionAction(
      incident.title,
      incident.description,
      propertyDetails
    )

    // Use transformed data if available, otherwise fallback to original
    const rfqTitle = transformResult.isSuccess && transformResult.data ? transformResult.data.title : incident.title
    const rfqDescription = transformResult.isSuccess && transformResult.data ? transformResult.data.description : incident.description

    console.log(`[RFQ Creation] Transformation result:`, {
      isSuccess: transformResult.isSuccess,
      message: transformResult.message,
      transformedTitle: rfqTitle,
      transformedDescription: rfqDescription.substring(0, 100) + "..."
    })

    // Create bulk RFQ with transformed data
    // Pass incident attachments so they can be copied BEFORE sending messages
    const result = await createBulkRfqAction(
      {
        propertyId: incident.property.id,
        incidentId: incident.id,
        title: rfqTitle,
        description: rfqDescription,
        requestedBy,
        dueDate: options?.dueDate || null,
        notes: options?.notes || null
      },
      providerIds,
      options?.channel || "email",
      {
        incidentAttachments: incidentAttachments.map(att => ({
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          fileType: att.fileType
        }))
      }
    )

    // If RFQ creation was successful, update incident status to "awaiting_quote"
    // Only update if current status is not already "awaiting_quote" or a later status
    if (result.isSuccess) {
      const statusOrder = ["reported", "assigned", "in_progress", "awaiting_quote", "awaiting_approval", "resolved", "closed"]
      const currentStatusIndex = statusOrder.indexOf(incident.status)
      const awaitingQuoteIndex = statusOrder.indexOf("awaiting_quote")

      // Only update if current status is before "awaiting_quote" in the workflow
      if (currentStatusIndex < awaitingQuoteIndex) {
        try {
          await updateIncidentStatusAction(
            incidentId,
            "awaiting_quote",
            requestedBy,
            `RFQ sent to ${providerIds.length} service provider(s)`
          )
        } catch (statusError) {
          // Log error but don't fail the RFQ creation
          console.error("Error updating incident status after RFQ creation:", statusError)
        }
      }
    }

    return result
  } catch (error) {
    console.error("Error creating RFQ from incident:", error)
    return { isSuccess: false, message: "Failed to create RFQ from incident" }
  }
}

