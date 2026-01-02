"use client"

import { Button } from "@/components/ui/button"
import {
  approveAgencyMembershipWithAuthAction,
  rejectAgencyMembershipWithAuthAction
} from "@/actions/db/agency-memberships-actions"
import { toast } from "sonner"

interface PendingRequestActionsProps {
  membershipId: string
}

export function PendingRequestActions({ membershipId }: PendingRequestActionsProps) {
  const handleApprove = async () => {
    const result = await approveAgencyMembershipWithAuthAction(membershipId)
    if (result.isSuccess) {
      toast.success("Membership approved")
      window.location.reload()
    } else {
      toast.error(result.message)
    }
  }

  const handleReject = async () => {
    const reason = prompt("Reason for rejection (optional):")
    const result = await rejectAgencyMembershipWithAuthAction(
      membershipId,
      reason || undefined
    )
    if (result.isSuccess) {
      toast.success("Membership rejected")
      window.location.reload()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="default" size="sm" onClick={handleApprove}>
        Approve
      </Button>
      <Button variant="outline" size="sm" onClick={handleReject}>
        Reject
      </Button>
    </div>
  )
}

