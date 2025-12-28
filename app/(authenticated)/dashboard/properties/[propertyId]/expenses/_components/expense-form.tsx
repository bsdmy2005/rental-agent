"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createExpenseAction, updateExpenseAction, getExpenseCategoriesAction } from "@/actions/expenses-actions"
import { toast } from "sonner"
import { Loader2, X, FileText, Sparkles, Upload, PenTool } from "lucide-react"
import type { SelectExpenseCategory } from "@/db/schema"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ExpenseFormProps {
  propertyId: string
  paidBy: string // userProfileId
  expenseId?: string // For editing
  onSuccess?: () => void
  initialData?: Partial<{
    categoryId: string
    amount: string
    description: string
    expenseDate: string
    paymentMethod: string
    isTaxDeductible: boolean
    taxYear: number
  }>
}

export function ExpenseForm({
  propertyId,
  paidBy,
  expenseId,
  onSuccess,
  initialData
}: ExpenseFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<SelectExpenseCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [files, setFiles] = useState<File[]>([])
  const [extracting, setExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [extractionComplete, setExtractionComplete] = useState(false)
  const [entryMode, setEntryMode] = useState<"upload" | "manual">(
    expenseId || initialData?.amount ? "manual" : "upload"
  ) // Default to upload for new expenses, manual for editing
  const [showForm, setShowForm] = useState(!!expenseId || !!initialData?.amount) // Show form if editing or has initial data

  const [formData, setFormData] = useState({
    categoryId: initialData?.categoryId || "",
    amount: initialData?.amount || "",
    description: initialData?.description || "",
    expenseDate: initialData?.expenseDate || new Date().toISOString().split("T")[0],
    paymentMethod: initialData?.paymentMethod || "",
    isTaxDeductible: initialData?.isTaxDeductible ?? true,
    taxYear: initialData?.taxYear || new Date().getFullYear()
  })

  useEffect(() => {
    async function loadCategories() {
      // Pass userId to get user's custom categories too
      const result = await getExpenseCategoriesAction(paidBy)
      if (result.isSuccess && result.data) {
        setCategories(result.data)
      }
      setLoadingCategories(false)
    }
    loadCategories()
  }, [paidBy])

  const handleExtractFromReceipt = async (file: File) => {
    setExtracting(true)
    setExtractionError(null)
    setExtractionComplete(false)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/expenses/extract", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to extract expense data")
      }

      const result = await response.json()
      const extracted = result.data

      // Pre-fill form with extracted data
      if (extracted) {
        // Find matching category by category enum value or name
        const matchedCategory = categories.find(
          (cat) =>
            cat.category === extracted.category ||
            cat.name.toLowerCase() === extracted.category?.toLowerCase()
        )

        setFormData((prev) => ({
          ...prev,
          amount: extracted.amount?.toString() || prev.amount,
          description: extracted.description || prev.description,
          expenseDate: extracted.date || prev.expenseDate,
          paymentMethod: extracted.paymentMethod || prev.paymentMethod,
          categoryId: matchedCategory?.id || prev.categoryId,
          taxYear: extracted.date
            ? new Date(extracted.date).getFullYear()
            : prev.taxYear
        }))

        setExtractionComplete(true)
        setShowForm(true)
        toast.success("Expense data extracted successfully! Please review and adjust as needed.")
      }
    } catch (error) {
      console.error("Error extracting expense:", error)
      setExtractionError(
        error instanceof Error ? error.message : "Failed to extract expense data"
      )
      toast.error("Failed to extract expense data. Please fill in manually.")
      // Still show form so user can fill manually
      setShowForm(true)
    } finally {
      setExtracting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setFiles(newFiles)
      
      // Automatically trigger extraction for the first file
      if (newFiles.length > 0 && !expenseId) {
        handleExtractFromReceipt(newFiles[0])
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let result
      if (expenseId) {
        // Update existing expense
        result = await updateExpenseAction(expenseId, {
          categoryId: formData.categoryId,
          amount: formData.amount,
          description: formData.description,
          expenseDate: new Date(formData.expenseDate),
          paymentMethod: formData.paymentMethod || null,
          isTaxDeductible: formData.isTaxDeductible,
          taxYear: formData.taxYear
        })
      } else {
        // Create new expense
        result = await createExpenseAction({
          propertyId,
          categoryId: formData.categoryId,
          amount: formData.amount,
          description: formData.description,
          expenseDate: new Date(formData.expenseDate),
          paidBy,
          paymentMethod: formData.paymentMethod || null,
          isTaxDeductible: formData.isTaxDeductible,
          taxYear: formData.taxYear
        })
      }

      if (result.isSuccess && result.data) {
        // Upload files if any (only for new expenses)
        if (!expenseId && files.length > 0) {
          for (const file of files) {
            try {
              const uploadFormData = new FormData()
              uploadFormData.append("file", file)
              uploadFormData.append("expenseId", result.data.id)

              const uploadResponse = await fetch("/api/expenses/upload", {
                method: "POST",
                body: uploadFormData
              })

              if (!uploadResponse.ok) {
                console.error("Failed to upload file:", file.name)
              }
            } catch (error) {
              console.error("Error uploading file:", error)
            }
          }
        }

        toast.success(expenseId ? "Expense updated successfully" : "Expense created successfully")
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/dashboard/properties/${propertyId}/expenses`)
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error saving expense:", error)
      toast.error(expenseId ? "Failed to update expense" : "Failed to create expense")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{expenseId ? "Edit Expense" : "Add Expense"}</CardTitle>
        <CardDescription>
          {expenseId
            ? "Update expense details"
            : "Upload a receipt or invoice to automatically extract expense details"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Entry Mode Selection */}
          {!expenseId && (
            <Tabs value={entryMode} onValueChange={(value) => {
              setEntryMode(value as "upload" | "manual")
              if (value === "manual") {
                setShowForm(true)
              } else {
                setShowForm(files.length > 0 && extractionComplete)
              }
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Receipt
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <PenTool className="h-4 w-4 mr-2" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Step 1: File Upload Section */}
          {!expenseId && entryMode === "upload" && (
            <div className="space-y-4 border-b pb-6">
              <div>
                <Label htmlFor="receipts" className="text-base font-semibold">
                  Upload Receipt or Invoice *
                </Label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="receipts"
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        extracting
                          ? "border-primary bg-primary/5"
                          : files.length > 0
                            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                            : "border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {extracting ? (
                          <>
                            <Loader2 className="w-8 h-8 mb-2 text-primary animate-spin" />
                            <p className="mb-2 text-sm font-medium text-primary">
                              Extracting expense data...
                            </p>
                            <p className="text-xs text-muted-foreground">
                              This may take a few seconds
                            </p>
                          </>
                        ) : files.length > 0 ? (
                          <>
                            <FileText className="w-8 h-8 mb-2 text-green-600" />
                            <p className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
                              File uploaded successfully
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {files.length} file{files.length !== 1 ? "s" : ""} ready
                            </p>
                          </>
                        ) : (
                          <>
                            <FileText className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              PDF, JPEG, PNG (MAX. 10MB each)
                            </p>
                          </>
                        )}
                      </div>
                      <Input
                        id="receipts"
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={extracting}
                      />
                    </label>
                  </div>
                  
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Uploaded files:</p>
                      <div className="flex flex-wrap gap-2">
                        {files.map((file, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span className="max-w-[200px] truncate">{file.name}</span>
                            {!extracting && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newFiles = files.filter((_, i) => i !== index)
                                  setFiles(newFiles)
                                  if (newFiles.length === 0) {
                                    setShowForm(false)
                                    setExtractionComplete(false)
                                  }
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                      {!extracting && extractionComplete && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtractFromReceipt(files[0])}
                          className="mt-2"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Re-extract from {files[0].name}
                        </Button>
                      )}
                    </div>
                  )}

                  {extractionError && (
                    <Alert variant="destructive">
                      <AlertDescription>{extractionError}</AlertDescription>
                    </Alert>
                  )}

                  {extractionComplete && (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                      <Sparkles className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        Expense data extracted successfully! Review and edit the details below, then
                        save.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Expense Form Section */}
          {(showForm || entryMode === "manual") && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="categoryId">Category *</Label>
                {loadingCategories ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading categories...
                  </div>
                ) : (
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="amount">Amount (R) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the expense..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="expenseDate">Date *</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  required
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="taxYear">Tax Year *</Label>
                <Input
                  id="taxYear"
                  type="number"
                  required
                  value={formData.taxYear}
                  onChange={(e) =>
                    setFormData({ ...formData, taxYear: parseInt(e.target.value) })
                  }
                  min={2020}
                  max={2100}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isTaxDeductible"
                  checked={formData.isTaxDeductible}
                  onChange={(e) =>
                    setFormData({ ...formData, isTaxDeductible: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="isTaxDeductible">Tax Deductible</Label>
              </div>

              {/* File upload section for manual entry or editing */}
              {(entryMode === "manual" || expenseId) && (
                <div>
                  <Label htmlFor="receipts">Receipts/Invoices (Optional)</Label>
                  <div className="space-y-2">
                    <Input
                      id="receipts"
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          const newFiles = Array.from(e.target.files)
                          setFiles((prev) => [...prev, ...newFiles])
                          
                          // Auto-extract if in manual mode and form is empty
                          if (entryMode === "manual" && newFiles.length > 0 && !formData.amount && !formData.description) {
                            handleExtractFromReceipt(newFiles[0])
                          }
                        }
                      }}
                    />
                    <p className="text-muted-foreground text-xs">
                      {entryMode === "manual"
                        ? "Optionally upload receipts/invoices to auto-fill fields (PDF, JPEG, PNG - max 10MB each)"
                        : "Add more receipts or invoices (PDF, JPEG, PNG - max 10MB each)"}
                    </p>
                    {extracting && (
                      <Alert>
                        <Sparkles className="h-4 w-4" />
                        <AlertDescription>
                          Extracting expense data from receipt using AI...
                        </AlertDescription>
                      </Alert>
                    )}
                    {extractionError && (
                      <Alert variant="destructive">
                        <AlertDescription>{extractionError}</AlertDescription>
                      </Alert>
                    )}
                    {files.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm font-medium">Uploaded files:</p>
                        <div className="flex flex-wrap gap-2">
                          {files.map((file, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span className="max-w-[200px] truncate">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFiles(files.filter((_, i) => i !== index))
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        {!extracting && files.length > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleExtractFromReceipt(files[0])}
                            className="mt-2"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Extract from {files[0].name}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading || extracting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || extracting}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {expenseId ? "Update Expense" : "Save Expense"}
                </Button>
              </div>
            </div>
          )}

          {/* Show message if no file uploaded yet in upload mode */}
          {!showForm && !expenseId && entryMode === "upload" && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Upload a receipt or invoice above to get started</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

