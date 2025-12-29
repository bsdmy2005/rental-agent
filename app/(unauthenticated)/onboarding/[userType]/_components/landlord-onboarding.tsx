"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createLandlordAction } from "@/actions/landlords-actions"
import { completeOnboardingAction } from "@/actions/user-profiles-actions"
import { WhatsAppSetup } from "./whatsapp-setup"
import { toast } from "sonner"

interface LandlordOnboardingProps {
  userProfileId: string
}

export function LandlordOnboarding({ userProfileId }: LandlordOnboardingProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"profile" | "whatsapp">("profile")
  const [formData, setFormData] = useState({
    companyName: "",
    registrationNumber: "",
    taxId: "",
    address: "",
    contactEmail: "",
    contactPhone: ""
  })

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const landlordResult = await createLandlordAction(userProfileId, formData)

      if (!landlordResult.isSuccess) {
        toast.error(landlordResult.message)
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
      <h2 className="mb-6 text-2xl font-bold">Complete Your Landlord Profile</h2>
      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div>
          <Label htmlFor="companyName">Company Name (Optional)</Label>
          <Input
            id="companyName"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="registrationNumber">Registration Number (Optional)</Label>
          <Input
            id="registrationNumber"
            value={formData.registrationNumber}
            onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="taxId">Tax ID (Optional)</Label>
          <Input
            id="taxId"
            value={formData.taxId}
            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating Profile..." : "Complete Setup"}
        </Button>
      </form>
    </div>
  )
}

