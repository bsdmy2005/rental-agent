import { db } from "@/db"
import {
  rentalAgentsTable,
  propertyManagementsTable,
  propertiesTable,
  type SelectRentalAgent,
  type SelectPropertyManagement,
  type SelectProperty
} from "@/db/schema"
import { eq, and } from "drizzle-orm"

export async function getRentalAgentByUserProfileIdQuery(
  userProfileId: string
): Promise<SelectRentalAgent | null> {
  const [rentalAgent] = await db
    .select()
    .from(rentalAgentsTable)
    .where(eq(rentalAgentsTable.userProfileId, userProfileId))
    .limit(1)

  return rentalAgent || null
}

export async function getRentalAgentByIdQuery(
  rentalAgentId: string
): Promise<SelectRentalAgent | null> {
  const [rentalAgent] = await db
    .select()
    .from(rentalAgentsTable)
    .where(eq(rentalAgentsTable.id, rentalAgentId))
    .limit(1)

  return rentalAgent || null
}

export interface RentalAgentWithProperties extends SelectRentalAgent {
  managedProperties: Array<SelectPropertyManagement & { property: SelectProperty }>
}

export async function getRentalAgentWithPropertiesQuery(
  rentalAgentId: string
): Promise<RentalAgentWithProperties | null> {
  const rentalAgent = await getRentalAgentByIdQuery(rentalAgentId)
  if (!rentalAgent) {
    return null
  }

  const managements = await db
    .select()
    .from(propertyManagementsTable)
    .where(eq(propertyManagementsTable.rentalAgentId, rentalAgentId))

  const properties = await Promise.all(
    managements.map(async (management) => {
      const [property] = await db
        .select()
        .from(propertiesTable)
        .where(eq(propertiesTable.id, management.propertyId))
        .limit(1)
      return { ...management, property: property! }
    })
  )

  return {
    ...rentalAgent,
    managedProperties: properties as Array<SelectPropertyManagement & { property: SelectProperty }>
  }
}

