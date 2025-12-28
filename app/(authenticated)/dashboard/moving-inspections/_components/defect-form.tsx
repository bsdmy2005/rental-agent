"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createMovingInspectionDefectAction } from "@/actions/moving-inspections-actions"
import { toast } from "sonner"

interface DefectFormProps {
  itemId: string
  inspectionId: string
}

export function DefectForm({ itemId, inspectionId }: DefectFormProps) {
  const [description, setDescription] = useState("")
  const [severity, setSeverity] = useState<"minor" | "moderate" | "major">("minor")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await createMovingInspectionDefectAction({
      itemId,
      description,
      severity
    })

    if (result.isSuccess) {
      toast.success("Defect added successfully")
      setDescription("")
      setSeverity("minor")
    } else {
      toast.error(result.message)
    }

    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4 mt-4">
      <div>
        <Label htmlFor="description">Defect Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the defect..."
          required
        />
      </div>
      <div>
        <Label htmlFor="severity">Severity</Label>
        <Select value={severity} onValueChange={(value: any) => setSeverity(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minor">Minor</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="major">Major</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Add Defect
      </Button>
    </form>
  )
}

