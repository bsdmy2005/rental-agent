"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { createBulkRfqAction } from "@/actions/service-providers-actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { RfqProviderSelection } from "@/components/rfq-provider-selection"

interface QuoteRequestFormProps {
  incidentId: string
  propertyId: string
  propertySuburb: string
  propertyProvince: string
  requestedBy: string // userProfileId
}

export function QuoteRequestForm({
  incidentId,
  propertyId,
  propertySuburb,
  propertyProvince,
  requestedBy
}: QuoteRequestFormProps) {
  const [loading, setLoading] = useState(false)
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([])
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
      const result = await createBulkRfqAction(
        {
          propertyId,
          incidentId,
          requestedBy,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
          notes: formData.notes || null
        },
        selectedProviderIds,
        "email"
      )

      if (result.isSuccess) {
        toast.success(`RFQ sent to ${selectedProviderIds.length} provider(s) successfully`)
        setFormData({ notes: "", dueDate: "" })
        setSelectedProviderIds([])
        window.location.reload()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error creating bulk RFQ:", error)
      toast.error("Failed to create quote request")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4 mt-4">
      <h3 className="font-semibold">Request Quote</h3>
      
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

      <Button type="submit" disabled={loading || selectedProviderIds.length === 0} className="w-full">
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Send Quote Request{selectedProviderIds.length > 0 ? ` (${selectedProviderIds.length} providers)` : ""}
      </Button>
    </form>
  )
}

