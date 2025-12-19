"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import type { SelectRuleSample } from "@/db/schema"

interface RuleTesterProps {
  ruleId: string
  samples: SelectRuleSample[]
  onTestComplete?: () => void
}

export function RuleTester({ ruleId, samples, onTestComplete }: RuleTesterProps) {
  const [testingSampleId, setTestingSampleId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<
    Record<
      string,
      {
        success: boolean
        invoiceData: unknown | null
        paymentData: unknown | null
        error?: string
      }
    >
  >({})

  const testSample = async (sampleId: string) => {
    setTestingSampleId(sampleId)

    try {
      const response = await fetch(`/api/rules/${ruleId}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sampleId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to test rule")
      }

      setTestResults((prev) => ({
        ...prev,
        [sampleId]: {
          success: data.data.success,
          invoiceData: data.data.invoiceData,
          paymentData: data.data.paymentData,
          error: data.data.error
        }
      }))

      if (data.data.success) {
        toast.success("Rule test completed successfully")
      } else {
        toast.error("Rule test failed: " + (data.data.error || "Unknown error"))
      }

      if (onTestComplete) {
        onTestComplete()
      }
    } catch (error) {
      console.error("Error testing rule:", error)
      setTestResults((prev) => ({
        ...prev,
        [sampleId]: {
          success: false,
          invoiceData: null,
          paymentData: null,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }))
      toast.error("Failed to test rule")
    } finally {
      setTestingSampleId(null)
    }
  }

  if (samples.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Test Rule</CardTitle>
          <CardDescription>Upload sample PDFs to test your extraction rule</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No samples uploaded yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Rule Against Samples</CardTitle>
        <CardDescription>
          Test your extraction rule against uploaded sample PDFs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {samples.map((sample) => {
            const result = testResults[sample.id]
            const isTesting = testingSampleId === sample.id

            return (
              <div key={sample.id} className="rounded-md border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{sample.fileName}</span>
                    {result && (
                      <Badge
                        variant={result.success ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {result.success ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Success
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1 h-3 w-3" />
                            Failed
                          </>
                        )}
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => testSample(sample.id)}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Test
                      </>
                    )}
                  </Button>
                </div>

                {result && (
                  <div className="mt-3 space-y-2">
                    {result.error && (
                      <div className="rounded-md bg-red-50 p-2">
                        <p className="text-red-800 text-xs font-medium">Error:</p>
                        <p className="text-red-700 text-xs">{result.error}</p>
                      </div>
                    )}

                    {result.success && (
                      <div className="space-y-2">
                        {result.invoiceData && (
                          <div className="rounded-md bg-green-50 p-2">
                            <p className="text-green-800 text-xs font-medium">
                              Invoice Extraction Data:
                            </p>
                            <pre className="text-green-700 mt-1 overflow-auto text-xs">
                              {JSON.stringify(result.invoiceData, null, 2)}
                            </pre>
                          </div>
                        )}

                        {result.paymentData && (
                          <div className="rounded-md bg-blue-50 p-2">
                            <p className="text-blue-800 text-xs font-medium">
                              Payment Extraction Data:
                            </p>
                            <pre className="text-blue-700 mt-1 overflow-auto text-xs">
                              {JSON.stringify(result.paymentData, null, 2)}
                            </pre>
                          </div>
                        )}

                        {!result.invoiceData && !result.paymentData && (
                          <p className="text-muted-foreground text-xs">
                            No data extracted (empty result)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

