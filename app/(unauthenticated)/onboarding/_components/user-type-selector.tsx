"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Building2, User, Users, UserCog } from "lucide-react"
import { createUserProfileAction } from "@/actions/user-profiles-actions"
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"

const userTypes = [
  {
    type: "landlord" as const,
    title: "Landlord",
    description: "I own properties and want to manage them",
    icon: Building2
  },
  {
    type: "rental_agent" as const,
    title: "Rental Agent",
    description: "I manage properties for multiple landlords",
    icon: Users
  },
  {
    type: "tenant" as const,
    title: "Tenant",
    description: "I'm a tenant looking to access my account",
    icon: User
  },
  {
    type: "admin" as const,
    title: "Admin",
    description: "I'm a system administrator",
    icon: UserCog
  }
]

export function UserTypeSelector() {
  const router = useRouter()
  const { user } = useUser()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelectUserType = async (userType: typeof userTypes[number]["type"]) => {
    if (!user) {
      toast.error("Please sign in first")
      return
    }

    setLoading(userType)

    try {
      const result = await createUserProfileAction(user.id, userType, {
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined
      })

      if (result.isSuccess) {
        router.push(`/onboarding/${userType}`)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to create user profile")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {userTypes.map((userType) => (
        <Button
          key={userType.type}
          variant="outline"
          className="h-auto flex-col gap-4 p-6"
          onClick={() => handleSelectUserType(userType.type)}
          disabled={loading !== null}
        >
          <userType.icon className="h-12 w-12" />
          <div className="text-center">
            <div className="font-semibold">{userType.title}</div>
            <div className="text-muted-foreground text-sm">{userType.description}</div>
          </div>
          {loading === userType.type && <div>Loading...</div>}
        </Button>
      ))}
    </div>
  )
}

