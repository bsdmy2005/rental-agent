"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { assignIncidentAction, updateIncidentStatusAction } from "@/actions/incidents-actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { SelectIncident } from "@/db/schema"

interface IncidentManagementControlsProps {
  incident: SelectIncident
  propertyId: string
  currentUserId: string
  propertySuburb: string
  propertyProvince: string
}

export function IncidentManagementControls({
  incident,
  propertyId,
  currentUserId,
  propertySuburb,
  propertyProvince
}: IncidentManagementControlsProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(incident.status)
  const [notes, setNotes] = useState("")

  const handleStatusChange = async () => {
    if (status === incident.status) {
      toast.info("Status unchanged")
      return
    }

    setLoading(true)
    try {
      const result = await updateIncidentStatusAction(incident.id, status, currentUserId, notes)
      if (result.isSuccess) {
        toast.success("Incident status updated successfully")
        window.location.reload()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error updating incident status:", error)
      toast.error("Failed to update incident status")
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async () => {
    setLoading(true)
    try {
      const result = await assignIncidentAction(incident.id, currentUserId)
      if (result.isSuccess) {
        toast.success("Incident assigned successfully")
        window.location.reload()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error assigning incident:", error)
      toast.error("Failed to assign incident")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="status">Update Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="awaiting_quote">Awaiting Quote</SelectItem>
            <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this status change..."
          rows={3}
        />
      </div>

      <Button onClick={handleStatusChange} disabled={loading} className="w-full">
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Update Status
      </Button>

      {incident.status === "reported" && !incident.assignedTo && (
        <Button onClick={handleAssign} disabled={loading} variant="outline" className="w-full">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Assign to Me
        </Button>
      )}
    </div>
  )
}

