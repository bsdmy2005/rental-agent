import { db } from "@/db"
import {
  incidentsTable,
  incidentAttachmentsTable,
  incidentStatusHistoryTable,
  propertiesTable,
  tenantsTable,
  userProfilesTable,
  type SelectIncident,
  type SelectIncidentAttachment,
  type SelectIncidentStatusHistory
} from "@/db/schema"
import { eq, desc, inArray } from "drizzle-orm"

export interface IncidentWithDetails extends SelectIncident {
  property: {
    id: string
    name: string
    streetAddress: string
    suburb: string
    province: string
  }
  tenant: {
    id: string
    name: string
    email: string | null
  }
  attachments: SelectIncidentAttachment[]
  statusHistory: (SelectIncidentStatusHistory & {
    changedByUser?: {
      id: string
      firstName: string | null
      lastName: string | null
      email: string
    }
  })[]
  assignedToUser?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
}

export async function getIncidentByIdWithDetailsQuery(
  incidentId: string
): Promise<IncidentWithDetails | null> {
  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.id, incidentId))
    .limit(1)

  if (!incident) {
    return null
  }

  // Get property
  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.id, incident.propertyId))
    .limit(1)

  if (!property) {
    return null
  }

  // Get tenant (optional - anonymous incidents may not have a tenant)
  let tenant = null
  if (incident.tenantId) {
    const [tenantRecord] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, incident.tenantId))
      .limit(1)
    tenant = tenantRecord || null
  }

  // Get attachments
  const attachments = await db
    .select()
    .from(incidentAttachmentsTable)
    .where(eq(incidentAttachmentsTable.incidentId, incidentId))
    .orderBy(desc(incidentAttachmentsTable.uploadedAt))

  // Get status history
  const statusHistory = await db
    .select()
    .from(incidentStatusHistoryTable)
    .where(eq(incidentStatusHistoryTable.incidentId, incidentId))
    .orderBy(desc(incidentStatusHistoryTable.changedAt))

  // Get assigned to user if exists
  let assignedToUser = undefined
  if (incident.assignedTo) {
    const [user] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, incident.assignedTo))
      .limit(1)

    if (user) {
      assignedToUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    }
  }

  // Get changed by users for status history
  const changedByUserIds = [
    ...new Set(statusHistory.map((h) => h.changedBy).filter(Boolean) as string[])
  ]
  let userMap = new Map()
  if (changedByUserIds.length > 0) {
    const users = await db
      .select()
      .from(userProfilesTable)
      .where(inArray(userProfilesTable.id, changedByUserIds))

    userMap = new Map(users.map((u) => [u.id, u]))
  }

  return {
    ...incident,
    property: {
      id: property.id,
      name: property.name,
      streetAddress: property.streetAddress,
      suburb: property.suburb,
      province: property.province
    },
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email
        }
      : {
          id: "",
          name: incident.submittedName || "Anonymous",
          email: null
        },
    attachments,
    statusHistory: statusHistory.map((h) => ({
      ...h,
      changedByUser: h.changedBy
        ? {
            id: h.changedBy,
            firstName: userMap.get(h.changedBy)?.firstName || null,
            lastName: userMap.get(h.changedBy)?.lastName || null,
            email: userMap.get(h.changedBy)?.email || ""
          }
        : undefined
    })),
    assignedToUser
  }
}

export async function getIncidentsByPropertyIdsQuery(
  propertyIds: string[]
): Promise<SelectIncident[]> {
  if (propertyIds.length === 0) {
    return []
  }

  const incidents = await db
    .select()
    .from(incidentsTable)
    .where(inArray(incidentsTable.propertyId, propertyIds))
    .orderBy(desc(incidentsTable.reportedAt))

  return incidents
}
