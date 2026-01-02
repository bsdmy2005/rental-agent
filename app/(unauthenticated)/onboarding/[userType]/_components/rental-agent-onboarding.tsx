"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { createRentalAgentAction } from "@/actions/rental-agents-actions"
import { completeOnboardingAction } from "@/actions/user-profiles-actions"
import { getRentalAgenciesAction } from "@/actions/db/rental-agencies-actions"
import { requestAgencyMembershipWithAuthAction } from "@/actions/db/agency-memberships-actions"
import { createRentalAgencyWithAuthAction } from "@/actions/db/rental-agencies-actions"
import { WhatsAppSetup } from "./whatsapp-setup"
import { toast } from "sonner"
import type { SelectRentalAgency } from "@/db/schema"

interface RentalAgentOnboardingProps {
  userProfileId: string
}

export function RentalAgentOnboarding({ userProfileId }: RentalAgentOnboardingProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"profile" | "whatsapp">("profile")
  const [agencyOption, setAgencyOption] = useState<"join" | "create" | "none">("none")
  const [agencies, setAgencies] = useState<SelectRentalAgency[]>([])
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("")
  const [formData, setFormData] = useState({
    agencyName: "",
    licenseNumber: "",
    contactEmail: "",
    contactPhone: "",
    address: ""
  })

  useEffect(() => {
    loadAgencies()
  }, [])

  const loadAgencies = async () => {
    const result = await getRentalAgenciesAction()
    if (result.isSuccess && result.data) {
      setAgencies(result.data)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create rental agent profile first
      const agentData: any = {
        licenseNumber: formData.licenseNumber || null,
        contactEmail: formData.contactEmail || null,
        contactPhone: formData.contactPhone || null,
        address: formData.address || null
      }

      // Only include agencyName if not joining an agency
      if (agencyOption !== "join") {
        agentData.agencyName = agencyOption === "create" ? formData.agencyName : null
      }

      const agentResult = await createRentalAgentAction(userProfileId, agentData)

      if (!agentResult.isSuccess || !agentResult.data) {
        toast.error(agentResult.message)
        setLoading(false)
        return
      }

      // Handle agency membership or creation
      if (agencyOption === "join" && selectedAgencyId) {
        const membershipResult = await requestAgencyMembershipWithAuthAction(
          agentResult.data.id,
          selectedAgencyId
        )
        if (!membershipResult.isSuccess) {
          toast.warning(
            `Profile created but failed to request agency membership: ${membershipResult.message}`
          )
        } else {
          toast.success("Membership request submitted. Waiting for approval.")
        }
      } else if (agencyOption === "create") {
        const agencyResult = await createRentalAgencyWithAuthAction({
          name: formData.agencyName,
          licenseNumber: formData.licenseNumber || null,
          contactEmail: formData.contactEmail || null,
          contactPhone: formData.contactPhone || null,
          address: formData.address || null
        })
        if (!agencyResult.isSuccess) {
          toast.warning(
            `Profile created but failed to create agency: ${agencyResult.message}`
          )
        } else {
          toast.success("Agency created successfully. You are now the owner.")
        }
      }

      // Move to WhatsApp setup step
      setStep("whatsapp")
    } catch (error) {
      toast.error("Failed to create profile")
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsAppComplete = async () => {
    setLoading(true)

    try {
      const onboardingResult = await completeOnboardingAction(userProfileId)

      if (onboardingResult.isSuccess) {
        toast.success("Profile created successfully!")
        router.push("/dashboard")
      } else {
        toast.error(onboardingResult.message)
      }
    } catch (error) {
      toast.error("Failed to complete onboarding")
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsAppSkip = async () => {
    await handleWhatsAppComplete()
  }

  if (step === "whatsapp") {
    return (
      <WhatsAppSetup
        userProfileId={userProfileId}
        onComplete={handleWhatsAppComplete}
        onSkip={handleWhatsAppSkip}
      />
    )
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-6 text-2xl font-bold">Complete Your Rental Agent Profile</h2>
      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div>
          <Label>Agency Option</Label>
          <RadioGroup
            value={agencyOption}
            onValueChange={(value) => setAgencyOption(value as "join" | "create" | "none")}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none" className="font-normal">
                Work independently (no agency)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="join" id="join" />
              <Label htmlFor="join" className="font-normal">
                Join existing agency
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="create" id="create" />
              <Label htmlFor="create" className="font-normal">
                Create new agency
              </Label>
            </div>
          </RadioGroup>
        </div>

        {agencyOption === "join" && (
          <div>
            <Label htmlFor="selectedAgency">Select Agency *</Label>
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
            <p className="text-muted-foreground text-xs mt-1">
              Your membership request will need to be approved by the agency owner or admin.
            </p>
          </div>
        )}

        {agencyOption === "create" && (
          <>
            <div>
              <Label htmlFor="agencyName">Agency Name *</Label>
              <Input
                id="agencyName"
                value={formData.agencyName}
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                required={agencyOption === "create"}
              />
            </div>
            <div>
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </>
        )}

        {agencyOption === "none" && (
          <>
            <div>
              <Label htmlFor="licenseNumber">License Number (Optional)</Label>
              <Input
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email (Optional)</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone (Optional)</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address">Address (Optional)</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || (agencyOption === "join" && !selectedAgencyId)}
        >
          {loading ? "Creating Profile..." : "Complete Setup"}
        </Button>
      </form>
    </div>
  )
}

