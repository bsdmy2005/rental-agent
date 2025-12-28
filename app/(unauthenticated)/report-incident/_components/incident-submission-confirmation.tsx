"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Copy } from "lucide-react"
import { toast } from "sonner"

interface IncidentSubmissionConfirmationProps {
  incidentId: string
  referenceNumber: string
}

export function IncidentSubmissionConfirmation({
  incidentId,
  referenceNumber
}: IncidentSubmissionConfirmationProps) {
  const copyReferenceNumber = () => {
    navigator.clipboard.writeText(referenceNumber)
    toast.success("Reference number copied to clipboard")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <CardTitle>Incident Submitted Successfully</CardTitle>
        </div>
        <CardDescription>
          Your incident has been reported and will be reviewed shortly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Reference Number</p>
          <div className="flex items-center gap-2">
            <p className="font-mono font-bold text-lg">{referenceNumber}</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyReferenceNumber}
              className="h-8 w-8"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">What happens next?</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Your incident has been logged and assigned a reference number</li>
            <li>The property manager will review your submission</li>
            <li>You may be contacted for additional information if needed</li>
            <li>Status updates will be provided as the incident is resolved</li>
          </ul>
        </div>

        <div className="pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => (window.location.href = "/")}
          >
            Return to Home
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

