"use server"

import { redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getTenantByUserProfileIdQuery } from "@/queries/tenants-queries"
import { IncidentForm } from "./_components/incident-form"

export default async function NewIncidentPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile || userProfile.userType !== "tenant") {
    redirect("/dashboard")
  }

  const tenant = await getTenantByUserProfileIdQuery(userProfile.id)
  if (!tenant) {
    return <div>Tenant record not found</div>
  }

  return (
    <div className="container mx-auto py-6">
      <IncidentForm tenantId={tenant.id} propertyId={tenant.propertyId} />
    </div>
  )
}

