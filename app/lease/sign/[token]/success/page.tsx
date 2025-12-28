"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

export default function SigningSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle>Lease Signed Successfully</CardTitle>
          <CardDescription>
            Your signature has been recorded. The landlord will be notified and will sign the lease to complete the process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            You will receive an email with the fully executed lease agreement once both parties have signed.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

