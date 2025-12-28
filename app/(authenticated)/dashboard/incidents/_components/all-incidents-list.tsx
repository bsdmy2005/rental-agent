"use client"

import { useState } from "react"
import type { SelectIncident } from "@/db/schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import Link from "next/link"
import { Eye, Building2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AllIncidentsListProps {
  incidents: SelectIncident[]
  propertyNames: Record<string, string>
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  reported: "secondary",
  assigned: "default",
  in_progress: "default",
  awaiting_quote: "outline",
  awaiting_approval: "outline",
  resolved: "default",
  closed: "secondary"
}

const priorityColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
  urgent: "destructive"
}

export function AllIncidentsList({ incidents, propertyNames }: AllIncidentsListProps) {
  const [selectedProperty, setSelectedProperty] = useState<string>("all")
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set())

  // Group incidents by property
  const incidentsByProperty = incidents.reduce((acc, incident) => {
    if (!acc[incident.propertyId]) {
      acc[incident.propertyId] = []
    }
    acc[incident.propertyId].push(incident)
    return acc
  }, {} as Record<string, SelectIncident[]>)

  const propertyEntries = Object.entries(incidentsByProperty)
  const filteredProperties = selectedProperty === "all" 
    ? propertyEntries 
    : propertyEntries.filter(([id]) => id === selectedProperty)

  const toggleProperty = (propertyId: string) => {
    const newExpanded = new Set(expandedProperties)
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId)
    } else {
      newExpanded.add(propertyId)
    }
    setExpandedProperties(newExpanded)
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      {propertyEntries.length > 1 && (
        <div className="flex items-center gap-4">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {propertyEntries.map(([id]) => (
                <SelectItem key={id} value={id}>
                  {propertyNames[id] || `Property ${id.substring(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Property Groups */}
      <div className="space-y-2">
        {filteredProperties.map(([propertyId, propertyIncidents]) => {
          const isExpanded = expandedProperties.has(propertyId)
          const propertyName = propertyNames[propertyId] || `Property ${propertyId.substring(0, 8)}`
          
          return (
            <Collapsible
              key={propertyId}
              open={isExpanded}
              onOpenChange={() => toggleProperty(propertyId)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div className="text-left">
                          <CardTitle className="text-lg">{propertyName}</CardTitle>
                          <CardDescription>
                            {propertyIncidents.length} incident{propertyIncidents.length !== 1 ? "s" : ""}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/properties/${propertyId}/incidents`}>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            View All
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reported</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {propertyIncidents.map((incident) => (
                          <TableRow key={incident.id}>
                            <TableCell className="font-medium">{incident.title}</TableCell>
                            <TableCell>
                              <Badge variant={priorityColors[incident.priority] || "default"}>
                                {incident.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusColors[incident.status] || "default"}>
                                {incident.status.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(incident.reportedAt), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Link href={`/dashboard/properties/${propertyId}/incidents/${incident.id}`}>
                                <Button variant="ghost" size="icon">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}

