"use client"

import { useState } from "react"
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
import { Upload, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface IncidentDetailsStepProps {
  onComplete: (data: {
    title: string
    description: string
    priority: "low" | "medium" | "high" | "urgent"
    files?: File[]
  }) => void
  onBack: () => void
}

export function IncidentDetailsStep({ onComplete, onBack }: IncidentDetailsStepProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [files, setFiles] = useState<File[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      return
    }
    onComplete({ title, description, priority, files: files.length > 0 ? files : undefined })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Issue Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief description of the issue"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide detailed information about the issue..."
          rows={5}
          required
        />
      </div>

      <div>
        <Label htmlFor="priority">Priority *</Label>
        <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low - Non-urgent</SelectItem>
            <SelectItem value="medium">Medium - Normal</SelectItem>
            <SelectItem value="high">High - Important</SelectItem>
            <SelectItem value="urgent">Urgent - Emergency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="photos">Photos (Optional)</Label>
        <div className="border-2 border-dashed rounded-md p-4">
          <div className="flex flex-col items-center justify-center">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <label htmlFor="file-input" className="cursor-pointer">
              <span className="text-sm text-muted-foreground">Click to upload photos</span>
              <Input
                id="file-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Upload images of the issue (JPEG, PNG - max 10MB each)
            </p>
          </div>
        </div>
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                <span className="max-w-[200px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={!title.trim() || !description.trim()}>
          Continue
        </Button>
      </div>
    </form>
  )
}

