"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  ChevronRight, 
  CreditCard, 
  FileText, 
  Calendar, 
  Settings, 
  Key,
  User,
  type LucideIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

const iconMap: Record<string, LucideIcon> = {
  CreditCard,
  FileText,
  Calendar,
  Settings,
  Key,
  User
}

interface CollapsibleSectionCardProps {
  title: string
  description: string
  defaultOpen?: boolean
  actionButton?: React.ReactNode
  icon?: string
  iconColor?: string
  children: React.ReactNode
}

export function CollapsibleSectionCard({
  title,
  description,
  defaultOpen = false,
  actionButton,
  icon,
  iconColor = "text-muted-foreground",
  children
}: CollapsibleSectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const Icon = icon ? iconMap[icon] : null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 hover:border-primary/20 transition-colors">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <ChevronRight
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform flex-shrink-0",
                    isOpen && "rotate-90"
                  )}
                />
                {Icon && (
                  <Icon className={cn("h-5 w-5 flex-shrink-0", iconColor)} />
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription className="text-sm mt-1">{description}</CardDescription>
                </div>
              </div>
              {actionButton && (
                <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                  {actionButton}
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-6">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}





