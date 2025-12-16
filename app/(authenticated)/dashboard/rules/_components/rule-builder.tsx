"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { createExtractionRuleAction } from "@/actions/extraction-rules-actions"
import { toast } from "sonner"

interface RuleBuilderProps {
  userProfileId: string
  propertyId?: string
  onSuccess?: () => void
}

export function RuleBuilder({ userProfileId, propertyId, onSuccess }: RuleBuilderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    billType: "",
    channel: "",
    emailFilterFrom: "",
    emailFilterSubject: "",
    extractionConfig: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let extractionConfig = {}
      try {
        extractionConfig = formData.extractionConfig
          ? JSON.parse(formData.extractionConfig)
          : {}
      } catch (error) {
        toast.error("Invalid JSON in extraction config")
        setLoading(false)
        return
      }

      const emailFilter =
        formData.emailFilterFrom || formData.emailFilterSubject
          ? {
              from: formData.emailFilterFrom || undefined,
              subject: formData.emailFilterSubject || undefined
            }
          : undefined

      const result = await createExtractionRuleAction({
        userProfileId,
        propertyId: propertyId || undefined,
        name: formData.name,
        billType: formData.billType as "municipality" | "levy" | "utility" | "other",
        channel: formData.channel as "email_forward" | "manual_upload",
        emailFilter: emailFilter as any,
        extractionConfig: extractionConfig as any,
        isActive: true,
        version: 1
      })

      if (result.isSuccess) {
        toast.success("Extraction rule created successfully!")
        if (onSuccess) {
          onSuccess()
        } else {
          router.refresh()
        }
        // Reset form
        setFormData({
          name: "",
          billType: "",
          channel: "",
          emailFilterFrom: "",
          emailFilterSubject: "",
          extractionConfig: ""
        })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to create extraction rule")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Rule Name *</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., City of Johannesburg Municipality Bill"
        />
      </div>
      <div>
        <Label htmlFor="billType">Bill Type *</Label>
        <Select value={formData.billType} onValueChange={(value) => setFormData({ ...formData, billType: value })} required>
          <SelectTrigger>
            <SelectValue placeholder="Select bill type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="municipality">Municipality</SelectItem>
            <SelectItem value="levy">Levy</SelectItem>
            <SelectItem value="utility">Utility</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="channel">Channel *</Label>
        <Select value={formData.channel} onValueChange={(value) => setFormData({ ...formData, channel: value })} required>
          <SelectTrigger>
            <SelectValue placeholder="Select channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email_forward">Email Forward</SelectItem>
            <SelectItem value="manual_upload">Manual Upload</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formData.channel === "email_forward" && (
        <>
          <div>
            <Label htmlFor="emailFilterFrom">Email From (Optional)</Label>
            <Input
              id="emailFilterFrom"
              value={formData.emailFilterFrom}
              onChange={(e) => setFormData({ ...formData, emailFilterFrom: e.target.value })}
              placeholder="e.g., bills@cityofjhb.gov.za"
            />
          </div>
          <div>
            <Label htmlFor="emailFilterSubject">Email Subject Contains (Optional)</Label>
            <Input
              id="emailFilterSubject"
              value={formData.emailFilterSubject}
              onChange={(e) => setFormData({ ...formData, emailFilterSubject: e.target.value })}
              placeholder="e.g., Municipality Bill"
            />
          </div>
        </>
      )}
      <div>
        <Label htmlFor="extractionConfig">Extraction Config (JSON) *</Label>
        <Textarea
          id="extractionConfig"
          required
          value={formData.extractionConfig}
          onChange={(e) => setFormData({ ...formData, extractionConfig: e.target.value })}
          placeholder='{"fieldMappings": {"water": "Water Charges", "electricity": "Electricity Charges"}}'
          rows={6}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Define field mappings and extraction patterns as JSON
        </p>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Rule"}
      </Button>
    </form>
  )
}

