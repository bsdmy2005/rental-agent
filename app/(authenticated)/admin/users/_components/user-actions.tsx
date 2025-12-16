"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"
import { activateUserProfileAction, deactivateUserProfileAction } from "@/actions/user-profiles-actions"
import { toast } from "sonner"
import type { SelectUserProfile } from "@/db/schema"

interface UserActionsProps {
  userProfile: SelectUserProfile
}

export function UserActions({ userProfile }: UserActionsProps) {
  const handleActivate = async () => {
    const result = await activateUserProfileAction(userProfile.id)
    if (result.isSuccess) {
      toast.success("User activated")
      window.location.reload()
    } else {
      toast.error(result.message)
    }
  }

  const handleDeactivate = async () => {
    const result = await deactivateUserProfileAction(userProfile.id)
    if (result.isSuccess) {
      toast.success("User deactivated")
      window.location.reload()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {userProfile.isActive ? (
          <DropdownMenuItem onClick={handleDeactivate}>Deactivate</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleActivate}>Activate</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

