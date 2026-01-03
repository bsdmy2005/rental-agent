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
import { assignRentalAgentToPropertyAction } from "@/actions/property-managements-actions"
import { getAgencyPropertiesAction } from "@/actions/db/agency-properties-actions"
import { getAgencyMembersAction } from "@/actions/db/agency-members-actions"
import { toast } from "sonner"
import type { SelectProperty, SelectRentalAgent, SelectUserProfile } from "@/db/schema"

interface AssignPropertyToAgentDialogProps {
  agencyId: string
}

export function AssignPropertyToAgentDialog({ agencyId }: AssignPropertyToAgentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<SelectProperty[]>([])
  const [agents, setAgents] = useState<Array<SelectRentalAgent & { userProfile: SelectUserProfile }>>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")

  const loadData = async () => {
    try {
      // Get only properties assigned to this agency
      const propertiesResult = await getAgencyPropertiesAction(agencyId)
      if (propertiesResult.isSuccess && propertiesResult.data) {
        setProperties(propertiesResult.data)
      } else {
        toast.error(propertiesResult.message || "Failed to load agency properties")
      }

      // Get agency members
      const membersResult = await getAgencyMembersAction(agencyId, "approved")
      if (membersResult.isSuccess && membersResult.data) {
        setAgents(
          membersResult.data.map((m) => ({
            ...m.rentalAgent,
            userProfile: m.rentalAgent.userProfile
          }))
        )
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load data")
    }
  }

  useEffect(() => {
    if (open) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agencyId])

  const handleSubmit = async () => {
    if (!selectedPropertyId || !selectedAgentId) {
      toast.error("Please select both a property and an agent")
      return
    }

    setLoading(true)

    try {
      const result = await assignRentalAgentToPropertyAction(
        selectedPropertyId,
        selectedAgentId,
        {
          isActive: true
        }
      )

      if (result.isSuccess) {
        toast.success("Property assigned to agent successfully")
        setOpen(false)
        setSelectedPropertyId("")
        setSelectedAgentId("")
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
        <Button variant="outline">Assign Property to Agent</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Property to Agent</DialogTitle>
          <DialogDescription>
            Assign a property that belongs to your agency to a specific agent. This gives the agent individual access to the property in addition to agency-wide access.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Property *</label>
            {properties.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2 border rounded">
                No properties assigned to your agency yet. Assign properties to your agency first from the admin panel.
              </div>
            ) : (
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
            )}
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Agent *</label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.userProfile.firstName} {agent.userProfile.lastName} ({agent.userProfile.email})
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
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !selectedPropertyId || !selectedAgentId || properties.length === 0}
          >
            {loading ? "Assigning..." : "Assign Property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

