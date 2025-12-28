"use client"

import { SelectIncident } from "@/db/schema"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import Link from "next/link"
import { Eye } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

interface IncidentsListProps {
  incidents: SelectIncident[]
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

export function IncidentsList({ incidents }: IncidentsListProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No incidents reported yet. Click "Report Issue" to get started.
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
          {incidents.map((incident) => (
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
                <Link href={`/tenant/incidents/${incident.id}`}>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

