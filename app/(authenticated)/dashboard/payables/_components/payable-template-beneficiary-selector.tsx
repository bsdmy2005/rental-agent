"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { listBankAccountsAction } from "@/actions/bank-accounts-actions"
import { listBeneficiariesAction } from "@/actions/beneficiaries-actions"
import { type SelectBankAccount, type SelectBeneficiary } from "@/db/schema"
import { Loader2, X } from "lucide-react"

interface PayableTemplateBeneficiarySelectorProps {
  propertyId: string
  paymentInstructionId: string | null
  selectedBankAccountId: string | null
  onBankAccountChange: (bankAccountId: string | null) => void
  selectedBeneficiaryId?: string | null
  onBeneficiaryChange?: (beneficiaryId: string | null) => void
  showBeneficiary?: boolean
}

export function PayableTemplateBeneficiarySelector({
  propertyId,
  paymentInstructionId,
  selectedBankAccountId,
  onBankAccountChange,
  selectedBeneficiaryId,
  onBeneficiaryChange,
  showBeneficiary = false
}: PayableTemplateBeneficiarySelectorProps) {
  const [bankAccounts, setBankAccounts] = useState<SelectBankAccount[]>([])
  const [beneficiaries, setBeneficiaries] = useState<SelectBeneficiary[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false)

  // Load bank accounts when payment instruction is available
  useEffect(() => {
    if (paymentInstructionId) {
      loadBankAccounts()
    } else {
      setBankAccounts([])
      setBeneficiaries([])
    }
  }, [paymentInstructionId])

  const loadBankAccounts = async () => {
    if (!paymentInstructionId) return

    setLoadingAccounts(true)
    try {
      const result = await listBankAccountsAction(paymentInstructionId)
      if (result.isSuccess && result.data) {
        setBankAccounts(result.data)
      }
    } catch (error) {
      console.error("Error loading bank accounts:", error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const loadBeneficiaries = async () => {
    if (!paymentInstructionId) return

    setLoadingBeneficiaries(true)
    try {
      // List all beneficiaries for the payment instruction (beneficiaries are global per payment instruction)
      const result = await listBeneficiariesAction(paymentInstructionId)
      if (result.isSuccess && result.data) {
        setBeneficiaries(result.data)
      } else {
        console.error("Failed to load beneficiaries:", result.message)
        setBeneficiaries([])
      }
    } catch (error) {
      console.error("Error loading beneficiaries:", error)
      setBeneficiaries([])
    } finally {
      setLoadingBeneficiaries(false)
    }
  }

  // Load beneficiaries when bank account is selected and showBeneficiary is true
  useEffect(() => {
    if (selectedBankAccountId && showBeneficiary && paymentInstructionId) {
      loadBeneficiaries()
    } else {
      setBeneficiaries([])
    }
  }, [selectedBankAccountId, showBeneficiary, paymentInstructionId])

  if (!paymentInstructionId) {
    return (
      <div className="space-y-2">
        <Label>Bank Account</Label>
        <p className="text-muted-foreground text-sm">
          Please configure payment instructions for this property first.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bankAccount">Bank Account</Label>
        {loadingAccounts ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading bank accounts...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Select
              value={selectedBankAccountId || undefined}
              onValueChange={(value) => {
                onBankAccountChange(value || null)
                if (onBeneficiaryChange) {
                  onBeneficiaryChange(null)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a bank account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.accountName} ({account.accountNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBankAccountId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onBankAccountChange(null)
                  if (onBeneficiaryChange) {
                    onBeneficiaryChange(null)
                  }
                }}
              >
                Clear
              </Button>
            )}
          </div>
        )}
        {bankAccounts.length === 0 && !loadingAccounts && (
          <p className="text-muted-foreground text-xs">
            No bank accounts found. Please sync bank accounts in payment instructions.
          </p>
        )}
      </div>

      {showBeneficiary && selectedBankAccountId && (
        <div className="space-y-2">
          <Label htmlFor="beneficiary">Beneficiary (Optional)</Label>
          {loadingBeneficiaries ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading beneficiaries...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Select
                value={selectedBeneficiaryId || undefined}
                onValueChange={(value) => {
                  if (onBeneficiaryChange) {
                    onBeneficiaryChange(value || null)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a beneficiary (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {beneficiaries.map((ben) => (
                    <SelectItem key={ben.id} value={ben.id}>
                      {ben.name} {ben.bankAccountNumber ? `(${ben.bankAccountNumber})` : `(${ben.beneficiaryId})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBeneficiaryId && onBeneficiaryChange && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onBeneficiaryChange(null)
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          )}
          {beneficiaries.length === 0 && !loadingBeneficiaries && selectedBankAccountId && (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">
                No beneficiaries found for this account.
              </p>
              <p className="text-muted-foreground text-xs">
                Please sync beneficiaries in Payment Instructions, or beneficiaries will be selected when executing payments.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

