"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Building2, User, Calendar, DollarSign, FileText, Mail, Phone, MapPin } from "lucide-react"

interface LeaseDetailsViewProps {
  lease: {
    id: string
    tenantId: string
    propertyId: string
    fileName: string
    fileUrl: string
    effectiveStartDate: Date | string
    effectiveEndDate: Date | string
    initiationMethod: "upload_existing" | "initiate_new"
    initiationStatus: "draft" | "sent_to_tenant" | "tenant_signed" | "landlord_signed" | "fully_executed" | null
    lifecycleState: string
    signedByTenant: boolean
    signedByLandlord: boolean
    signedAt: Date | string | null
    tenantSigningLink: string | null
    tenantSigningExpiresAt: Date | string | null
    createdAt: Date | string
    tenant: {
      id: string
      name: string
      email: string | null
      phone: string | null
      idNumber: string
      rentalAmount: string | number | null
    } | null
    property: {
      id: string
      name: string
      streetAddress: string
      suburb: string
      province: string
      propertyType: string | null
    } | null
  }
}

export function LeaseDetailsView({ lease }: LeaseDetailsViewProps) {
  const formatCurrency = (amount: number | string | null) => {
    if (!amount) return "Not specified"
    return `R ${Number(amount).toFixed(2)}`
  }

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "MMMM d, yyyy")
  }

  const getDuration = () => {
    const start = new Date(lease.effectiveStartDate)
    const end = new Date(lease.effectiveEndDate)
    const months = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30))
    return `${months} month${months !== 1 ? "s" : ""}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Lease Agreement Details</h2>
        <p className="text-muted-foreground">Please review all details before signing</p>
      </div>

      {/* Property Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Property Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lease.property && (
            <>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Property Name</p>
                <p className="text-sm">{lease.property.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="text-sm flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {lease.property.streetAddress}, {lease.property.suburb}, {lease.property.province}
                </p>
              </div>
              {lease.property.propertyType && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Property Type</p>
                  <p className="text-sm">{lease.property.propertyType}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Tenant Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Tenant Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lease.tenant && (
            <>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{lease.tenant.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID Number</p>
                <p className="text-sm">{lease.tenant.idNumber}</p>
              </div>
              {lease.tenant.email && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {lease.tenant.email}
                  </p>
                </div>
              )}
              {lease.tenant.phone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {lease.tenant.phone}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Lease Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lease Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Start Date</p>
              <p className="text-sm">{formatDate(lease.effectiveStartDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">End Date</p>
              <p className="text-sm">{formatDate(lease.effectiveEndDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Duration</p>
              <p className="text-sm">{getDuration()}</p>
            </div>
            {lease.tenant?.rentalAmount && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Rental</p>
                <p className="text-sm flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(lease.tenant.rentalAmount)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signing Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Signing Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tenant</p>
              {lease.signedByTenant ? (
                <Badge className="bg-green-600 mt-1">Signed</Badge>
              ) : (
                <Badge variant="outline" className="mt-1">Not Signed</Badge>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Landlord</p>
              {lease.signedByLandlord ? (
                <Badge className="bg-green-600 mt-1">Signed</Badge>
              ) : (
                <Badge variant="outline" className="mt-1">Not Signed</Badge>
              )}
            </div>
          </div>
          {lease.signedAt && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fully Executed</p>
              <p className="text-sm">{format(new Date(lease.signedAt), "MMMM d, yyyy 'at' h:mm a")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Link */}
      {lease.fileUrl && (
        <Card>
          <CardContent className="pt-6">
            <a
              href={lease.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View Full Lease Agreement PDF
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

