"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import { useClerk } from "@clerk/nextjs"
import {
  ChevronsUpDown,
  CreditCard,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  User
} from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"

export function NavUser({
  user,
  userType
}: {
  user: {
    name: string
    email: string
    avatar: string
    membership: string
  }
  userType: "landlord" | "rental_agent" | "tenant" | "admin"
}) {
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const { signOut } = useClerk()

  const getInitials = (name: string) => {
    const words = name.split(" ")
    if (words.length >= 2) {
      return words[0][0] + words[1][0]
    }
    return name.slice(0, 2).toUpperCase()
  }

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case "landlord":
        return "Landlord"
      case "rental_agent":
        return "Rental Agent"
      case "tenant":
        return "Tenant"
      case "admin":
        return "Admin"
      default:
        return type
    }
  }

  const getUserTypeVariant = (type: string): "default" | "secondary" | "outline" => {
    switch (type) {
      case "admin":
        return "default"
      case "landlord":
        return "default"
      case "rental_agent":
        return "secondary"
      case "tenant":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant={getUserTypeVariant(userType)}
                    className="w-fit px-2 py-0 text-xs"
                  >
                    {getUserTypeLabel(userType)}
                  </Badge>
                  <Badge
                    variant={user.membership === "pro" ? "default" : "secondary"}
                    className="w-fit px-2 py-0 text-xs"
                  >
                    {user.membership === "pro" ? "Pro" : "Free"}
                  </Badge>
                </div>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge
                      variant={getUserTypeVariant(userType)}
                      className="w-fit px-2 py-0 text-xs"
                    >
                      {getUserTypeLabel(userType)}
                    </Badge>
                    <Badge
                      variant={user.membership === "pro" ? "default" : "secondary"}
                      className="w-fit px-2 py-0 text-xs"
                    >
                      {user.membership === "pro" ? "Pro" : "Free"}
                    </Badge>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/account">
                  <User />
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing">
                  <CreditCard />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/support">
                  <HelpCircle />
                  Support
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
