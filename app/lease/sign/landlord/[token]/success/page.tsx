"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

export default function LandlordSigningSuccessPage() {
  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <CardTitle>Lease Signed Successfully</CardTitle>
              <CardDescription className="mt-2">
                Your signature has been recorded and the lease has been sent to the tenant for their signature.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Once the tenant signs the lease, both parties will receive a copy of the fully executed lease agreement.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

