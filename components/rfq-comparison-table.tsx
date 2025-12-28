"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { acceptQuoteAction, rejectQuoteAction } from "@/actions/service-providers-actions"
import { toast } from "sonner"
import { Loader2, Check, X, ArrowUpDown } from "lucide-react"
import { format } from "date-fns"

interface QuoteWithProvider {
  id: string
  amount: string
  description: string | null
  estimatedCompletionDate: Date | null
  status: string
  providerName: string
  providerBusinessName: string | null
  submittedAt: Date
  submissionMethod?: string
  submissionCode?: string | null
}

interface RfqComparisonTableProps {
  quotes: QuoteWithProvider[]
  onQuoteAccepted?: (quoteId: string) => void
  onQuoteRejected?: (quoteId: string) => void
}

type SortField = "amount" | "date" | "provider"
type SortDirection = "asc" | "desc"

export function RfqComparisonTable({
  quotes,
  onQuoteAccepted,
  onQuoteRejected
}: RfqComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>("amount")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [processingId, setProcessingId] = useState<string | null>(null)

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedQuotes = [...quotes].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case "amount":
        const amountA = parseFloat(a.amount.replace(/[^0-9.]/g, "")) || 0
        const amountB = parseFloat(b.amount.replace(/[^0-9.]/g, "")) || 0
        comparison = amountA - amountB
        break
      case "date":
        const dateA = a.estimatedCompletionDate?.getTime() || 0
        const dateB = b.estimatedCompletionDate?.getTime() || 0
        comparison = dateA - dateB
        break
      case "provider":
        comparison = a.providerName.localeCompare(b.providerName)
        break
    }

    return sortDirection === "asc" ? comparison : -comparison
  })

  async function handleAccept(quoteId: string) {
    setProcessingId(quoteId)
    try {
      const result = await acceptQuoteAction(quoteId, true)
      if (result.isSuccess) {
        toast.success("Quote accepted successfully")
        onQuoteAccepted?.(quoteId)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to accept quote")
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(quoteId: string) {
    setProcessingId(quoteId)
    try {
      const result = await rejectQuoteAction(quoteId)
      if (result.isSuccess) {
        toast.success("Quote rejected")
        onQuoteRejected?.(quoteId)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to reject quote")
    } finally {
      setProcessingId(null)
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      quoted: "default",
      approved: "secondary",
      rejected: "destructive",
      completed: "outline"
    }

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No quotes received yet
      </div>
    )
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("provider")}
                className="h-8"
              >
                Provider
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("amount")}
                className="h-8"
              >
                Amount
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>Description</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort("date")}
                className="h-8"
              >
                Completion Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submission Method</TableHead>
            <TableHead>Submission Code</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedQuotes.map((quote) => (
            <TableRow
              key={quote.id}
              className={quote.status === "approved" ? "bg-green-50" : ""}
            >
              <TableCell className="font-medium">
                {quote.providerBusinessName || quote.providerName}
              </TableCell>
              <TableCell className="font-semibold">{quote.amount}</TableCell>
              <TableCell className="max-w-md truncate">
                {quote.description || "-"}
              </TableCell>
              <TableCell>
                {quote.estimatedCompletionDate
                  ? format(new Date(quote.estimatedCompletionDate), "MMM dd, yyyy")
                  : "-"}
              </TableCell>
              <TableCell>{getStatusBadge(quote.status)}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {quote.submissionMethod === "web_form" ? "Web Portal" : "Email"}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {quote.submissionCode || "-"}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {quote.status === "quoted" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAccept(quote.id)}
                        disabled={processingId === quote.id}
                      >
                        {processingId === quote.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(quote.id)}
                        disabled={processingId === quote.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {quote.status === "approved" && (
                    <Badge variant="secondary">Accepted</Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

