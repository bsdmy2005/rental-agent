"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { createRfqFromIncidentAction } from "@/actions/incident-rfq-actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { RfqProviderSelection } from "@/components/rfq-provider-selection"
import { useRouter } from "next/navigation"

interface QuoteRequestFormProps {
  incidentId: string
  propertyId: string
  propertySuburb: string
  propertyProvince: string
  requestedBy: string // userProfileId
  onSuccess?: () => void
}

export function QuoteRequestForm({
  incidentId,
  propertyId,
  propertySuburb,
  propertyProvince,
  requestedBy,
  onSuccess
}: QuoteRequestFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([])
  const [sendChannel, setSendChannel] = useState<"email" | "whatsapp" | "both">("both")
  const [formData, setFormData] = useState({
    notes: "",
    dueDate: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedProviderIds.length === 0) {
      toast.error("Please select at least one service provider")
      return
    }

    setLoading(true)
    try {
      const result = await createRfqFromIncidentAction(
        incidentId,
        selectedProviderIds,
        requestedBy,
        {
          notes: formData.notes || null,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
          channel: sendChannel
        }
      )

      if (result.isSuccess && result.data) {
        toast.success(`RFQ sent to ${selectedProviderIds.length} provider(s) successfully`)
        setFormData({ notes: "", dueDate: "" })
        setSelectedProviderIds([])
        
        // Call onSuccess callback if provided (e.g., to close dialog)
        if (onSuccess) {
          onSuccess()
        } else {
          // Navigate to RFQ detail page or refresh
          if (result.data.rfqId) {
            router.push(`/dashboard/rfqs/${result.data.rfqId}`)
          } else {
            window.location.reload()
          }
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error creating RFQ from incident:", error)
      toast.error("Failed to create quote request")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      <div>
        <Label>Select Service Providers *</Label>
        <RfqProviderSelection
          propertySuburb={propertySuburb}
          propertyProvince={propertyProvince}
          selectedProviderIds={selectedProviderIds}
          onSelectionChange={setSelectedProviderIds}
        />
      </div>

      <div>
        <Label htmlFor="dueDate">Quote Due Date (Optional)</Label>
        <Input
          id="dueDate"
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="notes">Additional Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Add any additional information for the service provider..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="sendChannel">Send Via</Label>
        <Select value={sendChannel} onValueChange={(value: "email" | "whatsapp" | "both") => setSendChannel(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">Email & WhatsApp</SelectItem>
            <SelectItem value="email">Email Only</SelectItem>
            <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how to send the RFQ to service providers
        </p>
      </div>

      <Button type="submit" disabled={loading || selectedProviderIds.length === 0} className="w-full">
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Send Quote Request{selectedProviderIds.length > 0 ? ` (${selectedProviderIds.length} providers)` : ""}
      </Button>
    </form>
  )
}

