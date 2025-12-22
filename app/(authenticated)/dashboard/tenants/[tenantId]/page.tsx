"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getTenantByIdQuery } from "@/queries/tenants-queries"
import { getLeaseAgreementByTenantIdQuery } from "@/queries/lease-agreements-queries"
import { getRentalInvoiceInstancesByTenantIdAction } from "@/actions/rental-invoice-instances-actions"
import { getBillTemplatesByPropertyIdAction } from "@/actions/bill-templates-actions"
import { getExtractionRulesByPropertyIdQuery } from "@/queries/extraction-rules-queries"
import { RentalInvoiceTemplatesManager } from "./_components/rental-invoice-templates-manager"
import { RentalInvoiceTemplateDependenciesView } from "./_components/rental-invoice-template-dependencies-view"
import Link from "next/link"
import { ArrowLeft, FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function TenantDetailPage({
  params
}: {
  params: Promise<{ tenantId: string }>
}) {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const { tenantId } = await params
  const tenant = await getTenantByIdQuery(tenantId)

  if (!tenant) {
    notFound()
  }

  // Get lease agreement
  const leaseAgreement = await getLeaseAgreementByTenantIdQuery(tenantId)

  // Get invoice template (single template per tenant) and instances
  const { getRentalInvoiceTemplateByTenantIdAction } = await import(
    "@/actions/rental-invoice-templates-actions"
  )
  const invoiceTemplateResult = await getRentalInvoiceTemplateByTenantIdAction(tenantId)
  const invoiceTemplate = invoiceTemplateResult.isSuccess ? invoiceTemplateResult.data : null

  const invoiceInstancesResult = await getRentalInvoiceInstancesByTenantIdAction(tenantId)
  const invoiceInstances = invoiceInstancesResult.isSuccess ? invoiceInstancesResult.data : []

  // Get bill templates and extraction rules for the property
  const billTemplatesResult = await getBillTemplatesByPropertyIdAction(tenant.propertyId)
  const billTemplates = billTemplatesResult.isSuccess ? billTemplatesResult.data : []

  const extractionRules = await getExtractionRulesByPropertyIdQuery(tenant.propertyId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tenants">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{tenant.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {tenant.email || "No email"} • {tenant.phone || "No phone"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground text-xs">Name</p>
              <p className="font-medium">{tenant.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">ID Number</p>
              <p className="font-medium">{tenant.idNumber}</p>
            </div>
            {tenant.email && (
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{tenant.email}</p>
              </div>
            )}
            {tenant.phone && (
              <div>
                <p className="text-muted-foreground text-xs">Phone</p>
                <p className="font-medium">{tenant.phone}</p>
              </div>
            )}
            {tenant.rentalAmount && (
              <div>
                <p className="text-muted-foreground text-xs">Rental Amount</p>
                <p className="font-medium">R {Number(tenant.rentalAmount).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs">Property</p>
              <Link
                href={`/dashboard/properties/${tenant.propertyId}`}
                className="text-primary hover:underline text-sm font-medium"
              >
                View Property →
              </Link>
            </div>
          </CardContent>
        </Card>

        {leaseAgreement && (
          <Card>
            <CardHeader>
              <CardTitle>Lease Agreement</CardTitle>
              <CardDescription>Uploaded lease document</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground text-xs">File Name</p>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <p className="font-medium">{leaseAgreement.fileName}</p>
                </div>
              </div>
              {leaseAgreement.effectiveStartDate && leaseAgreement.effectiveEndDate && (
                <>
                  <div>
                    <p className="text-muted-foreground text-xs">Lease Start Date</p>
                    <p className="font-medium">
                      {new Date(leaseAgreement.effectiveStartDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Lease End Date</p>
                    <p className="font-medium">
                      {new Date(leaseAgreement.effectiveEndDate).toLocaleDateString()}
                    </p>
                  </div>
                </>
              )}
              <div>
                <a
                  href={leaseAgreement.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Download className="h-4 w-4" />
                  Download Lease PDF
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {!leaseAgreement && (
          <Card>
            <CardHeader>
              <CardTitle>Lease Agreement</CardTitle>
              <CardDescription>No lease agreement uploaded</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                No lease agreement has been uploaded for this tenant.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <RentalInvoiceTemplatesManager
        tenantId={tenantId}
        propertyId={tenant.propertyId}
        tenantName={tenant.name}
        existingTemplate={invoiceTemplate}
        billTemplates={billTemplates}
        extractionRules={extractionRules}
      />

      <RentalInvoiceTemplateDependenciesView
        template={invoiceTemplate}
        billTemplates={billTemplates}
        propertyId={tenant.propertyId}
      />

      <Card>
        <CardHeader>
          <CardTitle>Invoice Instances</CardTitle>
          <CardDescription>Generated invoices for this tenant</CardDescription>
        </CardHeader>
        <CardContent>
          {invoiceInstances.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invoice instances generated yet</p>
          ) : (
            <div className="space-y-2">
              {invoiceInstances.map((instance) => (
                <div
                  key={instance.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      Invoice {instance.periodYear}-{String(instance.periodMonth).padStart(2, "0")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Status: {instance.status}
                    </div>
                  </div>
                  <Badge variant={instance.status === "sent" ? "default" : "secondary"}>
                    {instance.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

