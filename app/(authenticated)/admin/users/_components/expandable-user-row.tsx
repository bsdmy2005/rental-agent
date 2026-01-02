"use client"

import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, Building2 } from "lucide-react"
import { UserActions } from "./user-actions"
import { AgentPropertiesList } from "./agent-properties-list"
import type { SelectUserProfile } from "@/db/schema"

interface ExpandableUserRowProps {
  userProfile: SelectUserProfile
  propertyCount?: number
  rentalAgentId?: string | null
}

export function ExpandableUserRow({
  userProfile,
  propertyCount: initialPropertyCount,
  rentalAgentId
}: ExpandableUserRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isRentalAgent = userProfile.userType === "rental_agent"

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between p-4">
        <CollapsibleTrigger asChild>
          <div className="flex flex-1 items-center gap-3 cursor-pointer hover:bg-accent/50 -m-4 p-4 rounded-md transition-colors">
            {isRentalAgent ? (
              isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-4" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {userProfile.firstName} {userProfile.lastName}
                </span>
                {isRentalAgent && initialPropertyCount !== undefined && (
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    {initialPropertyCount} {initialPropertyCount === 1 ? "property" : "properties"}
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground text-sm">{userProfile.email}</div>
              <div className="text-muted-foreground text-xs">
                Type: {userProfile.userType} • {userProfile.isActive ? "Active" : "Inactive"}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        <div className="ml-4" onClick={(e) => e.stopPropagation()}>
          <UserActions userProfile={userProfile} />
        </div>
      </div>
      {isRentalAgent && rentalAgentId && (
        <CollapsibleContent className="px-4 pb-4">
          <div className="ml-7 border-l-2 border-muted pl-4">
            <AgentPropertiesList rentalAgentId={rentalAgentId} />
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

