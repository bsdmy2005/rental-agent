"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, FileDown, Mail, ArrowRight, ClipboardCheck, ChevronDown, ChevronUp, Trash2, PenTool, UserPlus } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { InspectionChecklist } from "../../_components/inspection-checklist"
import { format } from "date-fns"
import {
  createMovingOutFromMovingInAction,
  updateMovingInspectionStatusAction,
  deleteMovingInspectionAction,
  signMovingInspectionAction,
  assignInspectorToInspectionAction
} from "@/actions/moving-inspections-actions"
import { manuallyCompareMoveOutInspectionAction } from "@/actions/moving-inspection-comparisons-actions"
import {
  generateBlankInspectionPDFAction,
  generateFilledInspectionPDFAction,
  generateMoveOutReportPDFAction
} from "@/actions/inspection-pdf-actions"
import { emailInspectionToTenantAction } from "@/actions/inspection-email-actions"
import { sendInspectionToTenantAction } from "@/lib/email/moving-inspection-email-service"
import { SignaturePad } from "@/components/utility/signature-pad"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface MovingInspectionDetailProps {
  inspection: {
    id: string
    inspectionType: "moving_in" | "moving_out"
    status: "draft" | "in_progress" | "completed" | "signed"
    isLocked: boolean
    signedByLandlord: boolean
    signedByTenant: boolean
    signedByInspector?: boolean
    inspectedByThirdParty?: boolean
    inspectorName?: string | null
    inspectorEmail?: string | null
    inspectorCompany?: string | null
    inspectorPhone?: string | null
    createdAt: Date
    items: Array<{
      id: string
      name: string
      condition: "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning" | null
      isPresent: boolean | null
      notes: string | null
      category: {
        name: string
        displayOrder: number
      }
      defects: Array<{
        id: string
        description: string
        severity: "minor" | "moderate" | "major"
        isRepairable: boolean
      }>
    }>
  }
}

