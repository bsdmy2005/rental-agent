"use server"

import { getPropertiesIndividuallyAssignedToAgentQuery } from "@/queries/agent-properties-queries"
import { ActionState } from "@/types"
import type { SelectProperty } from "@/db/schema"
import type { SelectPropertyManagement } from "@/db/schema"

export interface AgentPropertyAssignment extends SelectPropertyManagement {
  property: SelectProperty
}

export async function getAgentPropertyAssignmentsAction(
  rentalAgentId: string
): Promise<ActionState<AgentPropertyAssignment[]>> {
  try {
    const assignments = await getPropertiesIndividuallyAssignedToAgentQuery(rentalAgentId)
    return {
      isSuccess: true,
      message: "Agent property assignments retrieved successfully",
      data: assignments
    }
  } catch (error) {
    console.error("Error getting agent property assignments:", error)
    return { isSuccess: false, message: "Failed to get agent property assignments" }
  }
}

