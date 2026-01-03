"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { updatePayableTemplateAction } from "@/actions/payable-templates-actions"
import { type SelectPayableTemplate } from "@/db/schema"
import { PayableTemplateBeneficiarySelector } from "@/app/(authenticated)/dashboard/payables/_components/payable-template-beneficiary-selector"
import { Save, X } from "lucide-react"

interface PayableTemplateLinkDialogProps {
  template: SelectPayableTemplate
  paymentInstructionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function PayableTemplateLinkDialog({
  template,
  paymentInstructionId,
  open,
  onOpenChange,
  onSuccess
}: PayableTemplateLinkDialogProps) {
  const router = useRouter()
  const [bankAccountId, setBankAccountId] = useState<string | null>(template.bankAccountId || null)
  const [beneficiaryId, setBeneficiaryId] = useState<string | null>(
    template.beneficiaryId || null
  )
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      const result = await updatePayableTemplateAction(template.id, {
        bankAccountId,
        beneficiaryId
      })

      if (result.isSuccess) {
        toast.success("Payment link updated successfully")
        onSuccess()
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.message || "Failed to update payment link")
      }
    } catch (error) {
      console.error("Error updating payment link:", error)
      toast.error("Failed to update payment link")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link Payment Account</DialogTitle>
          <DialogDescription>
            Select a bank account and beneficiary for "{template.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <PayableTemplateBeneficiarySelector
            propertyId={template.propertyId}
            paymentInstructionId={paymentInstructionId}
            selectedBankAccountId={bankAccountId}
            onBankAccountChange={(id) => {
              setBankAccountId(id)
              setBeneficiaryId(null) // Reset beneficiary when bank account changes
            }}
            selectedBeneficiaryId={beneficiaryId}
            onBeneficiaryChange={setBeneficiaryId}
            showBeneficiary={true}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-1" />
            Save Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

