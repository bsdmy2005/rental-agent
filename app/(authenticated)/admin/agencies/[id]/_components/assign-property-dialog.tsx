"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { assignAgencyToPropertyAction } from "@/actions/property-managements-actions"
import { getAllPropertiesAction } from "@/actions/properties-actions"
import { toast } from "sonner"
import type { SelectProperty } from "@/db/schema"

interface AssignPropertyDialogProps {
  agencyId: string
}

export function AssignPropertyDialog({ agencyId }: AssignPropertyDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<SelectProperty[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")

  useEffect(() => {
    if (open) {
      loadProperties()
    }
  }, [open])

  const loadProperties = async () => {
    try {
      // Get all properties - in a real app, you might want to filter out already assigned ones
      const result = await getAllPropertiesAction()
      if (result.isSuccess && result.data) {
        setProperties(result.data)
      } else {
        toast.error(result.message || "Failed to load properties")
      }
    } catch (error) {
      console.error("Error loading properties:", error)
      toast.error("Failed to load properties")
    }
  }

  const handleSubmit = async () => {
    if (!selectedPropertyId) {
      toast.error("Please select a property")
      return
    }

    setLoading(true)

    try {
      const result = await assignAgencyToPropertyAction(selectedPropertyId, agencyId, {
        isActive: true
      })

      if (result.isSuccess) {
        toast.success("Property assigned to agency successfully")
        setOpen(false)
        setSelectedPropertyId("")
        window.location.reload()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to assign property")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Assign Property</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Property to Agency</DialogTitle>
          <DialogDescription>
            Select a property to assign to this agency. All agents in the agency will have access.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Property</label>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name} - {property.streetAddress}, {property.suburb}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading || !selectedPropertyId}>
            {loading ? "Assigning..." : "Assign Property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

