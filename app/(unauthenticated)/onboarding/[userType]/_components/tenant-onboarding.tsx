"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { completeOnboardingAction } from "@/actions/user-profiles-actions"
import { toast } from "sonner"

interface TenantOnboardingProps {
  userProfileId: string
}

export function TenantOnboarding({ userProfileId }: TenantOnboardingProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const onboardingResult = await completeOnboardingAction(userProfileId)

      if (onboardingResult.isSuccess) {
        toast.success("Profile created successfully!")
        router.push("/tenant/dashboard")
      } else {
        toast.error(onboardingResult.message)
      }
    } catch (error) {
      toast.error("Failed to complete onboarding")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-6 text-2xl font-bold">Welcome, Tenant!</h2>
      <p className="text-muted-foreground mb-6">
        Your account is being set up. You'll be able to view your invoices, make payments, and
        submit maintenance requests once your property owner links your account.
      </p>
      <form onSubmit={handleSubmit}>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Setting up..." : "Continue"}
        </Button>
      </form>
    </div>
  )
}

