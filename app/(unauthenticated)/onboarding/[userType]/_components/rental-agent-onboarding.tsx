"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createRentalAgentAction } from "@/actions/rental-agents-actions"
import { completeOnboardingAction } from "@/actions/user-profiles-actions"
import { WhatsAppSetup } from "./whatsapp-setup"
import { toast } from "sonner"

interface RentalAgentOnboardingProps {
  userProfileId: string
}

export function RentalAgentOnboarding({ userProfileId }: RentalAgentOnboardingProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"profile" | "whatsapp">("profile")
  const [formData, setFormData] = useState({
    agencyName: "",
    licenseNumber: "",
    contactEmail: "",
    contactPhone: "",
    address: ""
  })

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const agentResult = await createRentalAgentAction(userProfileId, formData)

      if (!agentResult.isSuccess) {
        toast.error(agentResult.message)
        setLoading(false)
        return
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
          <Label htmlFor="agencyName">Agency Name (Optional)</Label>
          <Input
            id="agencyName"
            value={formData.agencyName}
            onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
          />
        </div>
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating Profile..." : "Complete Setup"}
        </Button>
      </form>
    </div>
  )
}

