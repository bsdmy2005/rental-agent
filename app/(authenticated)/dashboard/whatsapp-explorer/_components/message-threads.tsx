"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Search, User, Trash2 } from "lucide-react"
import { getMessageThreadsAction, type ThreadSummary, clearAllMessagesAction } from "@/actions/whatsapp-threads-actions"
import { getContactsAction } from "@/actions/whatsapp-contacts-actions"
import type { SelectWhatsappContact } from "@/db/schema"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface MessageThreadsProps {
  sessionId: string
  selectedThread: string | null
  onThreadSelect: (phoneNumber: string) => void
}

/**
 * Format phone number for display
 */
function formatPhoneForDisplay(phone: string): string {
  // If it's in 27... format, convert to 0... format for display
  if (phone.startsWith("27") && phone.length === 11) {
    return "0" + phone.substring(2)
  }
  return phone
}

export function MessageThreads({
  sessionId,
  selectedThread,
  onThreadSelect
}: MessageThreadsProps) {
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [contacts, setContacts] = useState<SelectWhatsappContact[]>([])
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (sessionId) {
      loadThreads()
      loadContacts()
    }
  }, [sessionId])

  const loadThreads = async () => {
    setLoading(true)
    try {
      const result = await getMessageThreadsAction(sessionId)
      if (result.isSuccess && result.data) {
        setThreads(result.data)
      } else {
        console.error("Failed to load threads:", result.message)
      }
    } catch (error) {
      console.error("Failed to load threads:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const result = await getContactsAction(sessionId)
      if (result.isSuccess && result.data) {
        setContacts(result.data)
      }
    } catch (error) {
      console.error("Failed to load contacts:", error)
    }
  }

  // Get contact info for a phone number
  const getContactInfo = (phoneNumber: string): SelectWhatsappContact | undefined => {
    return contacts.find((c) => c.phoneNumber === phoneNumber)
  }

  // Filter threads based on search query
  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery.trim()) return true
    
    const contact = getContactInfo(thread.phoneNumber)
    const displayName = contact?.displayName || ""
    const phoneDisplay = formatPhoneForDisplay(thread.phoneNumber)
    const lastMessage = thread.lastMessage?.content || ""
    
    const searchLower = searchQuery.toLowerCase()
    return (
      displayName.toLowerCase().includes(searchLower) ||
      phoneDisplay.includes(searchQuery) ||
      lastMessage.toLowerCase().includes(searchLower)
    )
  })

  const handleClearAll = async () => {
    setClearing(true)
    try {
      const result = await clearAllMessagesAction(sessionId)
      if (result.isSuccess) {
        await loadThreads()
      } else {
        console.error("Failed to clear messages:", result.message)
      }
    } catch (error) {
      console.error("Failed to clear messages:", error)
    } finally {
      setClearing(false)
    }
  }

  // Refresh threads periodically when connected (reduced frequency - 8 seconds)
  // Only poll when tab is visible
  useEffect(() => {
    if (!sessionId) return

    let interval: NodeJS.Timeout | null = null
    
    const startPolling = () => {
      if (document.visibilityState === "visible") {
        interval = setInterval(() => {
          loadThreads()
        }, 8000) // Refresh every 8 seconds (reduced frequency)
      }
    }

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startPolling()
      } else {
        stopPolling()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    startPolling()

    return () => {
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [sessionId])

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <CardTitle className="text-lg">Conversations</CardTitle>
            <CardDescription className="text-xs">Select a conversation to view messages</CardDescription>
          </div>
          {threads.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={clearing} className="h-8 w-8 p-0">
                  {clearing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Messages?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all messages for this session. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0 min-h-0">
        {loading && threads.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No conversations match your search" : "No conversations yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredThreads.map((thread) => {
              const contact = getContactInfo(thread.phoneNumber)
              const displayName = contact?.displayName
              const phoneDisplay = formatPhoneForDisplay(thread.phoneNumber)
              const isSelected = selectedThread === thread.phoneNumber

              return (
                <div
                  key={thread.phoneNumber}
                  onClick={() => onThreadSelect(thread.phoneNumber)}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-muted/50 transition-colors active:bg-muted",
                    isSelected && "bg-muted border-l-4 border-l-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <p className="font-semibold text-sm truncate">
                          {displayName || phoneDisplay}
                        </p>
                        {thread.lastMessage && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {new Date(thread.lastMessage.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        )}
                      </div>
                      {thread.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate mb-1">
                          {thread.lastMessage.fromMe && (
                            <span className="text-muted-foreground/70 font-medium">You: </span>
                          )}
                          {thread.lastMessage.content || `[${thread.lastMessage.messageType}]`}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        {thread.unreadCount > 0 && (
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {thread.unreadCount} new
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground/60">
                          {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

