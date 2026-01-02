"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getInspectionByInspectorTokenAction } from "@/actions/moving-inspections-actions"
import { InspectionItemRow } from "@/app/(authenticated)/dashboard/moving-inspections/_components/inspection-item-row"
import { InspectionChecklist } from "@/app/(authenticated)/dashboard/moving-inspections/_components/inspection-checklist"
import { SignaturePad } from "@/components/utility/signature-pad"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

export default function InspectorInspectionPage() {
  const params = useParams()
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
        const result = await getInspectionByInspectorTokenAction(token)
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
      const response = await fetch("/api/inspections/sign/inspector", {
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

      toast.success("Inspection signed successfully! The inspection has been sent to the tenant for their signature.")
      setShowSignaturePad(false)
      // Reload inspection to show updated status
      const result = await getInspectionByInspectorTokenAction(token)
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

  const refreshInspection = async () => {
    const result = await getInspectionByInspectorTokenAction(token)
    if (result.isSuccess) {
      setInspection(result.data)
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

  // Check if inspection is fully signed (both parties have signed)
  const isFullySigned = inspection.status === "signed" || 
                       (inspection.signedByInspector && inspection.signedByTenant)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
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

            {/* Inspector Info */}
            {inspection.inspectorName && (
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold">Inspector Information</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Name:</strong> {inspection.inspectorName}</p>
                  {inspection.inspectorCompany && (
                    <p><strong>Company:</strong> {inspection.inspectorCompany}</p>
                  )}
                  {inspection.inspectorEmail && (
                    <p><strong>Email:</strong> {inspection.inspectorEmail}</p>
                  )}
                  {inspection.inspectorPhone && (
                    <p><strong>Phone:</strong> {inspection.inspectorPhone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Signature Status */}
            <div className="border-t pt-4 space-y-2">
              <h3 className="font-semibold">Signature Status</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {inspection.signedByInspector ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="text-sm">Your Signature: {inspection.signedByInspector ? "Signed" : "Not Signed"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspection Checklist - Full Edit Access */}
        <Card>
          <CardHeader>
            <CardTitle>Inspection Checklist</CardTitle>
            <CardDescription>
              Fill out the inspection items below. You can upload photos, set conditions, and add comments for each item.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InspectionChecklist
              inspectionId={inspection.id}
              inspectionType={inspection.inspectionType}
              isLocked={true} // Locked structure
              isReadOnly={inspection.signedByInspector || isFullySigned} // Read-only if inspector signed or fully signed
              inspectorToken={(inspection.signedByInspector || isFullySigned) ? undefined : token} // Only pass token if not signed (for editing)
              items={inspection.items.map((item: any) => ({
                ...item,
                isPresent: null // Not used in new system
              }))}
            />
            {inspection.signedByInspector && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="font-semibold">
                    {isFullySigned ? "Inspection Fully Signed" : "Inspection Completed and Signed"}
                  </p>
                </div>
                <p className="text-sm text-green-600 mt-2">
                  {isFullySigned 
                    ? "This inspection has been fully signed by all parties and is locked from further edits."
                    : "This inspection has been signed and sent to the tenant for their signature."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature Section */}
        {!inspection.signedByInspector && (
          <Card>
            <CardHeader>
              <CardTitle>Sign Inspection</CardTitle>
              <CardDescription>
                Once you have completed the inspection, please sign below to confirm. The inspection will then be sent to the tenant for their signature.
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

        {inspection.signedByInspector && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold">You have signed this inspection</p>
              </div>
              <p className="text-sm text-green-600 mt-2">
                The inspection has been sent to the tenant for their signature. A PDF copy will be emailed to the tenant once both parties have signed.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

