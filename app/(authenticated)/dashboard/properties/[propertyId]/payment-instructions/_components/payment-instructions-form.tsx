"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  createPaymentInstructionAction,
  updatePaymentInstructionAction,
  testPaymentInstructionAction
} from "@/actions/payment-instructions-actions"
import { syncBankAccountsAction, listBankAccountsAction } from "@/actions/bank-accounts-actions"
import { syncBeneficiariesAction, listBeneficiariesAction } from "@/actions/beneficiaries-actions"
import { type SelectBankAccount, type SelectBeneficiary } from "@/db/schema"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, RefreshCw, Building2, Users } from "lucide-react"

interface PaymentInstructionsFormProps {
  propertyId: string
  existingInstruction?: { id: string; bankProvider: string; isActive: boolean } | null
}

export function PaymentInstructionsForm({
  propertyId,
  existingInstruction
}: PaymentInstructionsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showClientId, setShowClientId] = useState(false)
  const [showClientSecret, setShowClientSecret] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [bankAccounts, setBankAccounts] = useState<SelectBankAccount[]>([])
  const [beneficiaries, setBeneficiaries] = useState<SelectBeneficiary[]>([])
  const [syncingAccounts, setSyncingAccounts] = useState(false)
  const [syncingBeneficiaries, setSyncingBeneficiaries] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false)

  const [formData, setFormData] = useState({
    bankProvider: existingInstruction?.bankProvider || "investec",
    clientId: "",
    clientSecret: "",
    apiKey: "",
    apiUrl: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTestResult(null)

    try {
      if (existingInstruction) {
        const result = await updatePaymentInstructionAction(existingInstruction.id, {
          clientId: formData.clientId || undefined,
          clientSecret: formData.clientSecret || undefined,
          apiKey: formData.apiKey || undefined,
          apiUrl: formData.apiUrl || undefined
        })

        if (result.isSuccess) {
          toast.success("Payment instructions updated successfully")
          router.refresh()
        } else {
          toast.error(result.message)
        }
      } else {
        const result = await createPaymentInstructionAction(propertyId, {
          bankProvider: formData.bankProvider,
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          apiKey: formData.apiKey || undefined,
          apiUrl: formData.apiUrl || undefined
        })

        if (result.isSuccess) {
          toast.success("Payment instructions created successfully")
          router.refresh()
          // Reload page to get existing instruction
          window.location.reload()
        } else {
          toast.error(result.message)
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Load bank accounts and beneficiaries when instruction exists
  useEffect(() => {
    if (existingInstruction?.id) {
      loadBankAccounts()
      loadBeneficiaries()
    }
  }, [existingInstruction?.id])

  const loadBankAccounts = async () => {
    if (!existingInstruction?.id) return
    setLoadingAccounts(true)
    try {
      const result = await listBankAccountsAction(existingInstruction.id)
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
    if (!existingInstruction?.id) return
    setLoadingBeneficiaries(true)
    try {
      const result = await listBeneficiariesAction(existingInstruction.id)
      if (result.isSuccess && result.data) {
        setBeneficiaries(result.data)
      }
    } catch (error) {
      console.error("Error loading beneficiaries:", error)
    } finally {
      setLoadingBeneficiaries(false)
    }
  }

  const handleSyncAccounts = async () => {
    if (!existingInstruction?.id) {
      toast.error("Please save payment instructions first")
      return
    }

    setSyncingAccounts(true)
    try {
      const result = await syncBankAccountsAction(existingInstruction.id)
      if (result.isSuccess) {
        toast.success(result.message)
        await loadBankAccounts()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to sync bank accounts")
    } finally {
      setSyncingAccounts(false)
    }
  }

  const handleSyncBeneficiaries = async () => {
    if (!existingInstruction?.id) {
      toast.error("Please save payment instructions first")
      return
    }

    setSyncingBeneficiaries(true)
    try {
      const result = await syncBeneficiariesAction(existingInstruction.id)
      if (result.isSuccess) {
        toast.success(result.message)
        await loadBeneficiaries()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to sync beneficiaries")
    } finally {
      setSyncingBeneficiaries(false)
    }
  }

  const handleTest = async () => {
    if (!existingInstruction) {
      toast.error("Please save payment instructions first")
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const result = await testPaymentInstructionAction(existingInstruction.id)

      if (result.isSuccess && result.data) {
        setTestResult({ success: true, message: result.data.message })
        toast.success("Connection test successful")
      } else {
        setTestResult({ success: false, message: result.message })
        toast.error("Connection test failed")
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      })
      toast.error("Connection test failed")
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payment Provider Configuration</CardTitle>
          <CardDescription>
            Configure your payment provider credentials. Credentials are encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bankProvider">Payment Provider</Label>
            <Select
              value={formData.bankProvider}
              onValueChange={(value) => setFormData({ ...formData, bankProvider: value })}
              disabled={!!existingInstruction}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="investec">Investec</SelectItem>
              </SelectContent>
            </Select>
            {existingInstruction && (
              <p className="text-muted-foreground text-xs">
                Provider cannot be changed after creation. Create a new payment instruction to change.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">
              Client ID <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="clientId"
                type={showClientId ? "text" : "password"}
                required={!existingInstruction}
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                placeholder="Enter client ID"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowClientId(!showClientId)}
              >
                {showClientId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {existingInstruction && (
              <p className="text-muted-foreground text-xs">
                Leave blank to keep existing value. Enter new value to update.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">
              Client Secret <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="clientSecret"
                type={showClientSecret ? "text" : "password"}
                required={!existingInstruction}
                value={formData.clientSecret}
                onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                placeholder="Enter client secret"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowClientSecret(!showClientSecret)}
              >
                {showClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {existingInstruction && (
              <p className="text-muted-foreground text-xs">
                Leave blank to keep existing value. Enter new value to update.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key (Optional)</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="Enter API key (optional)"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Some Investec API endpoints may require an API key
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiUrl">API URL (Optional)</Label>
            <Input
              id="apiUrl"
              type="url"
              value={formData.apiUrl}
              onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
              placeholder="https://openapi.investec.com (default)"
            />
            <p className="text-muted-foreground text-xs">
              Leave blank to use default production URL
            </p>
          </div>

          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingInstruction ? "Update Instructions" : "Save Instructions"}
            </Button>

            {existingInstruction && (
              <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
            )}
          </div>
        </form>
        </CardContent>
      </Card>

      {existingInstruction && (
        <>
          {/* Bank Accounts Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bank Accounts</CardTitle>
                <CardDescription>
                  Synced bank accounts from Investec. These can be associated with payable templates.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAccounts}
                disabled={syncingAccounts || loadingAccounts}
              >
                {syncingAccounts ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync Accounts
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">No bank accounts synced</p>
                <p className="text-xs text-muted-foreground">
                  Click "Sync Accounts" to fetch accounts from Investec
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.accountName}</TableCell>
                      <TableCell>{account.accountNumber}</TableCell>
                      <TableCell>
                        {account.currentBalance
                          ? `R ${parseFloat(account.currentBalance).toLocaleString("en-ZA", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}`
                          : "N/A"}
                      </TableCell>
                      <TableCell>{account.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Beneficiaries Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Beneficiaries</CardTitle>
                <CardDescription>
                  Synced beneficiaries from Investec. Only beneficiaries set up via online banking can be used for payments.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncBeneficiaries}
                disabled={syncingBeneficiaries || loadingBeneficiaries}
              >
                {syncingBeneficiaries ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync Beneficiaries
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingBeneficiaries ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : beneficiaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">No beneficiaries synced</p>
                <p className="text-xs text-muted-foreground">
                  Click "Sync Beneficiaries" to fetch beneficiaries from Investec
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Bank Code</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beneficiaries.map((beneficiary) => (
                    <TableRow key={beneficiary.id}>
                      <TableCell className="font-medium">{beneficiary.name}</TableCell>
                      <TableCell>{beneficiary.bankAccountNumber || "N/A"}</TableCell>
                      <TableCell>{beneficiary.bankCode || "N/A"}</TableCell>
                      <TableCell>{beneficiary.beneficiaryType || "Standard"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </>
      )}
    </>
  )
}

