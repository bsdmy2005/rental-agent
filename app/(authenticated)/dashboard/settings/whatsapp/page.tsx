"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { WhatsAppSettingsClient } from "./_components/whatsapp-settings-client"

export default async function WhatsAppSettingsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  const userProfile = await getUserProfileByClerkIdQuery(userId)

  if (!userProfile) {
    redirect("/onboarding")
  }

  return <WhatsAppSettingsClient userProfileId={userProfile.id} />
}

