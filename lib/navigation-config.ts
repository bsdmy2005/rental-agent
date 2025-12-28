import {
  Building2,
  FileText,
  Home,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Wrench,
  CreditCard,
  MessageSquare,
  UserCog,
  Calendar,
  Globe,
  Zap,
  DollarSign,
  AlertTriangle,
  Hammer,
  ClipboardList,
  FileCheck,
  FileEdit
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  items?: {
    title: string
    url: string
  }[]
}

export function getNavigationForUserType(
  userType: "landlord" | "rental_agent" | "tenant" | "admin"
): NavItem[] {
  switch (userType) {
    case "landlord":
      return [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard
        },
        {
          title: "Properties",
          url: "/dashboard/properties",
          icon: Home,
          items: [
            {
              title: "View Properties",
              url: "/dashboard/properties"
            },
            {
              title: "Add Property",
              url: "/dashboard/properties/add"
            }
          ]
        },
        {
          title: "Tenants",
          url: "/dashboard/tenants",
          icon: Users,
          items: [
            {
              title: "View Tenants",
              url: "/dashboard/tenants"
            },
            {
              title: "Add Tenant",
              url: "/dashboard/tenants/add"
            }
          ]
        },
        {
          title: "Leases",
          url: "/dashboard/leases",
          icon: FileCheck
        },
        {
          title: "Lease Templates",
          url: "/dashboard/lease-templates",
          icon: FileEdit
        },
        {
          title: "Bills",
          url: "/dashboard/bills",
          icon: FileText,
          items: [
            {
              title: "View Bills",
              url: "/dashboard/bills"
            },
            {
              title: "Upload Bills",
              url: "/dashboard/bills/upload"
            }
          ]
        },
        {
          title: "Rental Invoices",
          url: "/dashboard/rental-invoices",
          icon: Receipt
        },
        {
          title: "Payments",
          url: "/dashboard/payments",
          icon: CreditCard
        },
        {
          title: "Extraction Rules",
          url: "/dashboard/rules",
          icon: Wrench,
          items: [
            {
              title: "View Rules",
              url: "/dashboard/rules"
            },
            {
              title: "Add Rule",
              url: "/dashboard/rules/add"
            }
          ]
        },
        {
          title: "Browser Use Explorer",
          url: "/dashboard/browser-use-explorer",
          icon: Globe
        },
        {
          title: "Investec Explorer",
          url: "/dashboard/investec-explorer",
          icon: Zap
        },
        {
          title: "WhatsApp Explorer",
          url: "/dashboard/whatsapp-explorer",
          icon: MessageSquare
        },
        {
          title: "Expenses",
          url: "/dashboard/expenses",
          icon: DollarSign
        },
        {
          title: "Incidents",
          url: "/dashboard/incidents",
          icon: AlertTriangle
        },
        {
          title: "Service Providers",
          url: "/dashboard/service-providers",
          icon: Hammer
        },
        {
          title: "RFQs",
          url: "/dashboard/rfqs",
          icon: ClipboardList
        },
        {
          title: "Settings",
          url: "/dashboard/settings",
          icon: Settings,
          items: [
            {
              title: "Profile",
              url: "/dashboard/profile"
            },
            {
              title: "Account",
              url: "/dashboard/account"
            }
          ]
        }
      ]

    case "rental_agent":
      return [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard
        },
        {
          title: "Managed Properties",
          url: "/dashboard/properties",
          icon: Home
        },
        {
          title: "Leases",
          url: "/dashboard/leases",
          icon: FileCheck
        },
        {
          title: "Lease Templates",
          url: "/dashboard/lease-templates",
          icon: FileEdit
        },
        {
          title: "Bills",
          url: "/dashboard/bills",
          icon: FileText,
          items: [
            {
              title: "View Bills",
              url: "/dashboard/bills"
            },
            {
              title: "Upload Bills",
              url: "/dashboard/bills/upload"
            }
          ]
        },
        {
          title: "Rental Invoices",
          url: "/dashboard/rental-invoices",
          icon: Receipt
        },
        {
          title: "Payments",
          url: "/dashboard/payments",
          icon: CreditCard
        },
        {
          title: "Extraction Rules",
          url: "/dashboard/rules",
          icon: Wrench,
          items: [
            {
              title: "View Rules",
              url: "/dashboard/rules"
            },
            {
              title: "Add Rule",
              url: "/dashboard/rules/add"
            }
          ]
        },
        {
          title: "Browser Use Explorer",
          url: "/dashboard/browser-use-explorer",
          icon: Globe
        },
        {
          title: "Investec Explorer",
          url: "/dashboard/investec-explorer",
          icon: Zap
        },
        {
          title: "WhatsApp Explorer",
          url: "/dashboard/whatsapp-explorer",
          icon: MessageSquare
        },
        {
          title: "Expenses",
          url: "/dashboard/expenses",
          icon: DollarSign
        },
        {
          title: "Incidents",
          url: "/dashboard/incidents",
          icon: AlertTriangle
        },
        {
          title: "Service Providers",
          url: "/dashboard/service-providers",
          icon: Hammer
        },
        {
          title: "RFQs",
          url: "/dashboard/rfqs",
          icon: ClipboardList
        },
        {
          title: "Settings",
          url: "/dashboard/settings",
          icon: Settings,
          items: [
            {
              title: "Profile",
              url: "/dashboard/profile"
            },
            {
              title: "Account",
              url: "/dashboard/account"
            }
          ]
        }
      ]

    case "tenant":
      return [
        {
          title: "Dashboard",
          url: "/tenant/dashboard",
          icon: LayoutDashboard
        },
        {
          title: "Invoices",
          url: "/tenant/invoices",
          icon: Receipt
        },
        {
          title: "Payments",
          url: "/tenant/payments",
          icon: CreditCard
        },
        {
          title: "Incidents",
          url: "/tenant/incidents",
          icon: AlertTriangle
        },
        {
          title: "Messages",
          url: "/tenant/messages",
          icon: MessageSquare
        },
        {
          title: "Profile",
          url: "/tenant/profile",
          icon: Settings
        }
      ]

    case "admin":
      return [
        {
          title: "Dashboard",
          url: "/admin",
          icon: LayoutDashboard
        },
        {
          title: "Users",
          url: "/admin/users",
          icon: Users
        },
        {
          title: "Properties",
          url: "/admin/properties",
          icon: Home
        },
        {
          title: "System Settings",
          url: "/admin/settings",
          icon: Settings
        },
        {
          title: "Analytics",
          url: "/admin/analytics",
          icon: Building2
        }
      ]

    default:
      return []
  }
}

