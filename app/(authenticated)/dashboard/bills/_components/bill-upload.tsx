"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Upload } from "lucide-react"
import { toast } from "sonner"

interface BillUploadProps {
  propertyId: string
  onSuccess?: () => void
}

export function BillUpload({ propertyId, onSuccess }: BillUploadProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [billType, setBillType] = useState<string>("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file")
        return
      }
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !billType) {
      toast.error("Please select a file and bill type")
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("propertyId", propertyId)
      formData.append("billType", billType)
      formData.append("source", "manual_upload")

      const response = await fetch("/api/bills/upload", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Bill uploaded successfully!")
        if (onSuccess) {
          onSuccess()
        } else {
          router.refresh()
        }
        // Reset form
        setFile(null)
        setBillType("")
      } else {
        toast.error(data.error || "Failed to upload bill")
      }
    } catch (error) {
      toast.error("Failed to upload bill")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="billType">Bill Type *</Label>
        <Select value={billType} onValueChange={setBillType} required>
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
        <Label htmlFor="file">PDF File *</Label>
        <div className="flex items-center gap-4">
          <Input
            id="file"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            required
            className="cursor-pointer"
          />
          {file && (
            <span className="text-muted-foreground text-sm">{file.name}</span>
          )}
        </div>
      </div>
      <Button type="submit" disabled={loading || !file || !billType}>
        <Upload className="mr-2 h-4 w-4" />
        {loading ? "Uploading..." : "Upload Bill"}
      </Button>
    </form>
  )
}

