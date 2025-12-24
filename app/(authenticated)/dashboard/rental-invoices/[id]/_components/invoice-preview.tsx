"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit2, Save, X, Trash2, Plus } from "lucide-react"
import type { InvoiceData, InvoiceLineItem } from "@/types"
import type { SelectRentalInvoiceInstance } from "@/db/schema"
import {
  updateInvoiceLineItemAction,
  addInvoiceLineItemAction,
  deleteInvoiceLineItemAction
} from "@/actions/rental-invoice-instances-actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface InvoicePreviewProps {
  invoiceData: InvoiceData
  instance: SelectRentalInvoiceInstance & {
    property: { name: string }
    tenant: { name: string; email?: string | null; phone?: string | null }
  }
  instanceId: string
  canEdit?: boolean
}

export function InvoicePreview({ invoiceData: initialInvoiceData, instance, instanceId, canEdit = false }: InvoicePreviewProps) {
  const router = useRouter()
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(initialInvoiceData)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<InvoiceLineItem>>({})
  const [newItem, setNewItem] = useState<Partial<InvoiceLineItem>>({
    type: "other",
    description: "",
    amount: 0
  })

  // Sync with prop changes
  useEffect(() => {
    setInvoiceData(initialInvoiceData)
  }, [initialInvoiceData])

  const formatCurrency = (amount: number) => {
    return `R ${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const handleUpdate = async (lineItemId: string, data: Partial<InvoiceLineItem>) => {
    const result = await updateInvoiceLineItemAction(instanceId, lineItemId, data)
    if (result.isSuccess && result.data) {
      const updatedData = result.data.invoiceData as InvoiceData
      setInvoiceData(updatedData)
      setEditingId(null)
      router.refresh()
      toast.success("Line item updated successfully")
    } else {
      toast.error(result.message || "Failed to update line item")
    }
  }

  const handleSaveEdit = async (lineItemId: string) => {
    await handleUpdate(lineItemId, editingItem)
  }

  const handleAdd = async () => {
    if (!newItem.description || !newItem.amount) {
      toast.error("Description and amount are required")
      return
    }

    const result = await addInvoiceLineItemAction(instanceId, {
      type: newItem.type || "other",
      description: newItem.description,
      quantity: newItem.quantity ?? null,
      unitPrice: newItem.unitPrice ?? null,
      amount: newItem.amount,
      usage: newItem.usage ?? null,
      sourceBillId: null
    })

    if (result.isSuccess && result.data) {
      const updatedData = result.data.invoiceData as InvoiceData
      setInvoiceData(updatedData)
      setIsAdding(false)
      setNewItem({ type: "other", description: "", amount: 0 })
      router.refresh()
      toast.success("Line item added successfully")
    } else {
      toast.error(result.message || "Failed to add line item")
    }
  }

  const handleDelete = async (lineItemId: string) => {
    if (!confirm("Are you sure you want to delete this line item?")) {
      return
    }

    const result = await deleteInvoiceLineItemAction(instanceId, lineItemId)
    if (result.isSuccess && result.data) {
      const updatedData = result.data.invoiceData as InvoiceData
      setInvoiceData(updatedData)
      router.refresh()
      toast.success("Line item deleted successfully")
    } else {
      toast.error(result.message || "Failed to delete line item")
    }
  }

  const startEdit = (item: InvoiceLineItem) => {
    setEditingId(item.id)
    setEditingItem({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Invoice Preview</CardTitle>
            <CardDescription className="text-xs">Preview of the invoice that will be sent to the tenant</CardDescription>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compact Header */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-1">Invoice #</p>
            <p className="text-muted-foreground">{invoiceData.invoiceNumber}</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Due Date</p>
            <p className="text-muted-foreground">{formatDate(invoiceData.dueDate)}</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Property</p>
            <p className="text-muted-foreground">{instance.property.name}</p>
            <p className="text-muted-foreground text-xs">{invoiceData.propertyAddress.fullAddress}</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Bill To</p>
            <p className="text-muted-foreground">{instance.tenant.name}</p>
            {instance.tenant.email && <p className="text-muted-foreground text-xs">{instance.tenant.email}</p>}
          </div>
          <div>
            <p className="font-semibold mb-1">Period</p>
            <p className="text-muted-foreground">{formatDate(invoiceData.periodStart)} - {formatDate(invoiceData.periodEnd)}</p>
          </div>
          {invoiceData.billingAddress && (
            <div>
              <p className="font-semibold mb-1">Billing Address</p>
              <p className="text-muted-foreground text-xs">{invoiceData.billingAddress}</p>
            </div>
          )}
        </div>

        {/* Line Items */}
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8">Description</TableHead>
                <TableHead className="text-right h-8 w-20">Qty</TableHead>
                <TableHead className="text-right h-8 w-24">Unit Price</TableHead>
                <TableHead className="text-right h-8 w-28">Amount</TableHead>
                {canEdit && <TableHead className="text-right h-8 w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceData.lineItems.map((item) => (
                <TableRow key={item.id} className="h-10">
                  {editingId === item.id ? (
                    <>
                      <TableCell className="p-2">
                        <Input
                          value={editingItem.description || ""}
                          onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="p-2 text-right">
                        <Input
                          type="number"
                          value={editingItem.quantity ?? ""}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              quantity: e.target.value ? parseFloat(e.target.value) : null
                            })
                          }
                          className="h-8 w-20 text-sm"
                        />
                      </TableCell>
                      <TableCell className="p-2 text-right">
                        <Input
                          type="number"
                          value={editingItem.unitPrice ?? ""}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              unitPrice: e.target.value ? parseFloat(e.target.value) : null
                            })
                          }
                          className="h-8 w-24 text-sm"
                        />
                      </TableCell>
                      <TableCell className="p-2 text-right">
                        <Input
                          type="number"
                          value={editingItem.amount || ""}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              amount: parseFloat(e.target.value) || 0
                            })
                          }
                          className="h-8 w-28 text-sm"
                        />
                      </TableCell>
                      {canEdit && (
                        <TableCell className="p-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleSaveEdit(item.id)}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingId(null)
                                setEditingItem({})
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </>
                  ) : (
                    <>
                      <TableCell className="py-2">{item.description}</TableCell>
                      <TableCell className="text-right py-2">{item.quantity ?? "-"}</TableCell>
                      <TableCell className="text-right py-2">
                        {item.unitPrice ? formatCurrency(item.unitPrice) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium py-2">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="py-2 text-right">
                          <div className="flex justify-end gap-1">
                            {item.type !== "rental" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => startEdit(item)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
              ))}
              {isAdding && (
                <TableRow>
                  <TableCell className="p-2">
                    <Input
                      placeholder="Description"
                      value={newItem.description || ""}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={newItem.quantity ?? ""}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          quantity: e.target.value ? parseFloat(e.target.value) : null
                        })
                      }
                      className="h-8 w-20 text-sm"
                    />
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={newItem.unitPrice ?? ""}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          unitPrice: e.target.value ? parseFloat(e.target.value) : null
                        })
                      }
                      className="h-8 w-24 text-sm"
                    />
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newItem.amount ?? ""}
                      onChange={(e) =>
                        setNewItem({ ...newItem, amount: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 w-28 text-sm"
                    />
                  </TableCell>
                  {canEdit && (
                    <TableCell className="p-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={handleAdd}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setIsAdding(false)
                            setNewItem({ type: "other", description: "", amount: 0 })
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add Item Button (if not already adding) */}
        {canEdit && !isAdding && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Line Item
            </Button>
          </div>
        )}

        {/* Totals */}
        <div className="border-t pt-3">
          <div className="flex justify-end">
            <div className="w-56 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoiceData.subtotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 text-base">
                <span className="font-bold">Total:</span>
                <span className="font-bold">{formatCurrency(invoiceData.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoiceData.notes && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium mb-1">Notes</p>
            <p className="text-xs text-muted-foreground">{invoiceData.notes}</p>
          </div>
        )}

        {/* Payment Instructions */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium mb-2">Payment Instructions</p>
          {invoiceData.bankingDetails && (
            <div className="space-y-0.5 text-xs">
              {invoiceData.bankingDetails.bankName && (
                <p><span className="font-medium">Bank:</span> {invoiceData.bankingDetails.bankName}</p>
              )}
              {invoiceData.bankingDetails.accountHolderName && (
                <p><span className="font-medium">Account:</span> {invoiceData.bankingDetails.accountHolderName}</p>
              )}
              {invoiceData.bankingDetails.accountNumber && (
                <p><span className="font-medium">Acc #:</span> {invoiceData.bankingDetails.accountNumber}</p>
              )}
              {invoiceData.bankingDetails.branchCode && (
                <p><span className="font-medium">Branch:</span> {invoiceData.bankingDetails.branchCode}</p>
              )}
              {invoiceData.bankingDetails.swiftCode && (
                <p><span className="font-medium">Swift:</span> {invoiceData.bankingDetails.swiftCode}</p>
              )}
              {invoiceData.bankingDetails.referenceFormat ? (
                <p><span className="font-medium">Ref:</span> {invoiceData.bankingDetails.referenceFormat.replace("{INVOICE_NUMBER}", invoiceData.invoiceNumber)}</p>
              ) : (
                <p><span className="font-medium">Ref:</span> {invoiceData.invoiceNumber}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

