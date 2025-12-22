"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { generatePayablePeriodsManuallyAction } from "@/actions/billing-periods-actions"
import { toast } from "sonner"
import { Plus, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"

interface PayablePeriodGeneratorProps {
  propertyId: string
}

export function PayablePeriodGenerator({ propertyId }: PayablePeriodGeneratorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    startDate: "",
    durationMonths: "12"
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.startDate) {
        toast.error("Please select a start date")
        setLoading(false)
        return
      }

      const startDate = new Date(formData.startDate)
      const durationMonths = parseInt(formData.durationMonths, 10)

      if (isNaN(durationMonths) || durationMonths <= 0) {
        toast.error("Duration must be a positive number")
        setLoading(false)
        return
      }

      const result = await generatePayablePeriodsManuallyAction(
        propertyId,
        startDate,
        durationMonths
      )

      if (result.isSuccess) {
        toast.success(`Generated ${result.data?.length || 0} payable periods`)
        setFormData({
          startDate: "",
          durationMonths: "12"
        })
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error generating payable periods:", error)
      toast.error("Failed to generate payable periods")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>Generate Payable Periods</CardTitle>
        </div>
        <CardDescription>
          Manually generate payable periods for this property. These are independent of lease dates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationMonths">Duration (Months)</Label>
              <Input
                id="durationMonths"
                type="number"
                required
                min="1"
                value={formData.durationMonths}
                onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                className="h-11"
                placeholder="12"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {loading ? "Generating..." : `Generate ${formData.durationMonths || "12"} Periods`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

