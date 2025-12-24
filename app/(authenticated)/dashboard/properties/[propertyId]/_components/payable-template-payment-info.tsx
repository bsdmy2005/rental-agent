"use client"

import { useState, useEffect } from "react"
import { getBankAccountAction } from "@/actions/bank-accounts-actions"
import { getBeneficiaryAction } from "@/actions/beneficiaries-actions"
import { type SelectPayableTemplate } from "@/db/schema"
import { Loader2 } from "lucide-react"

interface PayableTemplatePaymentInfoProps {
  template: SelectPayableTemplate
}

export function PayableTemplatePaymentInfo({ template }: PayableTemplatePaymentInfoProps) {
  const [bankAccountName, setBankAccountName] = useState<string | null>(null)
  const [beneficiaryName, setBeneficiaryName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadPaymentInfo = async () => {
      if (!template.bankAccountId && !(template as any).beneficiaryId) {
        return
      }

      setLoading(true)
      try {
        if (template.bankAccountId) {
          const bankResult = await getBankAccountAction(template.bankAccountId)
          if (bankResult.isSuccess && bankResult.data) {
            setBankAccountName(bankResult.data.accountName)
          }
        }

        if ((template as any).beneficiaryId) {
          const beneficiaryResult = await getBeneficiaryAction((template as any).beneficiaryId)
          if (beneficiaryResult.isSuccess && beneficiaryResult.data) {
            setBeneficiaryName(beneficiaryResult.data.name)
          }
        }
      } catch (error) {
        console.error("Error loading payment info:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPaymentInfo()
  }, [template.bankAccountId, (template as any).beneficiaryId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading payment info...
      </div>
    )
  }

  if (!template.bankAccountId && !(template as any).beneficiaryId) {
    return (
      <p className="text-sm text-muted-foreground">Not linked</p>
    )
  }

  const bankText = bankAccountName || "Unknown account"
  const beneficiaryText = beneficiaryName || (template.bankAccountId ? "No beneficiary selected" : null)

  return (
    <p className="text-sm text-muted-foreground">
      Bank: {bankText}
      {beneficiaryText && ` | Beneficiary: ${beneficiaryText}`}
    </p>
  )
}

