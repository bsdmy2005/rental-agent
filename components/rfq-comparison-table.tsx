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
import { Loader2, Check, X, ArrowUpDown, Mail, MessageCircle, Globe, Trophy } from "lucide-react"
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
  cheapestQuoteId?: string | null
  onQuoteAccepted?: (quoteId: string) => void
  onQuoteRejected?: (quoteId: string) => void
}

type SortField = "amount" | "date" | "provider"
type SortDirection = "asc" | "desc"

export function RfqComparisonTable({
  quotes,
  cheapestQuoteId,
  onQuoteAccepted,
  onQuoteRejected
}: RfqComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>("amount")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filterMethod, setFilterMethod] = useState<string | null>(null)

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Filter by submission method
  const filteredQuotes = filterMethod
    ? quotes.filter((q) => q.submissionMethod === filterMethod)
    : quotes

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
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

  function getSubmissionMethodIcon(method?: string) {
    switch (method) {
      case "email":
        return <Mail className="h-3 w-3" />
      case "whatsapp":
        return <MessageCircle className="h-3 w-3" />
      case "web_form":
        return <Globe className="h-3 w-3" />
      default:
        return null
    }
  }

  function getSubmissionMethodLabel(method?: string) {
    switch (method) {
      case "email":
        return "Email"
      case "whatsapp":
        return "WhatsApp"
      case "web_form":
        return "Web Portal"
      default:
        return "Unknown"
    }
  }

  // Get unique submission methods for filter
  const submissionMethods = [...new Set(quotes.map((q) => q.submissionMethod).filter(Boolean))]

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
    <div className="space-y-4">
      {/* Filter by submission method */}
      {submissionMethods.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filter by:</span>
          <Button
            variant={filterMethod === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterMethod(null)}
          >
            All ({quotes.length})
          </Button>
          {submissionMethods.map((method) => {
            const count = quotes.filter((q) => q.submissionMethod === method).length
            return (
              <Button
                key={method}
                variant={filterMethod === method ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterMethod(method || null)}
                className="flex items-center gap-2"
              >
                {getSubmissionMethodIcon(method)}
                {getSubmissionMethodLabel(method)} ({count})
              </Button>
            )
          })}
        </div>
      )}

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
          {sortedQuotes.map((quote) => {
            const isCheapest = quote.id === cheapestQuoteId
            const isApproved = quote.status === "approved"

            return (
              <TableRow
                key={quote.id}
                className={`${
                  isCheapest
                    ? "bg-green-50 dark:bg-green-950 border-2 border-green-500"
                    : isApproved
                      ? "bg-green-50 dark:bg-green-950"
                      : ""
                }`}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {quote.providerBusinessName || quote.providerName}
                    {isCheapest && (
                      <Badge variant="default" className="bg-green-600 text-white">
                        <Trophy className="h-3 w-3 mr-1" />
                        Cheapest
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-2">
                    {quote.amount}
                    {isCheapest && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </TableCell>
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
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    {getSubmissionMethodIcon(quote.submissionMethod)}
                    {getSubmissionMethodLabel(quote.submissionMethod)}
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
                          className={isCheapest ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {processingId === quote.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Approve
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
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Approved
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  </div>
  )
}

