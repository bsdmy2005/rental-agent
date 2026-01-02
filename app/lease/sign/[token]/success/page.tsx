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
            Your signature has been recorded. The lease has been fully executed by both parties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            You will receive an email with the fully executed lease agreement shortly.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

