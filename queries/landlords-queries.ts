import { db } from "@/db"
import { landlordsTable, propertiesTable, type SelectLandlord, type SelectProperty } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getLandlordByUserProfileIdQuery(
  userProfileId: string
): Promise<SelectLandlord | null> {
  const [landlord] = await db
    .select()
    .from(landlordsTable)
    .where(eq(landlordsTable.userProfileId, userProfileId))
    .limit(1)

  return landlord || null
}

export async function getLandlordByIdQuery(landlordId: string): Promise<SelectLandlord | null> {
  const [landlord] = await db
    .select()
    .from(landlordsTable)
    .where(eq(landlordsTable.id, landlordId))
    .limit(1)

  return landlord || null
}

export interface LandlordWithProperties extends SelectLandlord {
  properties: SelectProperty[]
}

export async function getLandlordWithPropertiesQuery(
  landlordId: string
): Promise<LandlordWithProperties | null> {
  const landlord = await getLandlordByIdQuery(landlordId)
  if (!landlord) {
    return null
  }

  const properties = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.landlordId, landlordId))

  return {
    ...landlord,
    properties
  }
}

