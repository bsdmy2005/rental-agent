"use server"

import { getCustomerByUserId } from "@/actions/customers"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import DashboardClientLayout from "./_components/layout-client"

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  if (!user) {
    redirect("/login")
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)

  if (!userProfile || !userProfile.isActive) {
    redirect("/onboarding")
  }

  // Only allow landlords, rental agents, and admins in the main dashboard
  // Tenants have their own portal
  if (userProfile.userType === "tenant") {
    redirect("/tenant/dashboard")
  }

  const customer = await getCustomerByUserId(user.id)
  const membership = customer?.membership ?? "free"

  const userData = {
    name:
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.username || "User",
    email: user.emailAddresses[0]?.emailAddress || "",
    avatar: user.imageUrl || "",
    membership
  }

  return (
    <DashboardClientLayout userData={userData} userType={userProfile.userType}>
      {children}
    </DashboardClientLayout>
  )
}
