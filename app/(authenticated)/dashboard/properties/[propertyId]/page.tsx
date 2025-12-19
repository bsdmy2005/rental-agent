"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getBillsByPropertyIdQuery } from "@/queries/bills-queries"
import { getExtractionRulesByPropertyIdQuery } from "@/queries/extraction-rules-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PropertyBillsSection } from "./_components/property-bills-section"
import { PropertyRulesSection } from "./_components/property-rules-section"

export default async function PropertyDetailPage({
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

  const bills = await getBillsByPropertyIdQuery(propertyId)
  const rules = await getExtractionRulesByPropertyIdQuery(propertyId)

  // Group bills by type
  const billsByType = {
    municipality: bills.filter((b) => b.billType === "municipality"),
    levy: bills.filter((b) => b.billType === "levy"),
    utility: bills.filter((b) => b.billType === "utility"),
    other: bills.filter((b) => b.billType === "other")
  }

  // Group rules by bill type
  const rulesByBillType = {
    municipality: rules.filter((r) => r.billType === "municipality"),
    levy: rules.filter((r) => r.billType === "levy"),
    utility: rules.filter((r) => r.billType === "utility"),
    other: rules.filter((r) => r.billType === "other")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/properties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{property.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {property.address}, {property.suburb}, {property.province}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Property Bills</CardTitle>
                  <CardDescription>
                    Bills received for this property (grouped by type)
                  </CardDescription>
                </div>
                <Link href="/dashboard/bills">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Bill
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <PropertyBillsSection bills={bills} billsByType={billsByType} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Extraction Rules</CardTitle>
                  <CardDescription>
                    Rules configured for this property (grouped by bill type)
                  </CardDescription>
                </div>
                <Link href={`/dashboard/rules?propertyId=${propertyId}`}>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Rule
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <PropertyRulesSection rules={rules} rulesByBillType={rulesByBillType} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Flow</CardTitle>
          <CardDescription>How bills are processed for this property</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 px-3 py-1 font-medium">
                Property
              </div>
              <span>→</span>
              <div className="rounded-full bg-muted px-3 py-1">
                Multiple Bills ({bills.length})
              </div>
              <span>→</span>
              <div className="rounded-full bg-muted px-3 py-1">
                Rules ({rules.length})
              </div>
              <span>→</span>
              <div className="rounded-full bg-green-100 px-3 py-1">Invoice Data</div>
              <span>+</span>
              <div className="rounded-full bg-blue-100 px-3 py-1">Payment Data</div>
            </div>
            <p className="text-muted-foreground mt-4 text-xs">
              Bills are processed using extraction rules. Each rule can extract invoice data
              (tenant-chargeable items), payment data (landlord-payable items), or both.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

