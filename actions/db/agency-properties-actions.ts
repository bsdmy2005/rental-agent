"use server"

import { getPropertiesByAgencyIdQuery } from "@/queries/properties-queries"
import { ActionState } from "@/types"
import type { SelectProperty } from "@/db/schema"

export async function getAgencyPropertiesAction(
  agencyId: string
): Promise<ActionState<SelectProperty[]>> {
  try {
    const properties = await getPropertiesByAgencyIdQuery(agencyId)
    return {
      isSuccess: true,
      message: "Agency properties retrieved successfully",
      data: properties
    }
  } catch (error) {
    console.error("Error getting agency properties:", error)
    return { isSuccess: false, message: "Failed to get agency properties" }
  }
}

