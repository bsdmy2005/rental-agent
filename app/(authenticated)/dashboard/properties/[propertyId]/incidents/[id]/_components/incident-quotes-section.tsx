"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getRfqComparisonAction } from "@/actions/service-providers-actions"
import { RfqComparisonTable } from "@/components/rfq-comparison-table"
import { Loader2 } from "lucide-react"
import type { SelectQuoteRequest } from "@/db/schema"

interface IncidentQuotesSectionProps {
  quoteRequests: SelectQuoteRequest[]
}

export function IncidentQuotesSection({ quoteRequests }: IncidentQuotesSectionProps) {
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState<any[]>([])

  useEffect(() => {
    async function loadQuotes() {
      if (quoteRequests.length === 0) {
        setLoading(false)
        return
      }

      try {
        // Get quotes for the first quote request (they should all share the same RFQ code or incident)
        const result = await getRfqComparisonAction(quoteRequests[0].id)
        if (result.isSuccess && result.data) {
          setQuotes(result.data)
        }
      } catch (error) {
        console.error("Error loading quotes:", error)
      } finally {
        setLoading(false)
      }
    }

    loadQuotes()
  }, [quoteRequests])

  if (quoteRequests.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quotes</CardTitle>
        <CardDescription>
          {quotes.length === 0
            ? "No quotes received yet"
            : `${quotes.length} quote${quotes.length === 1 ? "" : "s"} received`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <RfqComparisonTable quotes={quotes} />
        )}
      </CardContent>
    </Card>
  )
}

