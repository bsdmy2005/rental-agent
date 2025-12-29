"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RfqProviderSelection } from "@/components/rfq-provider-selection"
import { createBulkRfqAction } from "@/actions/service-providers-actions"
import { toast } from "sonner"
import { Loader2, Upload, X, FileText } from "lucide-react"

interface NewRfqFormProps {
  properties: Array<{ id: string; name: string; suburb: string; province: string }>
  requestedBy: string
}

export function NewRfqForm({ properties, requestedBy }: NewRfqFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    notes: ""
  })
  const [sendChannel, setSendChannel] = useState<"email" | "whatsapp" | "both">("both")

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter((file) => {
        const isImage = file.type.startsWith("image/")
        const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
        const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB

        if (!isImage && !isPDF) {
          toast.error(`${file.name}: Only PDF and image files are allowed`)
          return false
        }
        if (!isValidSize) {
          toast.error(`${file.name}: File size exceeds 10MB limit`)
          return false
        }
        return true
      })
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadFiles(rfqCode: string) {
    if (files.length === 0) return

    setUploadingFiles(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("rfqCode", rfqCode)

        const response = await fetch("/api/rfqs/upload", {
          method: "POST",
          body: formData
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || `Failed to upload ${file.name}`)
        }
      }
    } catch (error) {
      console.error("Error uploading files:", error)
      throw error
    } finally {
      setUploadingFiles(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedPropertyId) {
      toast.error("Please select a property")
      return
    }

    if (!formData.title) {
      toast.error("Title is required")
      return
    }

    if (selectedProviderIds.length === 0) {
      toast.error("Please select at least one service provider")
      return
    }

    setLoading(true)
    try {
      console.log("Creating bulk RFQ with providers:", {
        providerCount: selectedProviderIds.length,
        providerIds: selectedProviderIds,
        channel: sendChannel
      })

      const result = await createBulkRfqAction(
        {
          propertyId: selectedPropertyId,
          title: formData.title,
          description: formData.description || null,
          requestedBy,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
          notes: formData.notes || null
        },
        selectedProviderIds,
        sendChannel
      )

      if (result.isSuccess && result.data) {
        // Upload files if any
        if (files.length > 0 && result.data.rfqCode) {
          try {
            await uploadFiles(result.data.rfqCode)
            toast.success(`RFQ sent to ${selectedProviderIds.length} provider(s) with ${files.length} attachment(s)`)
          } catch (error) {
            toast.error(`RFQ created but failed to upload some files: ${error instanceof Error ? error.message : "Unknown error"}`)
          }
        } else {
          toast.success(`RFQ sent to ${selectedProviderIds.length} provider(s) successfully`)
        }
        router.push(`/dashboard/rfqs/${result.data.rfqId}`)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error creating RFQ:", error)
      toast.error("Failed to create RFQ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="property">
          Property <span className="text-destructive">*</span>
        </Label>
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name} - {property.suburb}, {property.province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Kitchen Renovation Quote"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the work or service needed..."
          rows={5}
        />
      </div>

      {selectedProperty && (
        <div>
          <Label>Select Service Providers <span className="text-destructive">*</span></Label>
          <RfqProviderSelection
            propertySuburb={selectedProperty.suburb}
            propertyProvince={selectedProperty.province}
            selectedProviderIds={selectedProviderIds}
            onSelectionChange={setSelectedProviderIds}
          />
        </div>
      )}

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
          placeholder="Add any additional information for the service providers..."
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

      <div>
        <Label>Attachments (Optional)</Label>
        <div className="border-2 border-dashed rounded-md p-4">
          <div className="flex flex-col items-center justify-center">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-sm text-muted-foreground">Click to upload PDFs or images</span>
              <Input
                id="file-upload"
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={loading || uploadingFiles}
              />
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              PDFs and images (JPEG, PNG) - max 10MB each
            </p>
          </div>
        </div>
        {files.length > 0 && (
          <div className="mt-2 space-y-2">
            <p className="text-sm font-medium">Selected files:</p>
            <div className="flex flex-wrap gap-2">
              {files.map((file, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span className="max-w-[200px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="ml-1 hover:text-destructive"
                    disabled={loading || uploadingFiles}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading || uploadingFiles || !selectedPropertyId || selectedProviderIds.length === 0} className="flex-1">
          {(loading || uploadingFiles) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {uploadingFiles ? "Uploading files..." : `Create RFQ${selectedProviderIds.length > 0 ? ` (${selectedProviderIds.length} providers)` : ""}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

