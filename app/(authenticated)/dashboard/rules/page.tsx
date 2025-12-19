"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { RulesTable } from "./_components/rules-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Info, Plus } from "lucide-react"
import Link from "next/link"

export default async function ExtractionRulesPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Extraction Rules</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your extraction rules grouped by property
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/rules/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">How Extraction Rules Work</CardTitle>
              <CardDescription className="mt-1">
                Rules define how the system extracts data from bills. Each rule processes a specific bill type
                (Input) and produces invoice data, payment data, or both (Outputs).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold text-sm mb-2">Input: Bill Type</h4>
              <p className="text-muted-foreground text-sm">
                The type of bill this rule processes: Municipality, Levy, Utility, or Other.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Outputs: Invoice & Payment</h4>
              <p className="text-muted-foreground text-sm">
                <strong>Invoice:</strong> Extract tenant-chargeable items (water, electricity, etc.)<br />
                <strong>Payment:</strong> Extract landlord-payable items (levies, fees, etc.)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Suspense fallback={<div>Loading rules...</div>}>
        <RulesTable />
      </Suspense>
    </div>
  )
}

