"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ArrowRight } from "lucide-react"

export interface InspectorInfo {
  name: string
  email: string
  company: string
  phone: string
}

interface InspectorAssignmentStepProps {
  onComplete: (inspectorType: "direct" | "third_party", inspectorInfo?: InspectorInfo) => void
}

export function InspectorAssignmentStep({ onComplete }: InspectorAssignmentStepProps) {
  const [inspectorType, setInspectorType] = useState<"direct" | "third_party" | null>(null)
  const [inspectorInfo, setInspectorInfo] = useState<InspectorInfo>({
    name: "",
    email: "",
    company: "",
    phone: ""
  })

  const handleNext = () => {
    if (!inspectorType) {
      return
    }

    if (inspectorType === "third_party") {
      // Validate third-party inspector info
      if (!inspectorInfo.name || !inspectorInfo.email || !inspectorInfo.phone) {
        return
      }
      onComplete(inspectorType, inspectorInfo)
    } else {
      onComplete(inspectorType)
    }
  }

  const isValid = inspectorType === "direct" || 
    (inspectorType === "third_party" && 
     inspectorInfo.name.trim() !== "" && 
     inspectorInfo.email.trim() !== "" && 
     inspectorInfo.phone.trim() !== "")

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Who will perform this inspection?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose whether you or a third-party inspection agency will conduct this inspection.
        </p>
      </div>

      <RadioGroup
        value={inspectorType || undefined}
        onValueChange={(value) => setInspectorType(value as "direct" | "third_party")}
        className="space-y-4"
      >
        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
          <RadioGroupItem value="direct" id="direct" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="direct" className="cursor-pointer font-semibold">
              Landlord/Agent (Direct)
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              You or your team will perform the inspection directly.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
          <RadioGroupItem value="third_party" id="third_party" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="third_party" className="cursor-pointer font-semibold">
              Third-Party Inspection Agency
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              A third-party inspection agency will perform the inspection. They will receive an email with a secure link to complete the inspection.
            </p>
          </div>
        </div>
      </RadioGroup>

      {inspectorType === "third_party" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Inspector Information</CardTitle>
            <CardDescription>
              Enter the details of the third-party inspector. They will receive an email with access to complete the inspection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label htmlFor="inspector-company">Company</Label>
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
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} disabled={!isValid}>
          Next: Configure Property
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

