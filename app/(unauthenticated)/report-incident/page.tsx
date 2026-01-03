"use client"

import { Suspense } from "react"
import { PublicIncidentSubmissionForm } from "./_components/public-incident-submission-form"

export default function ReportIncidentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Report an Issue</h1>
          <p className="text-muted-foreground">
            Submit a maintenance request or incident for your property
          </p>
        </div>
        <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
          <PublicIncidentSubmissionForm />
        </Suspense>
      </div>
    </div>
  )
}

