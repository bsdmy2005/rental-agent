"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getInspectionByTokenAction } from "@/actions/moving-inspections-actions"
import { InspectionChecklist } from "@/app/(authenticated)/dashboard/moving-inspections/_components/inspection-checklist"
import { SignaturePad } from "@/components/utility/signature-pad"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

export default function InspectionSigningPage() {
  const params = useParams()
  const router = useRouter()
  // Decode token from URL (in case it was URL-encoded)
  const token = params.token ? decodeURIComponent(params.token as string) : ""

  const [inspection, setInspection] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [showSignaturePad, setShowSignaturePad] = useState(false)

  useEffect(() => {
    async function loadInspection() {
      try {
        const result = await getInspectionByTokenAction(token)
        if (!result.isSuccess) {
          setError(result.message || "Failed to load inspection")
          return
        }
        setInspection(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load inspection")
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      loadInspection()
    }
  }, [token])

  const handleSign = async () => {
    if (!signatureData) {
      toast.error("Please provide your signature")
      return
    }

    setSigning(true)
    try {
      const response = await fetch("/api/inspections/sign/tenant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          signatureData: {
            image: signatureData,
            signedAt: new Date().toISOString()
          }
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to sign inspection")
      }

      toast.success("Inspection signed successfully! A PDF copy will be emailed to you shortly.")
      setShowSignaturePad(false)
      // Reload inspection to show updated status
      const result = await getInspectionByTokenAction(token)
      if (result.isSuccess) {
        setInspection(result.data)
      }
    } catch (err) {
      console.error("Error signing inspection:", err)
      toast.error(err instanceof Error ? err.message : "Failed to sign inspection")
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading inspection...</p>
        </div>
      </div>
    )
  }

  if (error || !inspection) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error || "Inspection not found"}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please use the link provided in your email to access this inspection.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const inspectionTypeLabel = inspection.inspectionType === "moving_in" ? "Moving-In" : "Moving-Out"
  const propertyAddress = inspection.property
    ? `${inspection.property.streetAddress}, ${inspection.property.suburb}, ${inspection.property.province}`
    : "N/A"

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{inspectionTypeLabel} Inspection Report</CardTitle>
            <CardDescription>
              Property: {inspection.property?.name || "N/A"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Address:</span>
                <p className="text-muted-foreground">{propertyAddress}</p>
              </div>
              <div>
                <span className="font-semibold">Inspection Date:</span>
                <p className="text-muted-foreground">
                  {format(new Date(inspection.createdAt), "PPP")}
                </p>
              </div>
            </div>

            {/* Signature Status */}
            <div className="border-t pt-4 space-y-2">
              <h3 className="font-semibold">Signature Status</h3>
              <div className="flex items-center gap-4 flex-wrap">
                {inspection.inspectedByThirdParty ? (
                  <div className="flex items-center gap-2">
                    {inspection.signedByInspector ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="text-sm">Inspector: {inspection.signedByInspector ? "Signed" : "Not Signed"}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {inspection.signedByLandlord ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="text-sm">Landlord/Agent: {inspection.signedByLandlord ? "Signed" : "Not Signed"}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {inspection.signedByTenant ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="text-sm">Your Signature: {inspection.signedByTenant ? "Signed" : "Not Signed"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspection Items */}
        <Card>
          <CardHeader>
            <CardTitle>Inspection Checklist</CardTitle>
            <CardDescription>Review the inspection items below</CardDescription>
          </CardHeader>
          <CardContent>
            <InspectionChecklist
              inspectionId={inspection.id}
              inspectionType={inspection.inspectionType}
              isLocked={true}
              isReadOnly={true} // Tenants can only view, not edit
              items={inspection.items.map((item: any) => ({
                ...item,
                isPresent: null // Not used in new system
              }))}
            />
          </CardContent>
        </Card>

        {/* Signature Section */}
        {!inspection.signedByTenant && (
          <Card>
            <CardHeader>
              <CardTitle>Sign Inspection</CardTitle>
              <CardDescription>
                Please sign below to confirm you have reviewed this inspection report
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showSignaturePad ? (
                <div className="space-y-4">
                  <SignaturePad
                    onSign={(data) => {
                      setSignatureData(data)
                      setShowSignaturePad(false)
                    }}
                    onCancel={() => setShowSignaturePad(false)}
                  />
                </div>
              ) : signatureData ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-white">
                    <p className="text-sm text-muted-foreground mb-2">Your Signature:</p>
                    <img src={signatureData} alt="Signature" className="max-w-xs border rounded" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSignatureData(null)
                        setShowSignaturePad(true)
                      }}
                      variant="outline"
                    >
                      Change Signature
                    </Button>
                    <Button onClick={handleSign} disabled={signing}>
                      {signing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing...
                        </>
                      ) : (
                        "Confirm and Sign"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowSignaturePad(true)} className="w-full">
                  Sign Inspection
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {inspection.signedByTenant && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold">You have already signed this inspection</p>
              </div>
              <p className="text-sm text-green-600 mt-2">
                A PDF copy of the signed inspection report will be emailed to you shortly.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

