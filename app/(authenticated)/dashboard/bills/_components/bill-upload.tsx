"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface BillUploadProps {
  propertyId: string
  onSuccess?: () => void
}

interface ExtractionRule {
  id: string
  name: string
  extractForInvoice: boolean
  extractForPayment: boolean
  description: string
}

export function BillUpload({ propertyId, onSuccess }: BillUploadProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [billType, setBillType] = useState<string>("")
  const [billingYear, setBillingYear] = useState<string>("")
  const [billingMonth, setBillingMonth] = useState<string>("")
  const [selectedRuleId, setSelectedRuleId] = useState<string>("")
  const [availableRules, setAvailableRules] = useState<ExtractionRule[]>([])
  const [loadingRules, setLoadingRules] = useState(false)

  // Fetch available rules when bill type changes
  useEffect(() => {
    if (!billType || !propertyId) {
      setAvailableRules([])
      setSelectedRuleId("")
      return
    }

    const fetchRules = async () => {
      setLoadingRules(true)
      try {
        const response = await fetch(
          `/api/bills/rules?propertyId=${propertyId}&billType=${billType}`
        )
        if (response.ok) {
          const data = await response.json()
          setAvailableRules(data.rules || [])
          // Auto-select if only one rule
          if (data.rules && data.rules.length === 1) {
            setSelectedRuleId(data.rules[0].id)
          } else {
            setSelectedRuleId("")
          }
        } else {
          setAvailableRules([])
          setSelectedRuleId("")
        }
      } catch (error) {
        console.error("Error fetching rules:", error)
        setAvailableRules([])
        setSelectedRuleId("")
      } finally {
        setLoadingRules(false)
      }
    }

    fetchRules()
  }, [billType, propertyId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file")
        return
      }
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !billType) {
      toast.error("Please select a file and bill type")
      return
    }

    // Require rule selection if multiple rules exist
    if (availableRules.length > 1 && !selectedRuleId) {
      toast.error("Please select an extraction rule to apply")
      return
    }

    // Require rule selection if at least one rule exists
    if (availableRules.length > 0 && !selectedRuleId) {
      toast.error("Please select an extraction rule to apply")
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("propertyId", propertyId)
      formData.append("billType", billType)
      formData.append("source", "manual_upload")
      if (selectedRuleId) {
        formData.append("ruleId", selectedRuleId)
      }
      if (billingYear) {
        formData.append("billingYear", billingYear)
      }
      if (billingMonth) {
        formData.append("billingMonth", billingMonth)
      }

      const response = await fetch("/api/bills/upload", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Bill uploaded successfully! Processing will begin shortly.")
        
        // Reset form
        setFile(null)
        setBillType("")
        setBillingYear("")
        setBillingMonth("")
        setSelectedRuleId("")
        setAvailableRules([])

        // Navigate to bill detail page if bill ID is available, otherwise to bills list
        if (data.data?.id) {
          // Wait a moment for processing to start, then navigate
          setTimeout(() => {
            router.push(`/dashboard/bills/${data.data.id}`)
          }, 500)
        } else {
          // Fallback to bills list
          router.push("/dashboard/bills")
        }
      } else {
        toast.error(data.error || "Failed to upload bill")
      }
    } catch (error) {
      toast.error("Failed to upload bill")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="billType">Bill Type *</Label>
        <Select value={billType} onValueChange={setBillType} required>
          <SelectTrigger>
            <SelectValue placeholder="Select bill type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="municipality">Municipality</SelectItem>
            <SelectItem value="levy">Levy</SelectItem>
            <SelectItem value="utility">Utility</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {billType && (
        <div>
          <Label htmlFor="extractionRule">Extraction Rule *</Label>
          {loadingRules ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading available rules...
            </div>
          ) : availableRules.length === 0 ? (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-yellow-800 text-sm">
                No active extraction rules found for this property and bill type. The bill will be
                uploaded but won't be processed automatically. You can create a rule in the Rules
                section.
              </p>
            </div>
          ) : (
            <>
              <Select
                value={selectedRuleId}
                onValueChange={setSelectedRuleId}
                required={availableRules.length > 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select extraction rule" />
                </SelectTrigger>
                <SelectContent>
                  {availableRules.map((rule) => (
                    <SelectItem key={rule.id} value={rule.id}>
                      {rule.name} ({rule.description})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableRules.length > 1 && (
                <p className="text-muted-foreground text-xs mt-1">
                  Multiple rules available. Select which rule to apply for this bill.
                </p>
              )}
            </>
          )}
        </div>
      )}
      <div>
        <Label htmlFor="billingPeriod">Billing Period</Label>
        <p className="text-muted-foreground text-xs mb-2">
          We'll try to detect this from the statement, but you can set or correct it here.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Select value={billingYear} onValueChange={setBillingYear}>
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 1 + i
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={billingMonth} onValueChange={setBillingMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">January</SelectItem>
                <SelectItem value="2">February</SelectItem>
                <SelectItem value="3">March</SelectItem>
                <SelectItem value="4">April</SelectItem>
                <SelectItem value="5">May</SelectItem>
                <SelectItem value="6">June</SelectItem>
                <SelectItem value="7">July</SelectItem>
                <SelectItem value="8">August</SelectItem>
                <SelectItem value="9">September</SelectItem>
                <SelectItem value="10">October</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">December</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div>
        <Label htmlFor="file">PDF File *</Label>
        <div className="flex items-center gap-4">
          <Input
            id="file"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            required
            className="cursor-pointer"
          />
          {file && (
            <span className="text-muted-foreground text-sm">{file.name}</span>
          )}
        </div>
      </div>
      <Button type="submit" disabled={loading || !file || !billType}>
        <Upload className="mr-2 h-4 w-4" />
        {loading ? "Uploading..." : "Upload Bill"}
      </Button>
    </form>
  )
}

