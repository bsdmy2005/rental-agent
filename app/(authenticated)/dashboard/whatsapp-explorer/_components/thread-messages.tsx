"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Send, User, Plus } from "lucide-react"
import { getContactByPhoneAction, createContactAction } from "@/actions/whatsapp-contacts-actions"
import { sendMessageAction } from "@/actions/whatsapp-explorer-actions"
import type { SelectWhatsappExplorerMessage } from "@/db/schema"
import type { SelectWhatsappContact } from "@/db/schema"
import { CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useMessages } from "../_context/message-context"
import { useMemo } from "react"

interface ThreadMessagesProps {
  sessionId: string
  serverUrl: string
  apiKey: string
  phoneNumber: string | null
  onMessageSent?: () => void
}

/**
 * Format phone number for display
 */
function formatPhoneForDisplay(phone: string): string {
  if (phone.startsWith("27") && phone.length === 11) {
    return "0" + phone.substring(2)
  }
  return phone
}

/**
 * Format phone number for message sending (27... format)
 */
function formatPhoneForMessage(phone: string): string {
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

export function ThreadMessages({
  sessionId,
  serverUrl,
  apiKey,
  phoneNumber,
  onMessageSent
}: ThreadMessagesProps) {
  const { getThreadMessages, addOptimisticMessage, removeOptimisticMessage, syncMessages, isLoading } = useMessages()
  const [contact, setContact] = useState<SelectWhatsappContact | null>(null)
  const [sending, setSending] = useState(false)
  const [messageContent, setMessageContent] = useState("")
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isSaveContactDialogOpen, setIsSaveContactDialogOpen] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [contactDisplayName, setContactDisplayName] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Get messages from context
  const messages = useMemo(() => {
    return phoneNumber ? getThreadMessages(phoneNumber) : []
  }, [phoneNumber, getThreadMessages])
  
  const loading = phoneNumber ? (isLoading.get(phoneNumber) || false) : false

  useEffect(() => {
    if (phoneNumber && sessionId) {
      // Initial sync when thread is selected
      syncMessages(sessionId, phoneNumber)
      loadContact()
    } else {
      setContact(null)
    }
  }, [phoneNumber, sessionId, syncMessages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }


  const loadContact = async () => {
    if (!phoneNumber || !sessionId) return

    try {
      const result = await getContactByPhoneAction(sessionId, phoneNumber)
      if (result.isSuccess && result.data) {
        setContact(result.data)
      } else {
        setContact(null)
      }
    } catch (error) {
      console.error("Failed to load contact:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!phoneNumber || !messageContent.trim() || !sessionId) return

    const content = messageContent.trim()
    const formattedRecipient = formatPhoneForMessage(phoneNumber)
    
    // Create optimistic message
    const tempMessageId = `temp-${Date.now()}-${Math.random()}`
    const optimisticMessage: SelectWhatsappExplorerMessage = {
      id: tempMessageId,
      sessionId,
      messageId: tempMessageId,
      remoteJid: `${phoneNumber}@s.whatsapp.net`,
      fromMe: true,
      messageType: "text",
      content: content,
      mediaUrl: null,
      status: "pending",
      statusUpdatedAt: null,
      timestamp: new Date(),
      createdAt: new Date(),
      incidentId: null,
      messageClassification: null,
      classifiedAt: null
    }

    // Add optimistic message immediately
    addOptimisticMessage(phoneNumber, optimisticMessage)
    setMessageContent("")
    setSending(true)
    setSendResult(null)

    try {
      const result = await sendMessageAction(
        serverUrl,
        apiKey,
        sessionId,
        formattedRecipient,
        content
      )

      if (result.isSuccess && result.data) {
        // Remove optimistic message
        removeOptimisticMessage(phoneNumber, tempMessageId)
        
        // Sync messages to get the real message from server
        await syncMessages(sessionId, phoneNumber)
        
        if (onMessageSent) {
          onMessageSent()
        }
        
        setSendResult({
          success: true,
          message: "Message sent successfully"
        })
      } else {
        // Remove optimistic message on failure
        removeOptimisticMessage(phoneNumber, tempMessageId)
        setSendResult({
          success: false,
          message: result.message
        })
      }
    } catch (error) {
      // Remove optimistic message on error
      removeOptimisticMessage(phoneNumber, tempMessageId)
      setSendResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send message"
      })
    } finally {
      setSending(false)
    }
  }

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!phoneNumber) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a conversation to view messages</p>
        </CardContent>
      </Card>
    )
  }

  const displayName = contact?.displayName || formatPhoneForDisplay(phoneNumber)
  const isSavedContact = !!contact

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {displayName}
            </CardTitle>
            <CardDescription>
              {contact?.phoneNumber || phoneNumber}
              {!isSavedContact && " • Not saved"}
            </CardDescription>
          </div>
          {!isSavedContact && (
            <Dialog open={isSaveContactDialogOpen} onOpenChange={setIsSaveContactDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Save Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Contact</DialogTitle>
                  <DialogDescription>
                    Save this number as a contact for quick access
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm text-muted-foreground py-4">
                  Phone number: {formatPhoneForDisplay(phoneNumber)}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="contactDisplayName">Display Name (Optional)</Label>
                  <Input
                    id="contactDisplayName"
                    placeholder="John Doe"
                    value={contactDisplayName}
                    onChange={(e) => setContactDisplayName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsSaveContactDialogOpen(false)
                    setContactDisplayName("")
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={async () => {
                    if (!phoneNumber || !sessionId) return
                    setSavingContact(true)
                    try {
                      const result = await createContactAction(
                        sessionId,
                        phoneNumber,
                        contactDisplayName.trim() || undefined
                      )
                      if (result.isSuccess) {
                        await loadContact()
                        setIsSaveContactDialogOpen(false)
                        setContactDisplayName("")
                      }
                    } catch (error) {
                      console.error("Failed to save contact:", error)
                    } finally {
                      setSavingContact(false)
                    }
                  }} disabled={savingContact}>
                    {savingContact ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0 bg-gradient-to-b from-background to-muted/20 min-h-0">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center">
            <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {messages.map((msg, index) => {
              const isPending = msg.status === "pending"
              const showAvatar = !msg.fromMe && (index === 0 || messages[index - 1]?.fromMe)
              
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${msg.fromMe ? "justify-end" : "justify-start"} ${
                    isPending ? "opacity-70" : ""
                  } transition-opacity`}
                >
                  {!msg.fromMe && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.fromMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    } shadow-sm`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content || `[${msg.messageType}]`}
                    </div>
                    <div
                      className={`text-xs mt-1 flex items-center gap-1 justify-end ${
                        msg.fromMe
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      {msg.fromMe && (
                        <span className="ml-1">
                          {msg.status === "pending" && <Clock className="inline h-3 w-3 opacity-50" />}
                          {msg.status === "sent" && <CheckCircle2 className="inline h-3 w-3 opacity-50" />}
                          {msg.status === "delivered" && <CheckCircle2 className="inline h-3 w-3 opacity-75" />}
                          {msg.status === "read" && <CheckCircle2 className="inline h-3 w-3" />}
                        </span>
                      )}
                    </div>
                  </div>
                  {msg.fromMe && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>
      <CardContent className="border-t bg-background pt-4">
        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                id="messageInput"
                placeholder="Type a message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                rows={Math.min(Math.max(messageContent.split("\n").length, 1), 4)}
                className="resize-none pr-12 min-h-[44px] max-h-[120px]"
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={sending || !messageContent.trim()}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {sendResult && !sendResult.success && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{sendResult.message}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

