"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Key, Copy, RefreshCw, CheckCircle2, X } from "lucide-react"
import { getPropertyCodeAction, generatePropertyCodeAction, deactivatePropertyCodeAction, getPropertyCodesByPropertyIdAction } from "@/actions/property-codes-actions"
import type { SelectPropertyCode } from "@/db/schema"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PropertyQRCode } from "./property-qr-code"

interface PropertyCodeManagementSectionProps {
  propertyId: string
  propertyName: string
}

export function PropertyCodeManagementSection({ propertyId, propertyName }: PropertyCodeManagementSectionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [propertyCode, setPropertyCode] = useState<SelectPropertyCode | null>(null)
  const [allCodes, setAllCodes] = useState<SelectPropertyCode[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadPropertyCode()
  }, [propertyId])

  const loadPropertyCode = async () => {
    setLoading(true)
    try {
      // Get all codes first (including inactive)
      const allCodesResult = await getPropertyCodesByPropertyIdAction(propertyId)
      console.log("All codes result:", allCodesResult)
      
      if (allCodesResult.isSuccess && allCodesResult.data && allCodesResult.data.length > 0) {
        setAllCodes(allCodesResult.data)
        
        // Get active code
        const activeResult = await getPropertyCodeAction(propertyId)
        console.log("Active code result:", activeResult)
        
        if (activeResult.isSuccess && activeResult.data) {
          // If there's an active code, use it
          setPropertyCode(activeResult.data)
        } else {
          // If no active code but there are codes, show the most recent one
          setPropertyCode(allCodesResult.data[0])
        }
      } else {
        // If getting all codes failed or returned empty, try just getting active code
        const activeResult = await getPropertyCodeAction(propertyId)
        console.log("Active code result (fallback):", activeResult)
        if (activeResult.isSuccess && activeResult.data) {
          setPropertyCode(activeResult.data)
          setAllCodes([activeResult.data])
        } else {
          // No codes found at all
          setPropertyCode(null)
          setAllCodes([])
        }
      }
    } catch (error) {
      console.error("Error loading property code:", error)
      toast.error("Failed to load property codes")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCode = async () => {
    setGenerating(true)
    try {
      const result = await generatePropertyCodeAction(propertyId)
      if (result.isSuccess && result.data) {
        setPropertyCode(result.data)
        // Reload all codes to update the list
        await loadPropertyCode()
        toast.success("Property code generated successfully!")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to generate property code")
    } finally {
      setGenerating(false)
    }
  }

  const handleDeactivateCode = async () => {
    if (!propertyCode) return

    if (!confirm("Are you sure you want to deactivate this property code? Tenants will no longer be able to use it to submit incidents.")) {
      return
    }

    setLoading(true)
    try {
      const result = await deactivatePropertyCodeAction(propertyCode.id)
      if (result.isSuccess) {
        // Reload codes to get updated state
        await loadPropertyCode()
        toast.success("Property code deactivated successfully")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to deactivate property code")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!propertyCode) return
    navigator.clipboard.writeText(propertyCode.code)
    setCopied(true)
    toast.success("Property code copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const getSubmissionUrl = () => {
    if (!propertyCode) return ""
    return `${window.location.origin}/report-incident?code=${propertyCode.code}`
  }

  const copySubmissionUrl = () => {
    const url = getSubmissionUrl()
    navigator.clipboard.writeText(url)
    toast.success("Submission URL copied to clipboard!")
  }

  return (
    <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading property codes...</span>
          </div>
        ) : propertyCode ? (
          <div className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                Share this code with your tenants so they can report incidents without creating an account.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Property Code</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={propertyCode.code}
                  readOnly
                  className="font-mono text-lg font-bold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Direct Submission Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={getSubmissionUrl()}
                  readOnly
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copySubmissionUrl}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link directly with tenants - it will pre-fill the property code
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Badge variant={propertyCode.isActive ? "default" : "secondary"}>
                {propertyCode.isActive ? "Active" : "Inactive"}
              </Badge>
              {propertyCode.expiresAt && (
                <Badge variant="outline">
                  Expires: {new Date(propertyCode.expiresAt).toLocaleDateString()}
                </Badge>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleGenerateCode}
                disabled={generating}
                className="flex-1"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate New Code
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeactivateCode}
                disabled={loading || !propertyCode.isActive}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Deactivate
              </Button>
            </div>

            {/* QR Code Section */}
            {propertyCode.isActive && (
              <div className="pt-4 border-t">
                <PropertyQRCode propertyCode={propertyCode.code} propertyName={propertyName} />
              </div>
            )}

            {/* Show all codes history if there are multiple */}
            {allCodes.length > 1 && (
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-2">All Property Codes</Label>
                <div className="space-y-2">
                  {allCodes.map((code) => (
                    <div
                      key={code.id}
                      className={`flex items-center justify-between p-2 rounded-md border ${
                        code.id === propertyCode?.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono">{code.code}</code>
                        <Badge variant={code.isActive ? "default" : "secondary"} className="text-xs">
                          {code.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {code.expiresAt && (
                          <span className="text-xs text-muted-foreground">
                            Expires: {new Date(code.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(code.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                No property code has been generated yet. Generate one to enable public incident submission for this property.
              </AlertDescription>
            </Alert>
            <Button
              onClick={handleGenerateCode}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Generate Property Code
                </>
              )}
            </Button>
          </div>
        )}
    </div>
  )
}

