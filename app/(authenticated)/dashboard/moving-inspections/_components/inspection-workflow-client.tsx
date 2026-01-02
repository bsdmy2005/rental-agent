"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Plus } from "lucide-react"
import { getActiveLeasesByPropertyAction } from "@/actions/moving-inspections-actions"
import { toast } from "sonner"

interface Property {
  id: string
  name: string
}

interface Lease {
  id: string
  tenant: {
    id: string
    name: string
  } | null
  property: {
    id: string
    name: string
  } | null
}

interface MovingInInspection {
  id: string
  status: string
  createdAt: Date
  leaseAgreement: {
    tenant: {
      name: string
    } | null
    property: {
      name: string
    } | null
  } | null
}

interface InspectionWorkflowClientProps {
  properties: Property[]
  movingInInspections: MovingInInspection[]
}

export function InspectionWorkflowClient({
  properties,
  movingInInspections
}: InspectionWorkflowClientProps) {
  const router = useRouter()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>("")
  const [selectedMovingInId, setSelectedMovingInId] = useState<string>("")
  const [leases, setLeases] = useState<Lease[]>([])
  const [loadingLeases, setLoadingLeases] = useState(false)
  const [filteredMovingInInspections, setFilteredMovingInInspections] = useState<MovingInInspection[]>([])

  const handlePropertyChange = async (propertyId: string) => {
    setSelectedPropertyId(propertyId)
    setSelectedLeaseId("")
    setSelectedMovingInId("")
    setLeases([])
    setFilteredMovingInInspections([])

    if (!propertyId) return

    // Load leases for selected property
    setLoadingLeases(true)
    try {
      const result = await getActiveLeasesByPropertyAction(propertyId)
      if (result.isSuccess && result.data) {
        setLeases(result.data as any)
      } else {
        toast.error(result.message || "Failed to load leases")
      }
    } catch (error) {
      console.error("Error loading leases:", error)
      toast.error("Failed to load leases")
    } finally {
      setLoadingLeases(false)
    }

    // Filter moving-in inspections for selected property
    const filtered = movingInInspections.filter((inspection) => {
      return inspection.leaseAgreement?.property?.id === propertyId
    })
    setFilteredMovingInInspections(filtered)
  }

  const handleCreateMovingIn = () => {
    if (!selectedLeaseId) {
      toast.error("Please select a lease")
      return
    }
    router.push(`/dashboard/moving-inspections/create/moving-in?leaseId=${selectedLeaseId}&propertyId=${selectedPropertyId}`)
  }

  const handleCreateMovingOut = () => {
    if (!selectedMovingInId) {
      toast.error("Please select a moving-in inspection")
      return
    }
    router.push(`/dashboard/moving-inspections/create/moving-out?movingInId=${selectedMovingInId}&propertyId=${selectedPropertyId}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "signed":
        return "bg-green-500"
      case "completed":
        return "bg-blue-500"
      case "in_progress":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="moving-in" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="moving-in">Moving-In Inspections</TabsTrigger>
          <TabsTrigger value="moving-out">Moving-Out Inspections</TabsTrigger>
        </TabsList>

        <TabsContent value="moving-in" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Moving-In Inspection</CardTitle>
              <CardDescription>
                Select a property and lease to create a new moving-in inspection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Property</label>
                <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPropertyId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Lease</label>
                  {loadingLeases ? (
                    <div className="text-sm text-muted-foreground">Loading leases...</div>
                  ) : (
                    <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a lease" />
                      </SelectTrigger>
                      <SelectContent>
                        {leases.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No signed leases found for this property
                          </div>
                        ) : (
                          leases.map((lease) => (
                            <SelectItem key={lease.id} value={lease.id}>
                              {lease.tenant?.name || "Unknown Tenant"} - {lease.property?.name || "Unknown Property"}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {selectedLeaseId && (
                <Button onClick={handleCreateMovingIn} className="w-full">
                  Create Moving-In Inspection
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moving-out" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Moving-Out Inspection</CardTitle>
              <CardDescription>
                Select a property and completed moving-in inspection to create a new moving-out inspection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Property</label>
                <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPropertyId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Moving-In Inspection</label>
                  <Select value={selectedMovingInId} onValueChange={setSelectedMovingInId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a moving-in inspection" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredMovingInInspections.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No completed moving-in inspections found for this property
                        </div>
                      ) : (
                        filteredMovingInInspections
                          .filter((inspection) => inspection.status === "completed" || inspection.status === "signed")
                          .map((inspection) => (
                            <SelectItem key={inspection.id} value={inspection.id}>
                              <div className="flex items-center gap-2">
                                <span>
                                  {inspection.leaseAgreement?.tenant?.name || "Unknown"} -{" "}
                                  {new Date(inspection.createdAt).toLocaleDateString()}
                                </span>
                                <Badge className={getStatusColor(inspection.status)}>
                                  {inspection.status}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedMovingInId && (
                <Button onClick={handleCreateMovingOut} className="w-full">
                  Create Moving-Out Inspection
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

