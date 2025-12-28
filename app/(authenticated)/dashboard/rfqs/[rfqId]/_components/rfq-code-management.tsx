"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { generateRfqCodeAction, deactivateRfqCodeAction } from "@/actions/rfq-codes-actions"
import { toast } from "sonner"
import { Loader2, Copy, Check, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface RfqCodeManagementProps {
  rfqId: string
  rfqCode: string | null
}

export function RfqCodeManagement({ rfqId, rfqCode: initialRfqCode }: RfqCodeManagementProps) {
  const [rfqCode, setRfqCode] = useState<string | null>(initialRfqCode)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const result = await generateRfqCodeAction(rfqId)
      if (result.isSuccess && result.data) {
        setRfqCode(result.data.code)
        toast.success("RFQ code generated successfully")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error generating code:", error)
      toast.error("Failed to generate RFQ code")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate() {
    if (!rfqCode) return

    setLoading(true)
    try {
      const result = await deactivateRfqCodeAction(rfqCode)
      if (result.isSuccess) {
        setRfqCode(null)
        toast.success("RFQ code deactivated")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error deactivating code:", error)
      toast.error("Failed to deactivate code")
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!rfqCode) return

    const url = `${window.location.origin}/submit-quote/${rfqCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Link copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  if (!rfqCode) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">No active RFQ code</p>
        <Button onClick={handleGenerate} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Generate RFQ Code
        </Button>
      </div>
    )
  }

  const submitUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/submit-quote/${rfqCode}`

  return (
    <div className="space-y-4">
      <div>
        <Label>RFQ Code</Label>
        <div className="flex gap-2 mt-2">
          <Input value={rfqCode} readOnly className="font-mono" />
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div>
        <Label>Submission Link</Label>
        <div className="flex gap-2 mt-2">
          <Input value={submitUrl} readOnly className="text-sm" />
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleDeactivate} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <X className="h-4 w-4 mr-2" />
          Deactivate Code
        </Button>
        <Button variant="outline" onClick={handleGenerate} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Regenerate Code
        </Button>
      </div>

      <Badge variant="secondary" className="w-full justify-center">
        Active
      </Badge>
    </div>
  )
}

