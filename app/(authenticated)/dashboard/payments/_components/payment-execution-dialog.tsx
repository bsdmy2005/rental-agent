"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { executePayablePaymentAction } from "@/actions/payments-actions"
import { listBeneficiariesAction } from "@/actions/beneficiaries-actions"
import { type PayableInstanceWithDetails } from "@/queries/payable-instances-queries"
import { type SelectBeneficiary } from "@/db/schema"
import { toast } from "sonner"
import { Loader2, CreditCard } from "lucide-react"
import { useRouter } from "next/navigation"

interface PaymentExecutionDialogProps {
  payable: PayableInstanceWithDetails
  paymentInstructionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentExecutionDialog({
  payable,
  paymentInstructionId,
  open,
  onOpenChange
}: PaymentExecutionDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [beneficiaries, setBeneficiaries] = useState<SelectBeneficiary[]>([])
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false)
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>(
    payable.templateBeneficiaryId || ""
  )
  const [amount, setAmount] = useState<string>(payable.amount.toString())
  const [myReference, setMyReference] = useState("")
  const [theirReference, setTheirReference] = useState("")

  // Load beneficiaries when dialog opens
  useEffect(() => {
    if (open && paymentInstructionId) {
      loadBeneficiaries()
    }
  }, [open, paymentInstructionId])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setAmount(payable.amount.toString())
      setSelectedBeneficiaryId(payable.templateBeneficiaryId || "")
      setMyReference("")
      setTheirReference("")
    }
  }, [open, payable])

  const loadBeneficiaries = async () => {
    setLoadingBeneficiaries(true)
    try {
      const result = await listBeneficiariesAction(paymentInstructionId)
      if (result.isSuccess && result.data) {
        setBeneficiaries(result.data)
      } else {
        toast.error("Failed to load beneficiaries")
      }
    } catch (error) {
      toast.error("Failed to load beneficiaries")
    } finally {
      setLoadingBeneficiaries(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedBeneficiaryId) {
      toast.error("Please select a beneficiary")
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount greater than zero")
      return
    }

    if (!myReference.trim() || !theirReference.trim()) {
      toast.error("Please enter both reference fields")
      return
    }

    setLoading(true)
    try {
      const result = await executePayablePaymentAction(
        payable.id,
        selectedBeneficiaryId,
        myReference.trim(),
        theirReference.trim(),
        amountNum !== payable.amount ? amountNum : undefined
      )

      if (result.isSuccess) {
        toast.success("Payment executed successfully")
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return ""
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: payable.currency || "ZAR"
    }).format(num)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Execute Payment</DialogTitle>
          <DialogDescription>
            Execute payment for {payable.templateName} - {payable.propertyName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md bg-muted p-3 space-y-1">
            <p className="text-sm font-medium">Payable Details</p>
            <p className="text-sm text-muted-foreground">
              Period: {new Date(payable.periodYear, payable.periodMonth - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </p>
            <p className="text-sm text-muted-foreground">
              Default Amount: {formatCurrency(payable.amount.toString())}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Payment Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter payment amount"
              required
            />
            {amount && !isNaN(parseFloat(amount)) && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(amount)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="beneficiary">Beneficiary *</Label>
            {loadingBeneficiaries ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading beneficiaries...
              </div>
            ) : (
              <Select value={selectedBeneficiaryId} onValueChange={setSelectedBeneficiaryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a beneficiary" />
                </SelectTrigger>
                <SelectContent>
                  {beneficiaries.map((ben) => (
                    <SelectItem key={ben.id} value={ben.id}>
                      {ben.name} {ben.bankAccountNumber ? `(${ben.bankAccountNumber})` : `(${ben.beneficiaryId})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {beneficiaries.length === 0 && !loadingBeneficiaries && (
              <p className="text-muted-foreground text-xs">
                No beneficiaries found. Please sync beneficiaries in payment instructions.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="myReference">My Reference *</Label>
            <Input
              id="myReference"
              value={myReference}
              onChange={(e) => setMyReference(e.target.value)}
              placeholder="Enter your reference"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="theirReference">Their Reference *</Label>
            <Input
              id="theirReference"
              value={theirReference}
              onChange={(e) => setTheirReference(e.target.value)}
              placeholder="Enter beneficiary reference"
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={loading || !selectedBeneficiaryId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Execute Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

