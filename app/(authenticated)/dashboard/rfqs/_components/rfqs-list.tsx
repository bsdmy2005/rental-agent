"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { SelectQuoteRequest, SelectProperty, SelectServiceProvider } from "@/db/schema"
import { format } from "date-fns"
import { FileText } from "lucide-react"

interface RfqWithRelations {
  rfq: SelectQuoteRequest
  property: {
    id: string
    name: string
    suburb: string
    province: string
  } | null
  serviceProvider: {
    id: string
    businessName: string | null
    contactName: string
  } | null
}

interface RfqsListProps {
  rfqs: RfqWithRelations[]
}

export function RfqsList({ rfqs }: RfqsListProps) {
  const router = useRouter()

  if (rfqs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No RFQs found</p>
        <p className="text-sm mt-2">Create your first RFQ to get started</p>
      </div>
    )
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      requested: "default",
      quoted: "secondary",
      approved: "outline",
      rejected: "destructive",
      expired: "destructive"
    }

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
      </Badge>
    )
  }

  function handleRowClick(rfqId: string) {
    router.push(`/dashboard/rfqs/${rfqId}`)
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>RFQ Code</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Service Provider</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent / Received</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rfqs.map(({ rfq, property, serviceProvider }) => (
            <TableRow
              key={rfq.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(rfq.id)}
            >
              <TableCell className="font-mono text-sm">
                {rfq.rfqCode || "-"}
              </TableCell>
              <TableCell className="font-medium">
                {rfq.title || (rfq.incidentId ? "Incident RFQ" : "Standalone RFQ")}
              </TableCell>
              <TableCell>
                {property ? (
                  <div>
                    <div className="font-medium">{property.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {property.suburb}, {property.province}
                    </div>
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                {serviceProvider ? (
                  <div>
                    {serviceProvider.businessName && serviceProvider.contactName
                      ? `${serviceProvider.businessName} (${serviceProvider.contactName})`
                      : serviceProvider.businessName || serviceProvider.contactName}
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{getStatusBadge(rfq.status)}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>Sent: {rfq.sentCount}</div>
                  <div className="text-muted-foreground">Received: {rfq.receivedCount}</div>
                </div>
              </TableCell>
              <TableCell>
                {rfq.dueDate ? format(new Date(rfq.dueDate), "MMM dd, yyyy") : "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(rfq.requestedAt), "MMM dd, yyyy")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

