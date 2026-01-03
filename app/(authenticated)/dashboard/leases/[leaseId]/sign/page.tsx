"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { SignaturePad } from "@/components/utility/signature-pad"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { LeaseDetailsView } from "./_components/lease-details-view"

export default function LandlordSigningPage() {
  const params = useParams()
  const router = useRouter()
  const leaseId = params.leaseId as string

  const [lease, setLease] = useState<{
    id: string
    tenantId: string
    propertyId: string
    fileName: string
    fileUrl: string
    effectiveStartDate: Date | string
    effectiveEndDate: Date | string
    initiationMethod: "upload_existing" | "initiate_new"
    initiationStatus: "draft" | "sent_to_landlord" | "sent_to_tenant" | "tenant_signed" | "landlord_signed" | "fully_executed" | null
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
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [signatureConfirmed, setSignatureConfirmed] = useState(false)

  useEffect(() => {
    async function loadLease() {
      try {
        // TODO: Use server action instead of direct DB query
        const response = await fetch(`/api/leases/${leaseId}`)
        if (!response.ok) {
          setError("Failed to load lease")
          return
        }
        const data = await response.json()
        setLease(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load lease")
      } finally {
        setLoading(false)
      }
    }

    if (leaseId) {
      loadLease()
    }
  }, [leaseId])

  const handleSign = async () => {
    if (!signatureData) {
      setError("Please provide your signature")
      return
    }

    setSigning(true)
    setError(null)

    try {
      const response = await fetch(`/api/leases/${leaseId}/sign/landlord`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          signatureData: {
            image: signatureData,
            signedAt: new Date().toISOString()
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to sign lease")
        return
      }

      // Success - redirect to lease detail or property page
      router.push(`/dashboard/leases/${leaseId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign lease")
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error && !lease) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!lease) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Lease Not Found</CardTitle>
            <CardDescription>The lease agreement could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Sign Lease Agreement</CardTitle>
          <CardDescription>
            {lease.signedByTenant
              ? "The tenant has signed. Please review and sign to complete the lease."
              : "Please review the lease agreement and provide your signature."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lease Details */}
          <LeaseDetailsView lease={lease} />

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Your Signature</h3>
            {!signatureConfirmed ? (
              <SignaturePad
                onSign={(data) => {
                  setSignatureData(data)
                  setSignatureConfirmed(true)
                }}
              />
            ) : (
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-muted-foreground mb-4">Signature confirmed. Click below to sign the lease.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSignatureData(null)
                    setSignatureConfirmed(false)
                  }}
                >
                  Change Signature
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          {signatureConfirmed && (
            <div className="flex gap-4">
              <Button
                onClick={handleSign}
                disabled={!signatureData || signing}
                className="flex-1"
              >
                {signing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  "Sign Lease Agreement"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

