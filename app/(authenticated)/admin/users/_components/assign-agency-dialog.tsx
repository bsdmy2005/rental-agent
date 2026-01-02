"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { getRentalAgenciesAction } from "@/actions/db/rental-agencies-actions"
import { requestAgencyMembershipWithAuthAction } from "@/actions/db/agency-memberships-actions"
import { toast } from "sonner"
import type { SelectRentalAgency } from "@/db/schema"
import type { SelectUserProfile } from "@/db/schema"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getAgentMembershipStatusQuery } from "@/queries/agency-memberships-queries"

interface AssignAgencyDialogProps {
  userProfile: SelectUserProfile
}

export function AssignAgencyDialog({ userProfile }: AssignAgencyDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agencies, setAgencies] = useState<SelectRentalAgency[]>([])
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("")
  const [currentMembership, setCurrentMembership] = useState<any>(null)

  useEffect(() => {
    if (open && userProfile.userType === "rental_agent") {
      loadData()
    }
  }, [open, userProfile.userType])

  const loadData = async () => {
    try {
      const agenciesResult = await getRentalAgenciesAction()
      if (agenciesResult.isSuccess && agenciesResult.data) {
        setAgencies(agenciesResult.data)
      }

      // Check current membership
      const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
      if (rentalAgent) {
        const membership = await getAgentMembershipStatusQuery(rentalAgent.id)
        setCurrentMembership(membership)
        if (membership) {
          setSelectedAgencyId(membership.agency.id)
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }

  const handleSubmit = async () => {
    if (!selectedAgencyId) {
      toast.error("Please select an agency")
      return
    }

    setLoading(true)

    try {
      const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
      if (!rentalAgent) {
        toast.error("Rental agent profile not found")
        return
      }

      const result = await requestAgencyMembershipWithAuthAction(
        rentalAgent.id,
        selectedAgencyId
      )

      if (result.isSuccess) {
        toast.success("Membership request created successfully")
        setOpen(false)
        window.location.reload()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to request membership")
    } finally {
      setLoading(false)
    }
  }

  if (userProfile.userType !== "rental_agent") {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Assign to Agency
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Agent to Agency</DialogTitle>
          <DialogDescription>
            {currentMembership
              ? `Currently a member of: ${currentMembership.agency.name}. Request membership to a different agency.`
              : "Select an agency for this rental agent to join."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Agency</label>
            <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agency" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "Requesting..." : "Request Membership"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