export function MovingInspectionDetail({ inspection }: MovingInspectionDetailProps) {
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [isChecklistOpen, setIsChecklistOpen] = useState(false)
  const [showLandlordSignatureDialog, setShowLandlordSignatureDialog] = useState(false)
  const [landlordSignatureData, setLandlordSignatureData] = useState<string | null>(null)
  const [showInspectorAssignmentDialog, setShowInspectorAssignmentDialog] = useState(false)
  const [inspectorInfo, setInspectorInfo] = useState({
    name: "",
    email: "",
    company: "",
    phone: ""
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "signed":
        return "bg-green-500"
      case "completed":
        return "bg-blue-500"
      case "in_progress":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTypeLabel = (type: string) => {
    return type === "moving_in" ? "Moving In" : "Moving Out"
  }

  // Check if inspection is fully signed (both parties have signed)
  const isThirdPartyInspection = inspection.inspectedByThirdParty === true || 
                                  (inspection.signedByInspector === true)
  
  const isFullySigned = inspection.status === "signed" || 
                       (isThirdPartyInspection 
                         ? inspection.signedByInspector && inspection.signedByTenant
                         : inspection.signedByLandlord && inspection.signedByTenant)

  const handleInitiateMoveOut = async () => {
    setProcessing(true)
    try {
      const result = await createMovingOutFromMovingInAction(inspection.id)
      if (result.isSuccess && result.data) {
        toast.success("Move-out inspection created successfully")
        router.push(`/dashboard/moving-inspections/${result.data.id}`)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error creating move-out inspection:", error)
      toast.error("Failed to create move-out inspection")
    } finally {
      setProcessing(false)
    }
  }

  const handleStatusChange = async (newStatus: "draft" | "in_progress" | "completed" | "signed") => {
    setProcessing(true)
    try {
      const result = await updateMovingInspectionStatusAction(inspection.id, newStatus)
      if (result.isSuccess) {
        toast.success("Status updated successfully")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update status")
    } finally {
      setProcessing(false)
    }
  }

  const handleGenerateBlankPDF = async () => {
    setProcessing(true)
    try {
      const result = await generateBlankInspectionPDFAction(inspection.id)
      if (result.isSuccess && result.data) {
        // Convert base64 string to blob and download
        const base64 = result.data
        const binaryString = atob(base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: "application/pdf" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `inspection-blank-${inspection.id}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success("Blank PDF generated and downloaded")
      } else {
        toast.error(result.message || "Failed to generate PDF")
      }
    } catch (error) {
      console.error("Error generating blank PDF:", error)
      toast.error("Failed to generate blank PDF")
    } finally {
      setProcessing(false)
    }
  }

  const handleGenerateFilledPDF = async () => {
    setProcessing(true)
    try {
      const result = inspection.inspectionType === "moving_out"
        ? await generateMoveOutReportPDFAction(inspection.id)
        : await generateFilledInspectionPDFAction(inspection.id)
      
      if (result.isSuccess && result.data) {
        // Convert base64 string to blob and download
        const base64 = result.data
        const binaryString = atob(base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: "application/pdf" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const fileName = inspection.inspectionType === "moving_out"
          ? `move-out-report-${inspection.id}.pdf`
          : `inspection-filled-${inspection.id}.pdf`
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success("PDF generated and downloaded")
      } else {
        toast.error(result.message || "Failed to generate PDF")
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    } finally {
      setProcessing(false)
    }
  }

  const handleEmailToTenant = async () => {
    setProcessing(true)
    try {
      const result = await emailInspectionToTenantAction(inspection.id)
      if (result.isSuccess) {
        toast.success("Email sent to tenant successfully")
      } else {
        toast.error(result.message || "Failed to send email")
      }
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error("Failed to send email to tenant")
    } finally {
      setProcessing(false)
    }
  }

  const handleManualComparison = async () => {
    setProcessing(true)
    try {
      const result = await manuallyCompareMoveOutInspectionAction(inspection.id, false)
      if (result.isSuccess) {
        toast.success(result.message || "Comparison completed successfully")
        router.refresh()
      } else {
        toast.error(result.message || "Failed to compare inspections")
      }
    } catch (error) {
      console.error("Error comparing inspections:", error)
      toast.error("Failed to compare inspections")
    } finally {
      setProcessing(false)
    }
  }

  const handleManualComparisonAndEmail = async () => {
    setProcessing(true)
    try {
      const result = await manuallyCompareMoveOutInspectionAction(inspection.id, true)
      if (result.isSuccess) {
        toast.success(result.message || "Comparison completed and report sent to tenant")
        router.refresh()
      } else {
        toast.error(result.message || "Failed to compare inspections")
      }
    } catch (error) {
      console.error("Error comparing inspections:", error)
      toast.error("Failed to compare inspections")
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this inspection? This action cannot be undone.")) {
      return
    }

    setProcessing(true)
    try {
      const result = await deleteMovingInspectionAction(inspection.id)
      if (result.isSuccess) {
        toast.success("Inspection deleted successfully")
        router.push("/dashboard/moving-inspections")
      } else {
        toast.error(result.message || "Failed to delete inspection")
      }
    } catch (error) {
      console.error("Error deleting inspection:", error)
      toast.error("Failed to delete inspection")
    } finally {
      setProcessing(false)
    }
  }

  const handleLandlordSign = async () => {
    if (!landlordSignatureData) {
      toast.error("Please provide your signature")
      return
    }

    setProcessing(true)
    try {
      const result = await signMovingInspectionAction(
        inspection.id,
        "landlord",
        { image: landlordSignatureData, signedAt: new Date().toISOString() }
      )
      if (result.isSuccess) {
        toast.success("Inspection signed successfully")
        setShowLandlordSignatureDialog(false)
        setLandlordSignatureData(null)
        router.refresh()
      } else {
        toast.error(result.message || "Failed to sign inspection")
      }
    } catch (error) {
      console.error("Error signing inspection:", error)
      toast.error("Failed to sign inspection")
    } finally {
      setProcessing(false)
    }
  }

  const handleSendToTenant = async () => {
    setProcessing(true)
    try {
      const result = await sendInspectionToTenantAction(inspection.id)
      if (result.isSuccess) {
        toast.success("Inspection sent to tenant for signature")
        router.refresh()
      } else {
        toast.error(result.message || "Failed to send inspection to tenant")
      }
    } catch (error) {
      console.error("Error sending inspection to tenant:", error)
      toast.error("Failed to send inspection to tenant")
    } finally {
      setProcessing(false)
    }
  }

  const handleAssignInspector = async () => {
    if (!inspectorInfo.name || !inspectorInfo.email || !inspectorInfo.phone) {
      toast.error("Inspector name, email, and phone are required.")
      return
    }
    setProcessing(true)
    try {
      const result = await assignInspectorToInspectionAction(inspection.id, {
        name: inspectorInfo.name,
        email: inspectorInfo.email,
        company: inspectorInfo.company,
        phone: inspectorInfo.phone
      })
      if (result.isSuccess) {
        toast.success("Inspector assigned and link sent successfully!")
        setShowInspectorAssignmentDialog(false)
        setInspectorInfo({ name: "", email: "", company: "", phone: "" })
        router.refresh()
      } else {
        toast.error(result.message || "Failed to assign inspector.")
      }
    } catch (error) {
      console.error("Error assigning inspector:", error)
      toast.error("Failed to assign inspector.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/moving-inspections">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{getTypeLabel(inspection.inspectionType)} Inspection</h1>
          <p className="text-muted-foreground">
            Created: {format(new Date(inspection.createdAt), "PPP")}
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Badge className={getStatusColor(inspection.status)}>
          {inspection.status}
        </Badge>
      </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {inspection.inspectionType === "moving_in" &&
          (inspection.status === "completed" || inspection.status === "signed") && (
            <Button onClick={handleInitiateMoveOut} disabled={processing}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Initiate Move-Out Inspection
            </Button>
          )}
        
        {/* PDF Generation - Available at all statuses */}
        <Button onClick={handleGenerateBlankPDF} variant="outline" disabled={processing}>
          <FileDown className="mr-2 h-4 w-4" />
          Generate Blank PDF
        </Button>
        <Button onClick={handleGenerateFilledPDF} variant="outline" disabled={processing}>
          <FileDown className="mr-2 h-4 w-4" />
          {inspection.inspectionType === "moving_out" ? "Generate Report PDF" : "Generate Filled PDF"}
        </Button>
        
        {/* Manual Comparison - Only for move-out inspections */}
        {inspection.inspectionType === "moving_out" && (
          <>
            <Button onClick={handleManualComparison} variant="outline" disabled={processing}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Compare with Move-In
            </Button>
            <Button onClick={handleManualComparisonAndEmail} variant="outline" disabled={processing}>
              <Mail className="mr-2 h-4 w-4" />
              Compare & Email Report
            </Button>
          </>
        )}
        
        {/* Landlord Signing - Only for direct inspections (not third-party) */}
        {inspection.status === "completed" && 
         !inspection.signedByLandlord && 
         !inspection.inspectedByThirdParty && (
          <Button onClick={() => setShowLandlordSignatureDialog(true)} disabled={processing}>
            <PenTool className="mr-2 h-4 w-4" />
            Sign as Landlord/Agent
          </Button>
        )}

        {/* Send to Tenant - Only when landlord has signed (direct) or inspector has signed (third-party) and tenant hasn't */}
        {((inspection.signedByLandlord && !inspection.inspectedByThirdParty) || 
          (inspection.signedByInspector && inspection.inspectedByThirdParty)) && 
         !inspection.signedByTenant && (
          <Button onClick={handleSendToTenant} variant="outline" disabled={processing}>
            <Mail className="mr-2 h-4 w-4" />
            Send to Tenant for Signature
          </Button>
        )}

        {/* Assign to Third-Party Inspector - Only when not yet assigned and not signed by inspector */}
        {!inspection.signedByInspector && inspection.status !== "signed" && (
          <Button onClick={() => setShowInspectorAssignmentDialog(true)} variant="outline" disabled={processing}>
            <UserPlus className="mr-2 h-4 w-4" />
            Assign to Third-Party Inspector
          </Button>
        )}
        
        {/* Status Change Buttons */}
        {inspection.status === "draft" && (
          <Button onClick={() => handleStatusChange("in_progress")} variant="outline" disabled={processing}>
            Mark as In Progress
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {inspection.status === "in_progress" && (
          <Button onClick={() => handleStatusChange("completed")} variant="outline" disabled={processing}>
            Mark as Completed
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        
        {/* Delete Button - Available even when locked */}
        <Button 
          onClick={handleDelete} 
          variant="destructive" 
          disabled={processing}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Inspection
        </Button>
      </div>

      {/* Signature Status Badges */}
      <div className="flex items-center gap-2">
        {inspection.signedByLandlord && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            ✓ Landlord/Agent Signed
          </Badge>
        )}
        {inspection.signedByTenant && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            ✓ Tenant Signed
          </Badge>
        )}
        {inspection.status === "signed" && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Fully Signed
          </Badge>
        )}
      </div>

      {inspection.isLocked && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">Structure Locked</Badge>
          <span>
            {isFullySigned 
              ? "This inspection has been fully signed and is locked from all edits."
              : "Only condition, notes, and comments can be updated"}
          </span>
        </div>
      )}
      {isFullySigned && !inspection.isLocked && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Fully Signed
          </Badge>
          <span>This inspection has been fully signed and is locked from all edits.</span>
        </div>
      )}

      {/* Landlord Signature Dialog */}
      <Dialog open={showLandlordSignatureDialog} onOpenChange={setShowLandlordSignatureDialog}>
        <DialogContent className="max-w-5xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>Sign as Landlord/Agent</DialogTitle>
            <DialogDescription>
              Please sign this inspection report. Once signed, you can send it to the tenant for their signature.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {landlordSignatureData ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-white">
                  <p className="text-sm text-muted-foreground mb-2">Your Signature:</p>
                  <img src={landlordSignatureData} alt="Signature" className="max-w-xs border rounded" />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setLandlordSignatureData(null)
                    }}
                    variant="outline"
                  >
                    Change Signature
                  </Button>
                  <Button onClick={handleLandlordSign} disabled={processing}>
                    {processing ? "Signing..." : "Confirm and Sign"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center w-full">
                <SignaturePad
                  onSign={(data) => {
                    setLandlordSignatureData(data)
                  }}
                  onCancel={() => setShowLandlordSignatureDialog(false)}
                  width={440}
                  height={200}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspector Assignment Dialog */}
      <Dialog open={showInspectorAssignmentDialog} onOpenChange={setShowInspectorAssignmentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign to Third-Party Inspector</DialogTitle>
            <DialogDescription>
              Enter the inspector's information. They will receive an email with a secure link to access and complete the inspection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inspector-name">Inspector Name *</Label>
              <Input
                id="inspector-name"
                value={inspectorInfo.name}
                onChange={(e) => setInspectorInfo({ ...inspectorInfo, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspector-email">Email *</Label>
              <Input
                id="inspector-email"
                type="email"
                value={inspectorInfo.email}
                onChange={(e) => setInspectorInfo({ ...inspectorInfo, email: e.target.value })}
                placeholder="inspector@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspector-company">Company *</Label>
              <Input
                id="inspector-company"
                value={inspectorInfo.company}
                onChange={(e) => setInspectorInfo({ ...inspectorInfo, company: e.target.value })}
                placeholder="ABC Inspection Services"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspector-phone">Phone *</Label>
              <Input
                id="inspector-phone"
                type="tel"
                value={inspectorInfo.phone}
                onChange={(e) => setInspectorInfo({ ...inspectorInfo, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInspectorAssignmentDialog(false)
                  setInspectorInfo({ name: "", email: "", company: "", phone: "" })
                }}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button onClick={handleAssignInspector} disabled={processing}>
                {processing ? "Assigning..." : "Assign Inspector"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <Collapsible open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
          <CardTitle>Inspection Checklist</CardTitle>
          <CardDescription>
                    {inspection.isLocked
                      ? "Update Yes/No status and comments for each item"
                      : "Review and update items for this inspection"}
          </CardDescription>
                </div>
                {isChecklistOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
        </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
        <CardContent>
              <InspectionChecklist
                inspectionId={inspection.id}
                inspectionType={inspection.inspectionType}
                isLocked={inspection.isLocked}
                isReadOnly={isFullySigned}
                items={inspection.items}
              />
        </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}

