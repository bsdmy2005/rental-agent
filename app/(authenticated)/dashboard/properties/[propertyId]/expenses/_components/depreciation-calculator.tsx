"use client"

import { useState } from "react"
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
import {
  createDepreciationRecordAction,
  calculateDepreciationAction
} from "@/actions/expenses-actions"
import { toast } from "sonner"
import { Loader2, Calculator } from "lucide-react"

interface DepreciationCalculatorProps {
  propertyId: string
  onSuccess?: () => void
}

export function DepreciationCalculator({
  propertyId,
  onSuccess
}: DepreciationCalculatorProps) {
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    assetName: "",
    assetType: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseCost: "",
    depreciationRate: "",
    usefulLifeYears: "",
    depreciationMethod: "straight_line" as "straight_line" | "declining_balance",
    taxYear: new Date().getFullYear()
  })

  const handleCalculate = async () => {
    if (!formData.assetName || !formData.purchaseCost || !formData.depreciationRate) {
      toast.error("Please fill in all required fields")
      return
    }

    setCalculating(true)
    try {
      // Create record first
      const createResult = await createDepreciationRecordAction({
        propertyId,
        assetName: formData.assetName,
        assetType: formData.assetType,
        purchaseDate: new Date(formData.purchaseDate),
        purchaseCost: formData.purchaseCost,
        depreciationRate: formData.depreciationRate,
        usefulLifeYears: parseInt(formData.usefulLifeYears) || 10,
        currentValue: formData.purchaseCost, // Initial value
        depreciationMethod: formData.depreciationMethod,
        taxYear: formData.taxYear
      })

      if (createResult.isSuccess && createResult.data) {
        // Calculate depreciation
        const calcResult = await calculateDepreciationAction(createResult.data.id)
        if (calcResult.isSuccess && calcResult.data) {
          setCalculatedValue(parseFloat(calcResult.data.currentValue))
          toast.success("Depreciation calculated successfully")
          if (onSuccess) {
            onSuccess()
          }
        }
      } else {
        toast.error(createResult.message)
      }
    } catch (error) {
      console.error("Error calculating depreciation:", error)
      toast.error("Failed to calculate depreciation")
    } finally {
      setCalculating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Depreciation Calculator
        </CardTitle>
        <CardDescription>Calculate asset depreciation for tax purposes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="assetName">Asset Name *</Label>
          <Input
            id="assetName"
            required
            value={formData.assetName}
            onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
            placeholder="e.g., Refrigerator, Washing Machine"
          />
        </div>

        <div>
          <Label htmlFor="assetType">Asset Type</Label>
          <Input
            id="assetType"
            value={formData.assetType}
            onChange={(e) => setFormData({ ...formData, assetType: e.target.value })}
            placeholder="e.g., Appliances, Furniture"
          />
        </div>

        <div>
          <Label htmlFor="purchaseDate">Purchase Date *</Label>
          <Input
            id="purchaseDate"
            type="date"
            required
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="purchaseCost">Purchase Cost (R) *</Label>
          <Input
            id="purchaseCost"
            type="number"
            step="0.01"
            required
            value={formData.purchaseCost}
            onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
            placeholder="0.00"
          />
        </div>

        <div>
          <Label htmlFor="depreciationRate">Depreciation Rate (decimal) *</Label>
          <Input
            id="depreciationRate"
            type="number"
            step="0.01"
            min="0"
            max="1"
            required
            value={formData.depreciationRate}
            onChange={(e) => setFormData({ ...formData, depreciationRate: e.target.value })}
            placeholder="0.10 (for 10%)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter as decimal (e.g., 0.10 for 10% per year)
          </p>
        </div>

        <div>
          <Label htmlFor="usefulLifeYears">Useful Life (Years)</Label>
          <Input
            id="usefulLifeYears"
            type="number"
            required
            value={formData.usefulLifeYears}
            onChange={(e) => setFormData({ ...formData, usefulLifeYears: e.target.value })}
            placeholder="10"
          />
        </div>

        <div>
          <Label htmlFor="depreciationMethod">Depreciation Method *</Label>
          <Select
            value={formData.depreciationMethod}
            onValueChange={(value: "straight_line" | "declining_balance") =>
              setFormData({ ...formData, depreciationMethod: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="straight_line">Straight Line</SelectItem>
              <SelectItem value="declining_balance">Declining Balance</SelectItem>
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

        {calculatedValue !== null && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Current Depreciated Value</p>
            <p className="text-2xl font-bold">R {calculatedValue.toFixed(2)}</p>
          </div>
        )}

        <Button
          onClick={handleCalculate}
          disabled={loading || calculating}
          className="w-full"
        >
          {(loading || calculating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Calculate Depreciation
        </Button>
      </CardContent>
    </Card>
  )
}

