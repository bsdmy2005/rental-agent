"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QuoteRequestForm } from "./quote-request-form"
import { FileText } from "lucide-react"

interface RequestQuoteDialogProps {
  incidentId: string
  propertyId: string
  propertySuburb: string
  propertyProvince: string
  requestedBy: string
  incidentTitle?: string
  incidentDescription?: string
}

export function RequestQuoteDialog({
  incidentId,
  propertyId,
  propertySuburb,
  propertyProvince,
  requestedBy,
  incidentTitle,
  incidentDescription
}: RequestQuoteDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Request Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Quote for Incident</DialogTitle>
          <DialogDescription>
            Select service providers to send a quote request for this incident.
          </DialogDescription>
        </DialogHeader>
        {incidentTitle && (
          <div className="mt-2 space-y-1">
            <div className="font-medium text-foreground">Incident: {incidentTitle}</div>
            {incidentDescription && (
              <div className="text-sm text-muted-foreground line-clamp-2">
                {incidentDescription}
              </div>
            )}
          </div>
        )}
        <div className="mt-4">
          <QuoteRequestForm
            incidentId={incidentId}
            propertyId={propertyId}
            propertySuburb={propertySuburb}
            propertyProvince={propertyProvince}
            requestedBy={requestedBy}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

