import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"

interface IncidentMessageSummaryProps {
  description: string
  submittedPhone?: string | null
  submittedName?: string | null
}

export function IncidentMessageSummary({
  description,
  submittedPhone,
  submittedName
}: IncidentMessageSummaryProps) {
  if (!submittedPhone) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          WhatsApp Message Summary
        </CardTitle>
        <CardDescription>
          Initial message from {submittedName || "tenant"} via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{description}</p>
        {submittedPhone && (
          <p className="text-xs text-muted-foreground mt-2">
            From: {submittedPhone.replace(/(\d{2})(\d{3})(\d{4})/, "+$1 $2 $3")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

