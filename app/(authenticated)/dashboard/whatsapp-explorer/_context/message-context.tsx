"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"
import { getMessagesByThreadAction } from "@/actions/whatsapp-threads-actions"
import type { SelectWhatsappExplorerMessage } from "@/db/schema"

interface MessageContextType {
  messages: Map<string, SelectWhatsappExplorerMessage[]>
  optimisticMessages: Map<string, SelectWhatsappExplorerMessage[]>
  getThreadMessages: (phoneNumber: string) => SelectWhatsappExplorerMessage[]
  addOptimisticMessage: (phoneNumber: string, message: SelectWhatsappExplorerMessage) => void
  removeOptimisticMessage: (phoneNumber: string, messageId: string) => void
  syncMessages: (sessionId: string, phoneNumber: string) => Promise<void>
  isLoading: Map<string, boolean>
}

const MessageContext = createContext<MessageContextType | undefined>(undefined)

export function MessageProvider({ children, sessionId }: { children: React.ReactNode; sessionId: string | null }) {
  const [messages, setMessages] = useState<Map<string, SelectWhatsappExplorerMessage[]>>(new Map())
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, SelectWhatsappExplorerMessage[]>>(new Map())
  const [isLoading, setIsLoading] = useState<Map<string, boolean>>(new Map())
  const lastSyncTime = useRef<Map<string, number>>(new Map())
  const syncIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Deduplicate messages by messageId
  const deduplicateMessages = useCallback((msgs: SelectWhatsappExplorerMessage[]): SelectWhatsappExplorerMessage[] => {
    const seen = new Set<string>()
    return msgs.filter((msg) => {
      if (seen.has(msg.messageId)) {
        return false
      }
      seen.add(msg.messageId)
      return true
    })
  }, [])

  // Merge messages from server with optimistic messages
  const mergeMessages = useCallback(
    (serverMessages: SelectWhatsappExplorerMessage[], optimistic: SelectWhatsappExplorerMessage[]): SelectWhatsappExplorerMessage[] => {
      // Combine and deduplicate
      const combined = [...serverMessages, ...optimistic]
      const deduplicated = deduplicateMessages(combined)
      
      // Sort by timestamp
      return deduplicated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    },
    [deduplicateMessages]
  )

  // Sync messages for a specific thread
  const syncMessages = useCallback(
    async (sessionId: string, phoneNumber: string) => {
      if (!sessionId || !phoneNumber) return

      setIsLoading((prev) => {
        const next = new Map(prev)
        next.set(phoneNumber, true)
        return next
      })

      try {
        const result = await getMessagesByThreadAction(sessionId, phoneNumber)
        if (result.isSuccess && result.data) {
          const optimistic = optimisticMessages.get(phoneNumber) || []
          const merged = mergeMessages(result.data, optimistic)
          
          setMessages((prev) => {
            const next = new Map(prev)
            next.set(phoneNumber, merged)
            return next
          })

          lastSyncTime.current.set(phoneNumber, Date.now())
        }
      } catch (error) {
        console.error(`Failed to sync messages for ${phoneNumber}:`, error)
      } finally {
        setIsLoading((prev) => {
          const next = new Map(prev)
          next.set(phoneNumber, false)
          return next
        })
      }
    },
    [optimisticMessages, mergeMessages]
  )

  // Add optimistic message
  const addOptimisticMessage = useCallback((phoneNumber: string, message: SelectWhatsappExplorerMessage) => {
    setOptimisticMessages((prev) => {
      const next = new Map(prev)
      const existing = next.get(phoneNumber) || []
      next.set(phoneNumber, [...existing, message])
      return next
    })

    // Also update the main messages immediately for instant UI feedback
    setMessages((prev) => {
      const next = new Map(prev)
      const existing = next.get(phoneNumber) || []
      const merged = [...existing, message].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      next.set(phoneNumber, merged)
      return next
    })
  }, [])

  // Remove optimistic message (when server confirms or fails)
  const removeOptimisticMessage = useCallback((phoneNumber: string, messageId: string) => {
    setOptimisticMessages((prev) => {
      const next = new Map(prev)
      const existing = next.get(phoneNumber) || []
      next.set(phoneNumber, existing.filter((msg) => msg.messageId !== messageId))
      return next
    })
  }, [])

  // Get messages for a thread
  const getThreadMessages = useCallback(
    (phoneNumber: string): SelectWhatsappExplorerMessage[] => {
      return messages.get(phoneNumber) || []
    },
    [messages]
  )

  // Setup polling for active threads with smart intervals
  useEffect(() => {
    if (!sessionId) return

    // Poll every 5 seconds for active threads (reduced frequency for better performance)
    // Only poll when tab is visible (using Page Visibility API)
    let interval: NodeJS.Timeout | null = null
    
    const startPolling = () => {
      if (document.visibilityState === "visible") {
        interval = setInterval(() => {
          // Sync all threads that have messages (active threads)
          const activeThreads = Array.from(messages.keys())
          activeThreads.forEach((phoneNumber) => {
            // Only sync if not currently loading
            if (!isLoading.get(phoneNumber)) {
              syncMessages(sessionId, phoneNumber)
            }
          })
        }, 5000) // Increased to 5 seconds
      }
    }

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    // Handle visibility changes
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
  }, [sessionId, messages, syncMessages, isLoading])

  const value: MessageContextType = {
    messages,
    optimisticMessages,
    getThreadMessages,
    addOptimisticMessage,
    removeOptimisticMessage,
    syncMessages,
    isLoading
  }

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
}

export function useMessages() {
  const context = useContext(MessageContext)
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessageProvider")
  }
  return context
}

