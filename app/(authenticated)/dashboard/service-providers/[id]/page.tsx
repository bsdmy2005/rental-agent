"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { db } from "@/db"
import { serviceProvidersTable, serviceProviderAreasTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { ArrowLeft, Edit, Phone, Mail, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DeleteServiceProviderButton } from "./_components/delete-service-provider-button"

export default async function ServiceProviderDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
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

  const areas = await db
    .select()
    .from(serviceProviderAreasTable)
    .where(eq(serviceProviderAreasTable.serviceProviderId, id))

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/service-providers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {provider.businessName || provider.contactName}
            </h1>
            <p className="text-muted-foreground">Service Provider Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/service-providers/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <DeleteServiceProviderButton
            providerId={id}
            providerName={provider.businessName || provider.contactName}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Contact Name</p>
              <p className="font-medium">{provider.contactName}</p>
            </div>
            {provider.businessName && (
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="font-medium">{provider.businessName}</p>
              </div>
            )}
            {provider.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${provider.email}`} className="text-sm">
                  {provider.email}
                </a>
              </div>
            )}
            {provider.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${provider.phone}`} className="text-sm">
                  {provider.phone}
                </a>
              </div>
            )}
            {provider.whatsappNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">WhatsApp: {provider.whatsappNumber}</span>
              </div>
            )}
            {provider.specialization && (
              <div>
                <p className="text-sm text-muted-foreground">Specialization</p>
                <Badge>{provider.specialization.replace("_", " ")}</Badge>
              </div>
            )}
            {provider.licenseNumber && (
              <div>
                <p className="text-sm text-muted-foreground">License Number</p>
                <p className="text-sm">{provider.licenseNumber}</p>
              </div>
            )}
            {provider.insuranceInfo && (
              <div>
                <p className="text-sm text-muted-foreground">Insurance Information</p>
                <p className="text-sm whitespace-pre-wrap">{provider.insuranceInfo}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={provider.isActive ? "default" : "secondary"}>
                {provider.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Areas</CardTitle>
            <CardDescription>Geographic coverage areas</CardDescription>
          </CardHeader>
          <CardContent>
            {areas.length > 0 ? (
              <div className="space-y-2">
                {areas.map((area) => (
                  <div key={area.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {area.suburb ? `${area.suburb}, ` : ""}
                      {area.province}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No service areas configured
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

