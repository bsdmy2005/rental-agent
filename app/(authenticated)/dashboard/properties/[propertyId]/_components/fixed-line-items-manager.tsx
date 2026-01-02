"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Edit2, Trash2, X, Save } from "lucide-react"
import { type FixedLineItem } from "@/types/invoice-types"
import { toast } from "sonner"

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

interface FixedLineItemsManagerProps {
  items: FixedLineItem[]
  onItemsChange: (items: FixedLineItem[]) => void
  disabled?: boolean
}

export function FixedLineItemsManager({
  items,
  onItemsChange,
  disabled = false
}: FixedLineItemsManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({
    description: "",
    amount: ""
  })

  const handleAdd = () => {
    if (!formData.description.trim()) {
      toast.error("Description is required")
      return
    }
    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be a positive number")
      return
    }

    const newItem: FixedLineItem = {
      id: generateId(),
      description: formData.description.trim(),
      amount,
      type: "other"
    }

    onItemsChange([...items, newItem])
    setFormData({ description: "", amount: "" })
    setIsAdding(false)
    toast.success("Fixed line item added")
  }

  const handleEdit = (item: FixedLineItem) => {
    setEditingId(item.id)
    setFormData({
      description: item.description,
      amount: item.amount.toString()
    })
  }

  const handleSaveEdit = () => {
    if (!formData.description.trim()) {
      toast.error("Description is required")
      return
    }
    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be a positive number")
      return
    }

    const updatedItems = items.map((item) =>
      item.id === editingId
        ? {
            ...item,
            description: formData.description.trim(),
            amount
          }
        : item
    )

    onItemsChange(updatedItems)
    setEditingId(null)
    setFormData({ description: "", amount: "" })
    toast.success("Fixed line item updated")
  }

  const handleDelete = (id: string) => {
    const updatedItems = items.filter((item) => item.id !== id)
    onItemsChange(updatedItems)
    toast.success("Fixed line item deleted")
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({ description: "", amount: "" })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Fixed Line Items</Label>
        {!disabled && !isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        )}
      </div>

      {isAdding && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-description">Description</Label>
                <Input
                  id="add-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., Parking Fee"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-amount">Amount</Label>
                <Input
                  id="add-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAdd}>
                  <Save className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 && !isAdding ? (
        <p className="text-sm text-muted-foreground">
          No fixed line items. Click "Add Item" to add one.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isEditing = editingId === item.id

            if (isEditing) {
              return (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`edit-description-${item.id}`}>
                          Description
                        </Label>
                        <Input
                          id={`edit-description-${item.id}`}
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`edit-amount-${item.id}`}>Amount</Label>
                        <Input
                          id={`edit-amount-${item.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.amount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              amount: e.target.value
                            })
                          }
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            }

            return (
              <Card key={item.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        R {item.amount.toFixed(2)}
                      </p>
                    </div>
                    {!disabled && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

