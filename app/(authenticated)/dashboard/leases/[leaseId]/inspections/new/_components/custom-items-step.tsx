"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react"
import { getMovingInspectionCategoriesAction } from "@/actions/moving-inspections-actions"

interface Category {
  id: string
  name: string
}

interface CustomItemsStepProps {
  onComplete: (items: Array<{ categoryId: string; name: string; displayOrder: number }>) => void
  onBack: () => void
}

export function CustomItemsStep({ onComplete, onBack }: CustomItemsStepProps) {
  const [customItems, setCustomItems] = useState<Array<{
    id: string
    categoryId: string
    name: string
    displayOrder: number
  }>>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await getMovingInspectionCategoriesAction()
        if (result.isSuccess && result.data) {
          setCategories(result.data)
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  const addCustomItem = () => {
    setCustomItems([
      ...customItems,
      {
        id: Math.random().toString(),
        categoryId: "",
        name: "",
        displayOrder: customItems.length + 1
      }
    ])
  }

  const removeCustomItem = (id: string) => {
    setCustomItems(customItems.filter((item) => item.id !== id))
  }

  const updateCustomItem = (id: string, field: string, value: string) => {
    setCustomItems(
      customItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const handleNext = () => {
    // Validate all items have category and name
    const validItems = customItems.filter(
      (item) => item.categoryId && item.name.trim()
    )

    onComplete(validItems.map(({ id, ...rest }) => rest))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Step 3: Add Custom Items (Optional)</h2>
        <p className="text-muted-foreground">
          Add any additional items that are not in the standard template.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Items</CardTitle>
              <CardDescription>
                Add items specific to this property that aren't in the standard template
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No custom items added yet.</p>
                <p className="text-sm mt-2">Click the "+" button below to add custom items.</p>
              </div>
            ) : (
              customItems.map((item, index) => (
                <div key={item.id} className="flex gap-3 items-center border rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <Select
                      value={item.categoryId}
                      onValueChange={(value) => updateCustomItem(item.id, "categoryId", value)}
                      disabled={loadingCategories}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category">
                          {item.categoryId
                            ? categories.find((c) => c.id === item.categoryId)?.name
                            : "Select category"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Input
                      value={item.name}
                      onChange={(e) => updateCustomItem(item.id, "name", e.target.value)}
                      placeholder="Enter item name"
                      className="w-full"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomItem(item.id)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            <Button
              onClick={addCustomItem}
              variant="outline"
              className="w-full"
              disabled={loadingCategories}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Item
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext}>
          Next: Review & Confirm
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

