"use server"

import { notFound, redirect } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { db } from "@/db"
import { serviceProvidersTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditServiceProviderForm } from "./_components/edit-service-provider-form"

export default async function EditServiceProviderPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const user = await currentUser()
  if (!user) {
    redirect("/sign-in")
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    redirect("/sign-in")
  }

  // Only landlords and rental agents can access this
  if (userProfile.userType !== "landlord" && userProfile.userType !== "rental_agent") {
    redirect("/dashboard")
  }

  const { id } = await params

  const [provider] = await db
    .select()
    .from(serviceProvidersTable)
    .where(eq(serviceProvidersTable.id, id))
    .limit(1)

  if (!provider) {
    notFound()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/service-providers/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Service Provider</h1>
          <p className="text-muted-foreground">
            Update {provider.businessName || provider.contactName}
          </p>
        </div>
      </div>

      <EditServiceProviderForm provider={provider} />
    </div>
  )
}

