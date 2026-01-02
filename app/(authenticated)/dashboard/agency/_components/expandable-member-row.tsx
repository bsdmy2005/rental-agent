"use client"

import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, Building2 } from "lucide-react"
import { AgentPropertiesList } from "@/app/(authenticated)/admin/users/_components/agent-properties-list"

interface ExpandableMemberRowProps {
  agentId: string
  agentName: string
  agentEmail: string
  joinDate: Date | null
  propertyCount?: number
}

export function ExpandableMemberRow({
  agentId,
  agentName,
  agentEmail,
  joinDate,
  propertyCount: initialPropertyCount
}: ExpandableMemberRowProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between p-4">
        <CollapsibleTrigger asChild>
          <div className="flex flex-1 items-center gap-3 cursor-pointer hover:bg-accent/50 -m-4 p-4 rounded-md transition-colors">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{agentName}</span>
                {initialPropertyCount !== undefined && (
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    {initialPropertyCount} {initialPropertyCount === 1 ? "property" : "properties"}
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground text-sm">{agentEmail}</div>
              {joinDate && (
                <div className="text-muted-foreground text-xs">
                  Joined: {new Date(joinDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="px-4 pb-4">
        <div className="ml-7 border-l-2 border-muted pl-4">
          <AgentPropertiesList rentalAgentId={agentId} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

