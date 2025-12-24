"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Mail, Download, Loader2 } from "lucide-react"
import {
  generateInvoiceDataAction,
  updateInvoiceNotesAction
} from "@/actions/rental-invoice-instances-actions"
import { sendInvoiceEmailAction } from "@/lib/email/invoice-email-service"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"

type PdfTemplate = "classic" | "modern" | "minimal" | "professional" | "elegant" | "compact"

interface InvoiceActionsProps {
  instanceId: string
  status: string
  defaultPdfTemplate?: PdfTemplate
}

export function InvoiceActions({ instanceId, status, defaultPdfTemplate = "classic" }: InvoiceActionsProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [notes, setNotes] = useState("")
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState<PdfTemplate>(defaultPdfTemplate)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await generateInvoiceDataAction(instanceId)
      if (result.isSuccess) {
        toast.success("Invoice generated successfully")
        router.refresh()
      } else {
        toast.error(result.message || "Failed to generate invoice")
      }
    } catch (error) {
      toast.error("An error occurred while generating the invoice")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSend = async () => {
    if (!confirm("Are you sure you want to send this invoice to the tenant?")) {
      return
    }

    setIsSending(true)
    try {
      const result = await sendInvoiceEmailAction(instanceId)
      if (result.isSuccess) {
        toast.success("Invoice sent successfully")
        router.refresh()
      } else {
        toast.error(result.message || "Failed to send invoice")
      }
    } catch (error) {
      toast.error("An error occurred while sending the invoice")
    } finally {
      setIsSending(false)
    }
  }

  const handleUpdateNotes = async () => {
    const result = await updateInvoiceNotesAction(instanceId, notes)
    if (result.isSuccess) {
      toast.success("Notes updated successfully")
      setIsNotesDialogOpen(false)
      setNotes("")
      router.refresh()
    } else {
      toast.error(result.message || "Failed to update notes")
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === "ready" && (
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Invoice
            </>
          )}
        </Button>
      )}

      {status === "generated" && (
        <>
          <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Add Notes</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Invoice Notes</DialogTitle>
                <DialogDescription>
                  Add notes or additional information to the invoice
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter notes..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateNotes}>Save Notes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Invoice
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Select
              value={selectedPdfTemplate}
              onValueChange={(value: PdfTemplate) =>
                setSelectedPdfTemplate(value)
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="elegant">Elegant</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild variant="outline">
              <a
                href={`/api/rental-invoices/${instanceId}/pdf?template=${selectedPdfTemplate}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
            </Button>
          </div>
        </>
      )}

      {status === "sent" && (
        <>
          <div className="flex items-center gap-2">
            <Select
              value={selectedPdfTemplate}
              onValueChange={(value: PdfTemplate) =>
                setSelectedPdfTemplate(value)
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="elegant">Elegant</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild variant="outline">
              <a
                href={`/api/rental-invoices/${instanceId}/pdf?template=${selectedPdfTemplate}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
            </Button>
          </div>
          <Button
            onClick={handleSend}
            disabled={isSending}
            variant="outline"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend Invoice
              </>
            )}
          </Button>
        </>
      )}
    </div>
  )
}

