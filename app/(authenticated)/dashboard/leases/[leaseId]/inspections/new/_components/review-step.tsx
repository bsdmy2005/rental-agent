"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { ComponentConfiguration } from "@/actions/moving-inspections-actions"

interface EditableRoom {
  id: string
  categoryName: string
  categoryId?: string
  roomInstanceNumber?: number
  isInstance?: boolean
  isCustom?: boolean
  items: Array<{
    id: string
    name: string
    displayOrder: number
    isCustom?: boolean
  }>
}

interface ReviewStepProps {
  componentConfig: ComponentConfiguration
  finalRooms: EditableRoom[]
  onComplete: () => Promise<void>
  onBack: () => void
}

export function ReviewStep({
  componentConfig,
  finalRooms,
  onComplete,
  onBack
}: ReviewStepProps) {
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    try {
      await onComplete()
    } finally {
      setCreating(false)
    }
  }

  const totalItems = finalRooms.reduce((sum, room) => sum + room.items.length, 0)

  const getRoomDisplayName = (room: EditableRoom) => {
    if (room.roomInstanceNumber) {
      if (room.categoryName === "Main Bedroom" || room.categoryName === "Other Bedrooms") {
        return `Bedroom ${room.roomInstanceNumber}`
      }
      return `${room.categoryName} ${room.roomInstanceNumber}`
    }
    return room.categoryName
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Step 3: Review & Confirm</h2>
        <p className="text-muted-foreground">
          Review your configuration and confirm to create the inspection form.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Component Configuration Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Component Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {componentConfig.bedrooms && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bedrooms:</span>
                <span className="font-medium">{componentConfig.bedrooms}</span>
              </div>
            )}
            {componentConfig.lounges && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lounges:</span>
                <span className="font-medium">{componentConfig.lounges}</span>
              </div>
            )}
            {componentConfig.livingAreas && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Living Areas:</span>
                <span className="font-medium">{componentConfig.livingAreas}</span>
              </div>
            )}
            {componentConfig.bathrooms && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bathrooms:</span>
                <span className="font-medium">{componentConfig.bathrooms}</span>
              </div>
            )}
            {componentConfig.garages && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Garages:</span>
                <span className="font-medium">{componentConfig.garages}</span>
              </div>
            )}
            {componentConfig.pool && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pool:</span>
                <Badge>Yes</Badge>
              </div>
            )}
            {componentConfig.patio && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patio / Balcony:</span>
                <Badge>Yes</Badge>
              </div>
            )}
            {componentConfig.garden && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Garden:</span>
                <Badge>Yes</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Items Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total items:</span>
              <span className="font-bold">{totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rooms:</span>
              <span className="font-medium">{finalRooms.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rooms Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Rooms & Items</CardTitle>
          <CardDescription>Preview of all rooms and their items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {finalRooms.map((room) => (
              <div key={room.id} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">
                    {getRoomDisplayName(room)}
                  </span>
                  {room.isCustom && (
                    <Badge variant="outline" className="text-xs">
                      Custom
                    </Badge>
                  )}
                  {room.isInstance && (
                    <Badge variant="outline" className="text-xs">
                      Instance
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {room.items.length} items
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {room.items.map((item, index) => (
                    <div key={item.id}>
                      • {item.name || `Item ${index + 1}`}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Once created, the inspection form structure will be locked and cannot be modified.</p>
          <p>• You will only be able to update Yes/No status and comments for each item.</p>
          <p>• The form will be ready for digital data entry or printing.</p>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={creating}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Create Inspection
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

