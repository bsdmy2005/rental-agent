"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, User, Bot } from "lucide-react"
import { format } from "date-fns"
import type { SelectWhatsappExplorerMessage } from "@/db/schema"
import Image from "next/image"

interface IncidentMessageHistoryProps {
  messages: SelectWhatsappExplorerMessage[]
}

export function IncidentMessageHistory({ messages }: IncidentMessageHistoryProps) {
  if (messages.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Message History
        </CardTitle>
        <CardDescription>
          Conversation thread related to this incident ({messages.length} message{messages.length !== 1 ? "s" : ""})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {messages.map((message) => {
            const isFromUser = !message.fromMe
            const hasMedia = !!message.mediaUrl

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isFromUser ? "justify-start" : "justify-end"}`}
              >
                {isFromUser && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div
                  className={`flex flex-col gap-1 max-w-[80%] ${
                    isFromUser ? "items-start" : "items-end"
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isFromUser
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {message.content && (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                    
                    {hasMedia && message.mediaUrl && (
                      <div className="mt-2 rounded overflow-hidden">
                        {message.messageType === "image" ? (
                          <Image
                            src={message.mediaUrl}
                            alt="Message attachment"
                            width={300}
                            height={200}
                            className="object-cover"
                          />
                        ) : (
                          <div className="p-4 bg-background/50 text-sm">
                            <p className="text-muted-foreground">
                              {message.messageType} attachment
                            </p>
                            <a
                              href={message.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View attachment
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {!isFromUser && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <span>
                      {format(new Date(message.timestamp), "MMM dd, yyyy HH:mm")}
                    </span>
                    {message.status && (
                      <span className="capitalize">• {message.status}</span>
                    )}
                  </div>
                </div>

                {!isFromUser && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

