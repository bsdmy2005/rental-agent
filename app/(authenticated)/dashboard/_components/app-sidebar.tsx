"use client"

import { Building2, User } from "lucide-react"
import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@/components/ui/sidebar"
import { NavMain } from "../_components/nav-main"
import { NavUser } from "../_components/nav-user"
import { getNavigationForUserType } from "@/lib/navigation-config"
import { WhatsAppStatusBadge } from "./whatsapp-status-badge"

function SidebarLogo() {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Building2 className="h-5 w-5 shrink-0" />
      <span className="font-semibold group-data-[collapsible=icon]:hidden">
        PropNxt.AI
      </span>
    </div>
  )
}

export function AppSidebar({
  userData,
  userType,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  userData: {
    name: string
    email: string
    avatar: string
    membership: string
  }
  userType: "landlord" | "rental_agent" | "tenant" | "admin"
}) {
  const navItems = getNavigationForUserType(userType)

  const data = {
    user: userData,
    teams: [
      {
        name: userType === "landlord" ? "My Properties" : userType === "rental_agent" ? "Managed Properties" : "Account",
        logo: userType === "admin" ? Building2 : User,
        plan: userType === "admin" ? "Admin" : "Account"
      }
    ],
    navMain: navItems
  }
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <WhatsAppStatusBadge />
        <NavUser user={data.user} userType={userType} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
