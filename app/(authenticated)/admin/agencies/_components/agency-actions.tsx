"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"
import { deleteRentalAgencyAction } from "@/actions/db/rental-agencies-actions"
import { toast } from "sonner"
import type { SelectRentalAgency } from "@/db/schema"

interface AgencyActionsProps {
  agency: SelectRentalAgency
}

export function AgencyActions({ agency }: AgencyActionsProps) {
  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${agency.name}"? This will deactivate the agency.`
      )
    ) {
      return
    }

    const result = await deleteRentalAgencyAction(agency.id)
    if (result.isSuccess) {
      toast.success("Agency deleted")
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
        <DropdownMenuItem onClick={handleDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

