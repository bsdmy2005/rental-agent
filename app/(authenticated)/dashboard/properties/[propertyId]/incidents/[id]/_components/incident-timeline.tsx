"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, MessageSquare, Image as ImageIcon, FileText, UserCheck, DollarSign, Bot, User, CheckCircle } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import type { IncidentTimelineItem } from "@/types/incidents-types"
import Image from "next/image"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

interface IncidentTimelineProps {
  items: IncidentTimelineItem[]
}

export function IncidentTimeline({ items }: IncidentTimelineProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Incident Timeline
        </CardTitle>
        <CardDescription>
          Complete history of all activities for this incident ({items.length} event{items.length !== 1 ? "s" : ""})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {items.map((item, index) => (
              <TimelineItem key={item.id} item={item} isLast={index === items.length - 1} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface TimelineItemProps {
  item: IncidentTimelineItem
  isLast: boolean
}

function TimelineItem({ item, item: { type, timestamp, actor, content, metadata } }: TimelineItemProps) {
  const [imageExpanded, setImageExpanded] = useState(false)

  const getIcon = () => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4" />
      case "system_message":
        return <Bot className="h-4 w-4" />
      case "status_change":
        return <FileText className="h-4 w-4" />
      case "photo_upload":
        return <ImageIcon className="h-4 w-4" />
      case "assignment":
        return <UserCheck className="h-4 w-4" />
      case "quote_request":
      case "quote_approval":
        return <DollarSign className="h-4 w-4" />
      case "incident_created":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getIconColor = () => {
    switch (type) {
      case "message":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
      case "system_message":
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
      case "status_change":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
      case "photo_upload":
        return "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
      case "assignment":
        return "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300"
      case "quote_request":
      case "quote_approval":
        return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300"
      case "incident_created":
        return "bg-primary/10 text-primary"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getActorIcon = () => {
    if (!actor) return null
    switch (actor.type) {
      case "user":
        return <User className="h-3 w-3" />
      case "system":
        return <Bot className="h-3 w-3" />
      case "tenant":
        return <User className="h-3 w-3" />
      default:
        return null
    }
  }

  return (
    <div className="relative flex gap-4">
      {/* Timeline dot */}
      <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${getIconColor()} flex items-center justify-center`}>
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{getTimelineItemTitle(item)}</span>
            {actor && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getActorIcon()}
                <span>{actor.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
            <span>•</span>
            <span>{format(timestamp, "MMM dd, yyyy HH:mm")}</span>
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-2">
          {getTimelineItemContent(item)}
        </div>

        {/* Status change badge */}
        {type === "status_change" && metadata?.status && metadata?.previousStatus && (
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {metadata.previousStatus}
            </Badge>
            <span className="text-xs text-muted-foreground">→</span>
            <Badge variant="default" className="text-xs">
              {metadata.status}
            </Badge>
          </div>
        )}

        {/* Photo thumbnail - show for photo_upload type or messages with photos */}
        {(type === "photo_upload" || (type === "message" && metadata?.photoUrl)) && metadata?.photoUrl && (
          <div className="mt-2">
            <div
              className="relative w-48 h-32 rounded-lg overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setImageExpanded(!imageExpanded)}
            >
              <Image
                src={metadata.photoUrl}
                alt={metadata.photoFileName || "Photo"}
                fill
                className="object-cover"
              />
            </div>
            {imageExpanded && (
              <div
                className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                onClick={() => setImageExpanded(false)}
              >
                <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
                  <Image
                    src={metadata.photoUrl}
                    alt={metadata.photoFileName || "Photo"}
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quote amount */}
        {type === "quote_approval" && metadata?.quoteAmount && (
          <Badge variant="outline" className="mt-2">
            R{metadata.quoteAmount.toFixed(2)}
          </Badge>
        )}
      </div>
    </div>
  )
}

function getTimelineItemTitle(item: IncidentTimelineItem): string {
  switch (item.type) {
    case "message":
      return "Message"
    case "system_message":
      return "System Message"
    case "status_change":
      return "Status Changed"
    case "photo_upload":
      return "Photo Uploaded"
    case "assignment":
      return "Assigned"
    case "quote_request":
      return "Quote Requested"
    case "quote_approval":
      return "Quote Received"
    case "incident_created":
      return "Incident Created"
    default:
      return "Activity"
  }
}

function getTimelineItemContent(item: IncidentTimelineItem): string {
  if (item.content) {
    return item.content
  }

  switch (item.type) {
    case "status_change":
      return `Status changed to ${item.metadata?.status || "unknown"}`
    case "photo_upload":
      return `Photo: ${item.metadata?.photoFileName || "attachment"}`
    case "assignment":
      return `Assigned to ${item.metadata?.assignedToName || "user"}`
    case "quote_request":
      return "Quote request sent to service provider"
    case "quote_approval":
      return `Quote received: R${item.metadata?.quoteAmount?.toFixed(2) || "0.00"}`
    default:
      return "Activity recorded"
  }
}

