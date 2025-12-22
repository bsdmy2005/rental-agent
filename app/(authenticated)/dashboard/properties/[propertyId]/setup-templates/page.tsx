"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TemplateSetupWizard } from "./_components/template-setup-wizard"

export default async function PropertyTemplateSetupPage({
  params
}: {
  params: Promise<{ propertyId: string }>
}) {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const { propertyId } = await params
  const property = await getPropertyByIdQuery(propertyId)

  if (!property) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/properties/${propertyId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Setup Billing Templates</h1>
            <p className="text-muted-foreground mt-1 text-sm">{property.name}</p>
          </div>
        </div>
      </div>

      <TemplateSetupWizard propertyId={propertyId} />
    </div>
  )
}

