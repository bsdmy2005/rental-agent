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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  bulkAssignPropertiesToAgentAction,
  bulkDeassignPropertiesFromAgentAction
} from "@/actions/property-managements-actions"
import { getAgencyPropertiesAction } from "@/actions/db/agency-properties-actions"
import { getAgencyMembersAction } from "@/actions/db/agency-members-actions"
import { getAgentPropertyAssignmentsAction } from "@/actions/db/agent-properties-actions"
import { toast } from "sonner"
import type { SelectProperty } from "@/db/schema"
import type { SelectRentalAgent } from "@/db/schema"

interface ManageAgentPropertiesDialogProps {
  agencyId: string
}

export function ManageAgentPropertiesDialog({
  agencyId
}: ManageAgentPropertiesDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"assign" | "deassign">("assign")
  const [properties, setProperties] = useState<SelectProperty[]>([])
  const [agents, setAgents] = useState<Array<SelectRentalAgent & { userProfile: any }>>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set())
  const [assignedProperties, setAssignedProperties] = useState<
    Array<{ property: SelectProperty; managementId: string }>
  >([])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, agencyId])

  useEffect(() => {
    if (selectedAgentId && activeTab === "deassign") {
      loadAssignedProperties()
    }
    // Reset selections when agent or tab changes
    setSelectedPropertyIds(new Set())
  }, [selectedAgentId, activeTab])

  const loadData = async () => {
    try {
      // Get only properties assigned to this agency
      const propertiesResult = await getAgencyPropertiesAction(agencyId)
      if (propertiesResult.isSuccess && propertiesResult.data) {
        setProperties(propertiesResult.data)
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

  const loadAssignedProperties = async () => {
    try {
      const result = await getAgentPropertyAssignmentsAction(selectedAgentId)
      if (result.isSuccess && result.data) {
        // Filter to only show properties that belong to this agency
        const agencyPropertyIds = new Set(properties.map((p) => p.id))
        const filtered = result.data
          .filter((assignment) => agencyPropertyIds.has(assignment.property.id))
          .map((assignment) => ({
            property: assignment.property,
            managementId: assignment.id
          }))
        setAssignedProperties(filtered)
      }
    } catch (error) {
      console.error("Error loading assigned properties:", error)
    }
  }

  const handleSelectAll = () => {
    if (activeTab === "assign") {
      if (selectedPropertyIds.size === properties.length) {
        setSelectedPropertyIds(new Set())
      } else {
        setSelectedPropertyIds(new Set(properties.map((p) => p.id)))
      }
    } else {
      if (selectedPropertyIds.size === assignedProperties.length) {
        setSelectedPropertyIds(new Set())
      } else {
        setSelectedPropertyIds(new Set(assignedProperties.map((ap) => ap.property.id)))
      }
    }
  }

  const handlePropertyToggle = (propertyId: string) => {
    const newSet = new Set(selectedPropertyIds)
    if (newSet.has(propertyId)) {
      newSet.delete(propertyId)
    } else {
      newSet.add(propertyId)
    }
    setSelectedPropertyIds(newSet)
  }

  const handleAssign = async () => {
    if (!selectedAgentId || selectedPropertyIds.size === 0) {
      toast.error("Please select an agent and at least one property")
      return
    }

    setLoading(true)

    try {
      const propertyIdsArray = Array.from(selectedPropertyIds)
      const result = await bulkAssignPropertiesToAgentAction(propertyIdsArray, selectedAgentId, {
        isActive: true
      })

      if (result.isSuccess) {
        toast.success(`Successfully assigned ${propertyIdsArray.length} properties`)
        setOpen(false)
        setSelectedAgentId("")
        setSelectedPropertyIds(new Set())
        window.location.reload()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to assign properties")
    } finally {
      setLoading(false)
    }
  }

  const handleDeassign = async () => {
    if (!selectedAgentId || selectedPropertyIds.size === 0) {
      toast.error("Please select an agent and at least one property")
      return
    }

    if (
      !confirm(
        `Are you sure you want to remove access to ${selectedPropertyIds.size} properties from this agent?`
      )
    ) {
      return
    }

    setLoading(true)

    try {
      const propertyIdsArray = Array.from(selectedPropertyIds)
      const result = await bulkDeassignPropertiesFromAgentAction(
        propertyIdsArray,
        selectedAgentId
      )

      if (result.isSuccess) {
        toast.success(`Successfully deassigned ${propertyIdsArray.length} properties`)
        setOpen(false)
        setSelectedAgentId("")
        setSelectedPropertyIds(new Set())
        setAssignedProperties([])
        window.location.reload()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to deassign properties")
    } finally {
      setLoading(false)
    }
  }

  const availableProperties =
    activeTab === "assign"
      ? properties
      : assignedProperties.map((ap) => ap.property)

  const allSelected =
    availableProperties.length > 0 &&
    selectedPropertyIds.size === availableProperties.length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Manage Agent Properties</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Agent Property Access</DialogTitle>
          <DialogDescription>
            Assign or deassign properties to agents in your agency. Use "Select All" to assign/deassign all properties at once.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "assign" | "deassign")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assign">Assign Properties</TabsTrigger>
            <TabsTrigger value="deassign">Deassign Properties</TabsTrigger>
          </TabsList>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Agent *</label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.userProfile.firstName} {agent.userProfile.lastName} (
                      {agent.userProfile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="assign" className="space-y-4">
              {properties.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2 border rounded">
                  No properties assigned to your agency yet. Assign properties to your agency first
                  from the admin panel.
                </div>
              ) : !selectedAgentId ? (
                <div className="text-sm text-muted-foreground p-2 border rounded">
                  Please select an agent first
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Properties</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {allSelected ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                    {properties.map((property) => (
                      <div
                        key={property.id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
                      >
                        <Checkbox
                          id={`assign-${property.id}`}
                          checked={selectedPropertyIds.has(property.id)}
                          onCheckedChange={() => handlePropertyToggle(property.id)}
                        />
                        <Label
                          htmlFor={`assign-${property.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {property.name} - {property.streetAddress}, {property.suburb}
                        </Label>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="deassign" className="space-y-4">
              {!selectedAgentId ? (
                <div className="text-sm text-muted-foreground p-2 border rounded">
                  Please select an agent first
                </div>
              ) : assignedProperties.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2 border rounded">
                  This agent has no individually assigned properties. They only have access through
                  agency-wide assignments.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Assigned Properties</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {allSelected ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                    {assignedProperties.map((ap) => (
                      <div
                        key={ap.property.id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
                      >
                        <Checkbox
                          id={`deassign-${ap.property.id}`}
                          checked={selectedPropertyIds.has(ap.property.id)}
                          onCheckedChange={() => handlePropertyToggle(ap.property.id)}
                        />
                        <Label
                          htmlFor={`deassign-${ap.property.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {ap.property.name} - {ap.property.streetAddress}, {ap.property.suburb}
                        </Label>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {activeTab === "assign" ? (
            <Button
              type="button"
              onClick={handleAssign}
              disabled={
                loading ||
                !selectedAgentId ||
                selectedPropertyIds.size === 0 ||
                properties.length === 0
              }
            >
              {loading
                ? "Assigning..."
                : `Assign ${selectedPropertyIds.size > 0 ? selectedPropertyIds.size : ""} ${
                    selectedPropertyIds.size === 1 ? "Property" : "Properties"
                  }`}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeassign}
              disabled={
                loading ||
                !selectedAgentId ||
                selectedPropertyIds.size === 0 ||
                assignedProperties.length === 0
              }
            >
              {loading
                ? "Deassigning..."
                : `Deassign ${selectedPropertyIds.size > 0 ? selectedPropertyIds.size : ""} ${
                    selectedPropertyIds.size === 1 ? "Property" : "Properties"
                  }`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

