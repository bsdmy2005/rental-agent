"use server"

import { getLeaseTemplatesAction } from "@/actions/lease-templates-actions"
import { LeaseTemplatesListClient } from "./lease-templates-list-client"

export async function LeaseTemplatesList() {
  const result = await getLeaseTemplatesAction()

  if (!result.isSuccess) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{result.message || "Failed to load templates"}</p>
      </div>
    )
  }

  return <LeaseTemplatesListClient templates={result.data || []} />
}

