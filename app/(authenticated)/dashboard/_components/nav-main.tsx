"use client"

import { useLocalStorage } from "@/hooks/use-local-storage"
import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
} from "@/components/ui/sidebar"

export function NavMain({
  items
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  // Initialize with default open state - all items start as open
  const defaultOpenState = items.reduce(
    (acc, item) => ({
      ...acc,
      [item.title]: true // Default to open to avoid visual jumps
    }),
    {} as Record<string, boolean>
  )

  // Always start with default state for consistent server/client render
  const [currentOpenItems, setCurrentOpenItems] = useState(defaultOpenState)
  const [mounted, setMounted] = useState(false)

  // Use localStorage hook for persistence, but don't use its value for initial render
  const [, setStoredItems] = useLocalStorage("sidebar-open-items", defaultOpenState)

  useEffect(() => {
    setMounted(true)
    // After mount, read from localStorage and update state
    try {
      const stored = window.localStorage.getItem("sidebar-open-items")
      if (stored) {
        const parsed = JSON.parse(stored)
        setCurrentOpenItems(parsed)
      }
    } catch (error) {
      // If error reading localStorage, keep default state
      console.error("Error reading sidebar state from localStorage:", error)
    }
  }, [])

  // Handle open/close state changes
  const handleOpenChange = (itemTitle: string, isOpen: boolean) => {
    const newState = { ...currentOpenItems, [itemTitle]: isOpen }
    setCurrentOpenItems(newState)
    setStoredItems(newState)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map(item => (
          <SidebarMenuItem key={item.title}>
            {item.items && item.items.length > 0 ? (
              // Item has subitems - make it collapsible
              isCollapsed ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className="data-[state=open]:bg-accent"
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="right"
                    align="start"
                    className="w-64 p-2"
                    sideOffset={12}
                  >
                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium">
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                    </div>
                    <DropdownMenuSeparator className="my-1" />
                    {item.items.map(subItem => (
                      <DropdownMenuItem key={subItem.title} asChild>
                        <Link
                          href={subItem.url}
                          className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-sm"
                        >
                          <div className="bg-muted-foreground/50 h-1.5 w-1.5 rounded-full" />
                          {subItem.title}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Collapsible
                  asChild
                  open={mounted ? (currentOpenItems[item.title] ?? true) : true}
                  onOpenChange={isOpen => handleOpenChange(item.title, isOpen)}
                  className="group/collapsible"
                >
                  <div>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map(subItem => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            ) : (
              // Item has no subitems - make it a simple link
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
