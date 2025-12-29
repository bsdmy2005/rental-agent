"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  createContactAction,
  getContactsAction,
  updateContactAction,
  deleteContactAction,
  type SelectWhatsappContact
} from "@/actions/whatsapp-contacts-actions"
import { Loader2, Plus, Edit, Trash2, Star, StarOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface ContactsManagerProps {
  sessionId: string
  onContactSelect?: (phoneNumber: string) => void
  onStartChat?: (phoneNumber: string) => void
}

/**
 * Normalize phone number to 27... format
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "")
  
  // Handle South African numbers
  if (digits.startsWith("0")) {
    // 0821234567 -> 27821234567
    return "27" + digits.substring(1)
  } else if (digits.startsWith("27")) {
    // Already in correct format
    return digits
  } else if (digits.startsWith("8")) {
    // 821234567 -> 27821234567
    return "27" + digits
  }
  
  // Return as-is if no pattern matches
  return digits
}

export function ContactsManager({ sessionId, onContactSelect, onStartChat }: ContactsManagerProps) {
  const [contacts, setContacts] = useState<SelectWhatsappContact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<SelectWhatsappContact | null>(null)
  
  // Form state
  const [phoneNumber, setPhoneNumber] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [notes, setNotes] = useState("")
  const [isFavorite, setIsFavorite] = useState(false)

  // Load contacts
  useEffect(() => {
    if (sessionId) {
      loadContacts()
    }
  }, [sessionId])

  const loadContacts = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getContactsAction(sessionId)
      if (result.isSuccess && result.data) {
        setContacts(result.data)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!phoneNumber.trim()) {
      setError("Phone number is required")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber.trim())
      const result = await createContactAction(
        sessionId,
        normalizedPhone,
        displayName.trim() || undefined,
        notes.trim() || undefined
      )
      if (result.isSuccess && result.data) {
        await loadContacts()
        setIsDialogOpen(false)
        resetForm()
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingContact) return

    setLoading(true)
    setError(null)
    try {
      const result = await updateContactAction(editingContact.id, {
        displayName: displayName.trim() || undefined,
        notes: notes.trim() || undefined,
        isFavorite
      })
      if (result.isSuccess) {
        await loadContacts()
        setIsDialogOpen(false)
        resetForm()
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update contact")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return

    setLoading(true)
    setError(null)
    try {
      const result = await deleteContactAction(contactId)
      if (result.isSuccess) {
        await loadContacts()
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contact")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async (contact: SelectWhatsappContact) => {
    setLoading(true)
    try {
      const result = await updateContactAction(contact.id, {
        isFavorite: !contact.isFavorite
      })
      if (result.isSuccess) {
        await loadContacts()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update contact")
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (contact: SelectWhatsappContact) => {
    setEditingContact(contact)
    setPhoneNumber(contact.phoneNumber)
    setDisplayName(contact.displayName || "")
    setNotes(contact.notes || "")
    setIsFavorite(contact.isFavorite)
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingContact(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setPhoneNumber("")
    setDisplayName("")
    setNotes("")
    setIsFavorite(false)
    setEditingContact(null)
  }

  const handleSubmit = () => {
    if (editingContact) {
      handleUpdate()
    } else {
      handleCreate()
    }
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Saved Contacts</CardTitle>
            <CardDescription>Quick access to frequently used contacts</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
                <DialogDescription>
                  {editingContact
                    ? "Update contact information"
                    : "Save a contact for quick access when sending messages"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="0821234567 or 27821234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={!!editingContact}
                  />
                  {editingContact && (
                    <p className="text-xs text-muted-foreground">
                      Phone number cannot be changed after creation
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name (Optional)</Label>
                  <Input
                    id="displayName"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional information..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                {editingContact && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isFavorite">Favorite</Label>
                    <Switch
                      id="isFavorite"
                      checked={isFavorite}
                      onCheckedChange={setIsFavorite}
                    />
                  </div>
                )}
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingContact ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0 min-h-0">
        {loading && contacts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No saved contacts yet. Add one to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {contact.isFavorite && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {contact.displayName || contact.phoneNumber}
                      </p>
                      {contact.displayName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.phoneNumber}
                        </p>
                      )}
                      {contact.notes && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {contact.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {onStartChat && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onStartChat(contact.phoneNumber)}
                    >
                      Start Chat
                    </Button>
                  )}
                  {onContactSelect && !onStartChat && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onContactSelect(contact.phoneNumber)}
                    >
                      Select
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFavorite(contact)}
                    disabled={loading}
                  >
                    {contact.isFavorite ? (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(contact)}
                    disabled={loading}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(contact.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {error && contacts.length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

