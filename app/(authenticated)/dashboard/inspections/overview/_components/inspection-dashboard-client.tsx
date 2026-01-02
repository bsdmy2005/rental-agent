"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Link } from "next/link"
import { Filter, X } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

type ItemCondition = "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning"

interface InspectionItem {
  id: string
  name: string
  condition: ItemCondition
  notes: string | null
  confirmedAsPrevious: boolean | null
  createdAt: Date
  updatedAt: Date
  category: {
    id: string
    name: string
    displayOrder: number
  }
  inspection: {
    id: string
    inspectionType: "moving_in" | "moving_out"
    status: string
    createdAt: Date
  }
}

interface InspectionDashboardClientProps {
  initialItems: InspectionItem[]
}

export function InspectionDashboardClient({ initialItems }: InspectionDashboardClientProps) {
  const [selectedConditions, setSelectedConditions] = useState<Set<ItemCondition>>(new Set())
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set())
  const [selectedInspectionTypes, setSelectedInspectionTypes] = useState<Set<string>>(new Set())
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Get unique values for filters
  const uniqueRooms = useMemo(() => {
    const rooms = new Set(initialItems.map((item) => item.category.name))
    return Array.from(rooms).sort()
  }, [initialItems])

  const uniqueInspectionTypes = useMemo(() => {
    const types = new Set(initialItems.map((item) => item.inspection.inspectionType))
    return Array.from(types)
  }, [initialItems])

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(initialItems.map((item) => item.inspection.status))
    return Array.from(statuses).sort()
  }, [initialItems])

  // Filter items
  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      // Condition filter
      if (selectedConditions.size > 0 && !selectedConditions.has(item.condition)) {
        return false
      }

      // Room filter
      if (selectedRooms.size > 0 && !selectedRooms.has(item.category.name)) {
        return false
      }

      // Inspection type filter
      if (
        selectedInspectionTypes.size > 0 &&
        !selectedInspectionTypes.has(item.inspection.inspectionType)
      ) {
        return false
      }

      // Status filter
      if (selectedStatuses.size > 0 && !selectedStatuses.has(item.inspection.status)) {
        return false
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !item.name.toLowerCase().includes(query) &&
          !item.category.name.toLowerCase().includes(query) &&
          !(item.notes?.toLowerCase().includes(query) ?? false)
        ) {
          return false
        }
      }

      return true
    })
  }, [
    initialItems,
    selectedConditions,
    selectedRooms,
    selectedInspectionTypes,
    selectedStatuses,
    searchQuery
  ])

  // Group by condition
  const itemsByCondition = useMemo(() => {
    const groups: Record<ItemCondition, InspectionItem[]> = {
      good: [],
      requires_repair: [],
      requires_cleaning: [],
      requires_repair_and_cleaning: []
    }

    filteredItems.forEach((item) => {
      groups[item.condition].push(item)
    })

    return groups
  }, [filteredItems])

  // Summary stats
  const summary = useMemo(() => {
    return {
      total: filteredItems.length,
      good: itemsByCondition.good.length,
      requiresRepair: itemsByCondition.requires_repair.length,
      requiresCleaning: itemsByCondition.requires_cleaning.length,
      requiresBoth: itemsByCondition.requires_repair_and_cleaning.length
    }
  }, [filteredItems, itemsByCondition])

  const getConditionLabel = (cond: ItemCondition) => {
    switch (cond) {
      case "good":
        return "Good"
      case "requires_repair":
        return "Requires Repair"
      case "requires_cleaning":
        return "Requires Cleaning"
      case "requires_repair_and_cleaning":
        return "Requires Repair & Cleaning"
    }
  }

  const getConditionColor = (cond: ItemCondition) => {
    switch (cond) {
      case "good":
        return "bg-green-500"
      case "requires_repair":
        return "bg-orange-500"
      case "requires_cleaning":
        return "bg-yellow-500"
      case "requires_repair_and_cleaning":
        return "bg-red-500"
    }
  }

  const clearFilters = () => {
    setSelectedConditions(new Set())
    setSelectedRooms(new Set())
    setSelectedInspectionTypes(new Set())
    setSelectedStatuses(new Set())
    setSearchQuery("")
  }

  const hasActiveFilters =
    selectedConditions.size > 0 ||
    selectedRooms.size > 0 ||
    selectedInspectionTypes.size > 0 ||
    selectedStatuses.size > 0 ||
    searchQuery.length > 0

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Good</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.good}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Requires Repair</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.requiresRepair}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Requires Cleaning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.requiresCleaning}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Requires Both</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.requiresBoth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedConditions.size +
                      selectedRooms.size +
                      selectedInspectionTypes.size +
                      selectedStatuses.size +
                      (searchQuery.length > 0 ? 1 : 0)}{" "}
                    active
                  </Badge>
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Search */}
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by item name, room, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Condition Filter */}
                <div>
                  <Label>Condition</Label>
                  <div className="mt-2 space-y-2">
                    {(["good", "requires_repair", "requires_cleaning", "requires_repair_and_cleaning"] as ItemCondition[]).map(
                      (condition) => (
                        <div key={condition} className="flex items-center space-x-2">
                          <Checkbox
                            id={`condition-${condition}`}
                            checked={selectedConditions.has(condition)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedConditions)
                              if (checked) {
                                newSet.add(condition)
                              } else {
                                newSet.delete(condition)
                              }
                              setSelectedConditions(newSet)
                            }}
                          />
                          <Label
                            htmlFor={`condition-${condition}`}
                            className="text-sm cursor-pointer"
                          >
                            {getConditionLabel(condition)}
                          </Label>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Room Filter */}
                <div>
                  <Label>Room/Category</Label>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {uniqueRooms.map((room) => (
                      <div key={room} className="flex items-center space-x-2">
                        <Checkbox
                          id={`room-${room}`}
                          checked={selectedRooms.has(room)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedRooms)
                            if (checked) {
                              newSet.add(room)
                            } else {
                              newSet.delete(room)
                            }
                            setSelectedRooms(newSet)
                          }}
                        />
                        <Label htmlFor={`room-${room}`} className="text-sm cursor-pointer">
                          {room}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inspection Type Filter */}
                <div>
                  <Label>Inspection Type</Label>
                  <div className="mt-2 space-y-2">
                    {uniqueInspectionTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={selectedInspectionTypes.has(type)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedInspectionTypes)
                            if (checked) {
                              newSet.add(type)
                            } else {
                              newSet.delete(type)
                            }
                            setSelectedInspectionTypes(newSet)
                          }}
                        />
                        <Label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                          {type === "moving_in" ? "Move-In" : "Move-Out"}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <Label>Status</Label>
                  <div className="mt-2 space-y-2">
                    {uniqueStatuses.map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={selectedStatuses.has(status)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedStatuses)
                            if (checked) {
                              newSet.add(status)
                            } else {
                              newSet.delete(status)
                            }
                            setSelectedStatuses(newSet)
                          }}
                        />
                        <Label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                          {status}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Items ({filteredItems.length} {filteredItems.length === 1 ? "item" : "items"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items found matching your filters.
            </div>
          ) : (
            <div className="space-y-4">
              {(["good", "requires_repair", "requires_cleaning", "requires_repair_and_cleaning"] as ItemCondition[]).map(
                (condition) => {
                  const items = itemsByCondition[condition]
                  if (items.length === 0) return null

                  return (
                    <div key={condition} className="space-y-2">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Badge className={`${getConditionColor(condition)} text-white`}>
                          {getConditionLabel(condition)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">({items.length})</span>
                      </h3>
                      <div className="space-y-1 border-l-2 border-muted pl-4">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-2 border-b last:border-b-0"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  href={`/dashboard/moving-inspections/${item.inspection.id}`}
                                  className="font-medium hover:underline text-sm"
                                >
                                  {item.name}
                                </Link>
                                <Badge variant="outline" className="text-xs">
                                  {item.category.name}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {item.inspection.inspectionType === "moving_in"
                                    ? "Move-In"
                                    : "Move-Out"}
                                </Badge>
                                {item.confirmedAsPrevious && (
                                  <Badge variant="secondary" className="text-xs">
                                    Same as Move-In
                                  </Badge>
                                )}
                              </div>
                              {item.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

