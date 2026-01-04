"use client"

import { useState, Fragment } from "react"
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
import { Button } from "@/components/ui/button"
import type { RfqGroup } from "@/queries/rfqs-queries"
import { format } from "date-fns"
import { FileText, ChevronDown, ChevronRight, Users } from "lucide-react"

interface RfqsListProps {
  rfqGroups: RfqGroup[]
}

export function RfqsList({ rfqGroups }: RfqsListProps) {
  const router = useRouter()
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  if (!rfqGroups || rfqGroups.length === 0) {
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

  function toggleGroup(groupId: string) {
    const newOpenGroups = new Set(openGroups)
    if (newOpenGroups.has(groupId)) {
      newOpenGroups.delete(groupId)
    } else {
      newOpenGroups.add(groupId)
    }
    setOpenGroups(newOpenGroups)
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Providers</TableHead>
            <TableHead>Quotes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>RFQ Code</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rfqGroups.map((group) => {
            const isOpen = openGroups.has(group.groupId)
            const { parentRfq, childRfqs, providerCount, quoteCount, statusAggregation } = group
            const hasChildren = childRfqs.length > 0

            return (
              <Fragment key={group.groupId}>
                {/* Parent/Group Row */}
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(parentRfq.rfq.id)}
                >
                  <TableCell>
                    {hasChildren ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleGroup(group.groupId)
                        }}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <div className="w-6" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {parentRfq.rfq.title ||
                      (parentRfq.rfq.incidentId ? "Incident RFQ" : "Standalone RFQ")}
                  </TableCell>
                  <TableCell>
                    {parentRfq.property ? (
                      <div>
                        <div className="font-medium">{parentRfq.property.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {parentRfq.property.suburb}, {parentRfq.property.province}
                        </div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{providerCount}</span>
                      {hasChildren && (
                        <span className="text-xs text-muted-foreground">
                          ({childRfqs.length + 1} total)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{quoteCount}</div>
                      <div className="text-muted-foreground">quote{quoteCount !== 1 ? "s" : ""}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {statusAggregation.approved > 0 && (
                        <Badge variant="outline" className="w-fit">
                          {statusAggregation.approved} approved
                        </Badge>
                      )}
                      {statusAggregation.quoted > 0 && statusAggregation.approved === 0 && (
                        <Badge variant="secondary" className="w-fit">
                          {statusAggregation.quoted} quoted
                        </Badge>
                      )}
                      {statusAggregation.requested > 0 &&
                        statusAggregation.quoted === 0 &&
                        statusAggregation.approved === 0 && (
                          <Badge variant="default" className="w-fit">
                            {statusAggregation.requested} requested
                          </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {parentRfq.rfq.dueDate
                      ? format(new Date(parentRfq.rfq.dueDate), "MMM dd, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(parentRfq.rfq.requestedAt), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {!hasChildren ? (parentRfq.rfq.rfqCode || "-") : (isOpen ? parentRfq.rfq.rfqCode || "-" : "")}
                  </TableCell>
                </TableRow>

                {/* Child RFQs (expandable) */}
                {hasChildren && isOpen && (
                  <>
                    {childRfqs.map(({ rfq, property, serviceProvider }) => (
                      <TableRow
                        key={rfq.id}
                        className="cursor-pointer hover:bg-muted/30 bg-muted/20"
                        onClick={() => handleRowClick(rfq.id)}
                      >
                        <TableCell>
                          <div className="w-6 pl-4">
                            <div className="w-0.5 h-full bg-border" />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium pl-8">
                          {rfq.title || (rfq.incidentId ? "Incident RFQ" : "Standalone RFQ")}
                        </TableCell>
                        <TableCell className="pl-8">
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
                        <TableCell className="pl-8">
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
                        <TableCell className="pl-8">
                          <div className="text-sm">
                            <div>Sent: {rfq.sentCount}</div>
                            <div className="text-muted-foreground">Received: {rfq.receivedCount}</div>
                          </div>
                        </TableCell>
                        <TableCell className="pl-8">{getStatusBadge(rfq.status)}</TableCell>
                        <TableCell className="pl-8">
                          {rfq.dueDate ? format(new Date(rfq.dueDate), "MMM dd, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground pl-8">
                          {format(new Date(rfq.requestedAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="font-mono text-sm pl-8">
                          {rfq.rfqCode || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

