"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, FileText } from "lucide-react"
import { toast } from "sonner"

interface SampleUploadProps {
  ruleId: string
  onUploadSuccess?: () => void
}

export function SampleUpload({ ruleId, onUploadSuccess }: SampleUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      )
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one PDF file")
      return
    }

    setUploading(true)

    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`/api/rules/${ruleId}/samples/upload`, {
          method: "POST",
          body: formData
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to upload file")
        }
      }

      toast.success(`Successfully uploaded ${files.length} sample(s)`)
      setFiles([])
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (error) {
      console.error("Error uploading samples:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload samples")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="sample-files">Upload Sample PDFs</Label>
        <div className="mt-2">
          <Input
            id="sample-files"
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileChange}
            className="cursor-pointer"
            disabled={uploading}
          />
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Upload sample bills/invoices to test your extraction rule
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Files:</p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : `Upload ${files.length} Sample(s)`}
          </Button>
        </div>
      )}
    </div>
  )
}

