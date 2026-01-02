"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { ArrowLeft, ArrowRight, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { getMovingInspectionCategoriesAction, createMovingInspectionCategoryAction } from "@/actions/moving-inspections-actions"
import { movingInspectionItemsTemplate } from "@/db/seed/data/moving-inspection-items"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface EditableItem {
  id: string
  name: string
  displayOrder: number
  isCustom?: boolean
}

interface EditableRoom {
  id: string
  categoryName: string
  categoryId?: string
  roomInstanceNumber?: number
  isInstance?: boolean
  isCustom?: boolean
  items: EditableItem[]
}

interface PrePopulatedItemsStepProps {
  items: Array<{
    categoryName: string
    items: Array<{ name: string; displayOrder: number; roomInstanceNumber?: number }>
  }>
  onComplete: (rooms: EditableRoom[]) => void
  onBack: () => void
}

// All categories support multiple instances - no restrictions

export function PrePopulatedItemsStep({
  items,
  onComplete,
  onBack
}: PrePopulatedItemsStepProps) {
  const [editableRooms, setEditableRooms] = useState<EditableRoom[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [openRooms, setOpenRooms] = useState<Set<string>>(new Set())
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [showAddRoomDialog, setShowAddRoomDialog] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [addingRoom, setAddingRoom] = useState(false)

  // Initialize editable rooms from props
  useEffect(() => {
    const rooms: EditableRoom[] = items.map((category, index) => ({
      id: `room-${index}`,
      categoryName: category.categoryName,
      roomInstanceNumber: category.items[0]?.roomInstanceNumber,
      items: category.items.map((item, itemIndex) => ({
        id: `item-${index}-${itemIndex}`,
        name: item.name,
        displayOrder: item.displayOrder
      }))
    }))
    setEditableRooms(rooms)
    // Keep all rooms collapsed by default
    setOpenRooms(new Set())
  }, [items])

  // Fetch categories for custom rooms
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const result = await getMovingInspectionCategoriesAction()
      if (result.isSuccess && result.data) {
        const categoryList = result.data.map(cat => ({ id: cat.id, name: cat.name }))
        setCategories(categoryList)
        console.log("Categories loaded:", categoryList.length, categoryList)
      } else {
        console.error("Failed to load categories:", result.message)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoadingCategories(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const toggleRoom = (roomId: string) => {
    setOpenRooms(prev => {
      const next = new Set(prev)
      if (next.has(roomId)) {
        next.delete(roomId)
      } else {
        next.add(roomId)
      }
      return next
    })
  }

  const updateItemName = (roomId: string, itemId: string, name: string) => {
    setEditableRooms(rooms =>
      rooms.map(room =>
        room.id === roomId
          ? {
              ...room,
              items: room.items.map(item =>
                item.id === itemId ? { ...item, name } : item
              )
            }
          : room
      )
    )
  }

  const addItem = (roomId: string) => {
    setEditableRooms(rooms =>
      rooms.map(room => {
        if (room.id === roomId) {
          const maxDisplayOrder = Math.max(...room.items.map(i => i.displayOrder), 0)
          return {
            ...room,
            items: [
              ...room.items,
              {
                id: `item-${roomId}-${Date.now()}`,
                name: "",
                displayOrder: maxDisplayOrder + 1,
                isCustom: true
              }
            ]
          }
        }
        return room
      })
    )
  }

  const removeItem = (roomId: string, itemId: string) => {
    setEditableRooms(rooms =>
      rooms.map(room =>
        room.id === roomId
          ? {
              ...room,
              items: room.items.filter(item => item.id !== itemId)
            }
          : room
      )
    )
  }

  const addInstance = (categoryName: string) => {
    // Find all existing instances of this category
    // For bedrooms, we need to check both "Main Bedroom" and "Other Bedrooms"
    const isBedroom = categoryName === "Main Bedroom" || categoryName === "Other Bedrooms"
    const existingInstances = editableRooms.filter(room => {
      if (isBedroom) {
        return room.categoryName === "Main Bedroom" || room.categoryName === "Other Bedrooms"
      }
      return room.categoryName === categoryName
    })
    
    const maxInstance = Math.max(
      ...existingInstances.map(r => r.roomInstanceNumber || 0),
      0
    )
    const nextInstance = maxInstance + 1

    // Get template items for this category
    let templateCategoryName = categoryName
    let displayCategoryName = categoryName
    
    if (isBedroom) {
      // For bedrooms, instance 1 uses "Main Bedroom", others use "Other Bedrooms"
      templateCategoryName = nextInstance === 1 ? "Main Bedroom" : "Other Bedrooms"
      displayCategoryName = "Other Bedrooms" // Always show as "Other Bedrooms" for instances 2+
    }

    // Try to get template items for this category
    const templateItems = movingInspectionItemsTemplate[templateCategoryName] || []
    
    // If no template items found, check if we can find items from an existing room of this category
    let itemsToUse = templateItems
    if (itemsToUse.length === 0) {
      // Find an existing room with the same category to copy items from
      const existingRoom = editableRooms.find(room => {
        if (isBedroom) {
          return room.categoryName === "Main Bedroom" || room.categoryName === "Other Bedrooms"
        }
        return room.categoryName === categoryName
      })
      
      if (existingRoom && existingRoom.items.length > 0) {
        // Copy items from existing room
        itemsToUse = existingRoom.items.map(item => ({
          name: item.name,
          displayOrder: item.displayOrder
        }))
      } else {
        // No template and no existing room - create empty room with one empty item
        itemsToUse = [{ name: "", displayOrder: 1 }]
      }
    }

    const newRoom: EditableRoom = {
      id: `room-instance-${Date.now()}`,
      categoryName: displayCategoryName,
      roomInstanceNumber: nextInstance,
      isInstance: true,
      items: itemsToUse.map((item, index) => ({
        id: `item-instance-${Date.now()}-${index}`,
        name: typeof item === 'string' ? item : item.name,
        displayOrder: typeof item === 'object' && 'displayOrder' in item ? item.displayOrder : index + 1
      }))
    }

    setEditableRooms([...editableRooms, newRoom])
    setOpenRooms(prev => new Set([...prev, newRoom.id]))
  }

  const addCustomRoom = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) {
      console.error("Category not found:", categoryId)
      toast.error("Category not found")
      return
    }

    const newRoom: EditableRoom = {
      id: `room-custom-${Date.now()}-${Math.random()}`,
      categoryName: category.name,
      categoryId: category.id,
      isCustom: true,
      items: [
        {
          id: `item-custom-${Date.now()}-${Math.random()}`,
          name: "",
          displayOrder: 1,
          isCustom: true
        }
      ]
    }

    console.log("Adding custom room:", newRoom)
    setEditableRooms(prev => {
      console.log("Previous rooms:", prev.length)
      const updated = [...prev, newRoom]
      console.log("Updated rooms:", updated.length)
      return updated
    })
    setOpenRooms(prev => {
      const next = new Set(prev)
      next.add(newRoom.id)
      console.log("Opening room:", newRoom.id)
      return next
    })
    toast.success(`Room "${category.name}" added successfully`)
  }

  const addCustomRoomByName = async (roomName: string) => {
    if (!roomName.trim()) {
      toast.error("Room name is required")
      return
    }

    setAddingRoom(true)
    try {
      // First, try to find or create the category
      let category = categories.find(c => c.name.toLowerCase() === roomName.trim().toLowerCase())
      
      if (!category) {
        // Create the category
        const result = await createMovingInspectionCategoryAction(roomName.trim())
        if (result.isSuccess && result.data) {
          category = { id: result.data.id, name: result.data.name }
          // Refresh categories list
          await fetchCategories()
        } else {
          toast.error(result.message || "Failed to create category")
          return
        }
      }

      // Now add the room
      const newRoom: EditableRoom = {
        id: `room-custom-${Date.now()}`,
        categoryName: category.name,
        categoryId: category.id,
        isCustom: true,
        items: [
          {
            id: `item-custom-${Date.now()}`,
            name: "",
            displayOrder: 1,
            isCustom: true
          }
        ]
      }

      console.log("Adding custom room by name:", newRoom)
      setEditableRooms(prev => [...prev, newRoom])
      setOpenRooms(prev => {
        const next = new Set(prev)
        next.add(newRoom.id)
        return next
      })
      setNewRoomName("")
      setShowAddRoomDialog(false)
      toast.success("Room added successfully")
    } catch (error) {
      console.error("Error adding custom room:", error)
      toast.error("Failed to add room")
    } finally {
      setAddingRoom(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required")
      return
    }

    setCreatingCategory(true)
    try {
      const result = await createMovingInspectionCategoryAction(newCategoryName.trim())
      if (result.isSuccess && result.data) {
        toast.success("Category created successfully")
        setNewCategoryName("")
        setShowCreateCategoryDialog(false)
        // Refresh categories
        await fetchCategories()
        // Automatically add the new category as a room
        addCustomRoom(result.data.id)
      } else {
        toast.error(result.message || "Failed to create category")
      }
    } catch (error) {
      console.error("Error creating category:", error)
      toast.error("Failed to create category")
    } finally {
      setCreatingCategory(false)
    }
  }

  const removeRoom = (roomId: string) => {
    setEditableRooms(rooms => rooms.filter(room => room.id !== roomId))
    setOpenRooms(prev => {
      const next = new Set(prev)
      next.delete(roomId)
      return next
    })
  }

  const canAddInstance = (categoryName: string) => {
    // All categories can have multiple instances
    return true
  }

  const getRoomDisplayName = (room: EditableRoom) => {
    if (room.roomInstanceNumber) {
      if (room.categoryName === "Main Bedroom" || room.categoryName === "Other Bedrooms") {
        return `Bedroom ${room.roomInstanceNumber}`
      }
      return `${room.categoryName} ${room.roomInstanceNumber}`
    }
    return room.categoryName
  }

  const handleNext = () => {
    onComplete(editableRooms)
  }

  const totalItems = editableRooms.reduce((sum, room) => sum + room.items.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Step 2: Edit Items & Rooms</h2>
        <p className="text-muted-foreground">
          Review and customize the items for each room. Add, remove, or edit items as needed.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {totalItems} items across {editableRooms.length} rooms
          </Badge>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {editableRooms.map((room) => {
                const isOpen = openRooms.has(room.id)
                const canInstance = canAddInstance(room.categoryName)

                return (
                  <Collapsible
                    key={room.id}
                    open={isOpen}
                    onOpenChange={() => toggleRoom(room.id)}
                  >
                    <div className="border rounded-lg">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <CollapsibleTrigger className="flex-1 flex items-center gap-2 text-left">
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <span className="font-semibold">
                            {getRoomDisplayName(room)}
                          </span>
                          {room.isCustom && (
                            <Badge variant="outline" className="text-xs">
                              Custom
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {room.items.length} items
                          </Badge>
                        </CollapsibleTrigger>
                        {room.isCustom && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeRoom(room.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-3 border-t">
                          <div className="space-y-2 pt-3">
                            {room.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2"
                              >
                                <span className="text-muted-foreground">•</span>
                                <Input
                                  value={item.name}
                                  onChange={(e) =>
                                    updateItemName(room.id, item.id, e.target.value)
                                  }
                                  placeholder="Item name"
                                  className="flex-1 h-8 text-sm"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeItem(room.id, item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addItem(room.id)}
                              className="h-8"
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add Item
                            </Button>
                            {canInstance && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addInstance(room.categoryName)}
                                className="h-8"
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                Add Instance
                              </Button>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Add Custom Room - Direct button and dropdown */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Add Custom Room</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddRoomDialog(true)}
                  className="flex-1"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Room
                </Button>
                {categories.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-between" disabled={loadingCategories}>
                        <span>From Existing Category</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
                      {categories.map((category) => (
                        <DropdownMenuItem
                          key={category.id}
                          onClick={() => {
                            console.log("Category selected:", category.name)
                            addCustomRoom(category.id)
                          }}
                          className="cursor-pointer"
                        >
                          {category.name}
                        </DropdownMenuItem>
                      ))}
                      <div className="h-px bg-border my-1" />
                      <DropdownMenuItem
                        onClick={() => setShowCreateCategoryDialog(true)}
                        className="cursor-pointer font-medium"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Category
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {categories.length === 0 && !loadingCategories && (
                <p className="text-xs text-muted-foreground">
                  Click "Add New Room" to create a room with a custom name, or create a category first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Room Dialog - Direct room creation */}
        <Dialog open={showAddRoomDialog} onOpenChange={setShowAddRoomDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
              <DialogDescription>
                Create a new room for your inspection. You can add items to it after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  placeholder="e.g., Study Room, Storage, Attic, etc."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !addingRoom && newRoomName.trim()) {
                      addCustomRoomByName(newRoomName)
                    }
                  }}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This will create a new category if it doesn't exist, or use an existing one.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddRoomDialog(false)
                  setNewRoomName("")
                }}
                disabled={addingRoom}
              >
                Cancel
              </Button>
              <Button onClick={() => addCustomRoomByName(newRoomName)} disabled={addingRoom || !newRoomName.trim()}>
                {addingRoom ? "Adding..." : "Add Room"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Category Dialog */}
        <Dialog open={showCreateCategoryDialog} onOpenChange={setShowCreateCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Create a new room category for your inspection form.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Category Name</Label>
                <Input
                  id="categoryName"
                  placeholder="e.g., Study Room, Storage, etc."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creatingCategory) {
                      handleCreateCategory()
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateCategoryDialog(false)
                  setNewCategoryName("")
                }}
                disabled={creatingCategory}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCategory} disabled={creatingCategory || !newCategoryName.trim()}>
                {creatingCategory ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
