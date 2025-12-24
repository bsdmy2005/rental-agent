"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Edit2, Save, X } from "lucide-react"
import type { InvoiceData, InvoiceLineItem } from "@/types"
import {
  updateInvoiceLineItemAction,
  addInvoiceLineItemAction,
  deleteInvoiceLineItemAction
} from "@/actions/rental-invoice-instances-actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface InvoiceLineItemsEditorProps {
  instanceId: string
  invoiceData: InvoiceData
}

export function InvoiceLineItemsEditor({
  instanceId,
  invoiceData: initialInvoiceData
}: InvoiceLineItemsEditorProps) {
  const router = useRouter()
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(initialInvoiceData)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newItem, setNewItem] = useState<Partial<InvoiceLineItem>>({
    type: "other",
    description: "",
    amount: 0
  })

  const formatCurrency = (amount: number) => {
    return `R ${amount.toFixed(2)}`
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

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Edit Line Items</CardTitle>
        <CardDescription>Edit invoice line items before sending</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoiceData.lineItems.map((item) => (
              <TableRow key={item.id}>
                {editingId === item.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          handleUpdate(item.id, { description: e.target.value })
                        }
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={item.quantity ?? ""}
                        onChange={(e) =>
                          handleUpdate(item.id, {
                            quantity: e.target.value ? parseFloat(e.target.value) : null
                          })
                        }
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={item.unitPrice ?? ""}
                        onChange={(e) =>
                          handleUpdate(item.id, {
                            unitPrice: e.target.value ? parseFloat(e.target.value) : null
                          })
                        }
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={item.amount}
                        onChange={(e) =>
                          handleUpdate(item.id, { amount: parseFloat(e.target.value) || 0 })
                        }
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      {item.unitPrice ? formatCurrency(item.unitPrice) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {item.type !== "rental" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(item.id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            {isAdding && (
              <TableRow>
                <TableCell>
                  <Input
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
                <TableCell className="text-right">
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
                    className="h-8 w-20"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    placeholder="Unit Price"
                    value={newItem.unitPrice ?? ""}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        unitPrice: e.target.value ? parseFloat(e.target.value) : null
                      })
                    }
                    className="h-8 w-24"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newItem.amount ?? ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8 w-24"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={handleAdd}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAdding(false)
                        setNewItem({ type: "other", description: "", amount: 0 })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="mt-4">
          <Button variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Line Item
          </Button>
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold">Subtotal:</span>
                <span className="text-sm font-semibold">
                  {formatCurrency(invoiceData.subtotal)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-base font-bold">Total Amount:</span>
                <span className="text-base font-bold">
                  {formatCurrency(invoiceData.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

