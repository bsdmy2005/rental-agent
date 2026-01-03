"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getExtractionRuleByIdQuery } from "@/queries/extraction-rules-queries"
import { getRuleSamplesByRuleIdQuery } from "@/queries/rule-samples-queries"
import { SampleUpload } from "../_components/sample-upload"
import { RuleTester } from "../_components/rule-tester"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function RuleDetailPage({
  params
}: {
  params: Promise<{ ruleId: string }>
}) {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const { ruleId } = await params
  const rule = await getExtractionRuleByIdQuery(ruleId)

  if (!rule) {
    notFound()
  }

  // Verify user owns this rule
  if (rule.userProfileId !== userProfile.id) {
    return <div>Unauthorized</div>
  }

  const samples = await getRuleSamplesByRuleIdQuery(ruleId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/rules">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{rule.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant={rule.isActive ? "default" : "secondary"}
                className="text-xs"
              >
                {rule.isActive ? "Active" : "Inactive"}
              </Badge>
              {rule.extractForInvoice && (
                <Badge variant="outline" className="text-xs">
                  Invoice
                </Badge>
              )}
              {rule.extractForPayment && (
                <Badge variant="outline" className="text-xs">
                  Payment
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {rule.billType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {rule.channel === "email_forward"
                  ? "Email Forward"
                  : rule.channel === "agentic"
                    ? "Agentic"
                    : "Manual Upload"}
              </Badge>
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/rules/${rule.id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Rule
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Sample PDFs</CardTitle>
              <CardDescription>
                Upload sample bills/invoices to test your extraction rule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SampleUpload ruleId={ruleId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rule Configuration</CardTitle>
              <CardDescription>Current extraction configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rule.extractForInvoice && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Invoice Extraction Config:</p>
                    <pre className="mt-1 overflow-auto rounded-md bg-muted p-2 text-xs">
                      {JSON.stringify(rule.invoiceExtractionConfig, null, 2)}
                    </pre>
                  </div>
                )}
                {rule.extractForPayment && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Payment Extraction Config:</p>
                    <pre className="mt-1 overflow-auto rounded-md bg-muted p-2 text-xs">
                      {JSON.stringify(rule.paymentExtractionConfig, null, 2)}
                    </pre>
                  </div>
                )}
                {!!rule.emailFilter && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Email Filter:</p>
                    <pre className="mt-1 overflow-auto rounded-md bg-muted p-2 text-xs">
                      {JSON.stringify(rule.emailFilter, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Suspense fallback={<div>Loading...</div>}>
            <RuleTesterWrapper ruleId={ruleId} samples={samples} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

async function RuleTesterWrapper({
  ruleId,
  samples
}: {
  ruleId: string
  samples: Awaited<ReturnType<typeof getRuleSamplesByRuleIdQuery>>
}) {
  return <RuleTester ruleId={ruleId} samples={samples} />
}

