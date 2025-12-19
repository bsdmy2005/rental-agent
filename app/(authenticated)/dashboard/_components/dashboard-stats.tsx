"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getDashboardStatsQuery } from "@/queries/dashboard-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Home,
  Users,
  FileText,
  Receipt,
  CreditCard,
  Settings,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react"

export async function DashboardStats() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const stats = await getDashboardStatsQuery(userProfile.id, userProfile.userType)

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.properties}</div>
            <p className="text-muted-foreground text-xs mt-1">
              <Link href="/dashboard/properties" className="hover:underline">
                View all properties
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tenants}</div>
            <p className="text-muted-foreground text-xs mt-1">
              <Link href="/dashboard/tenants" className="hover:underline">
                Manage tenants
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingBills}</div>
            <p className="text-muted-foreground text-xs mt-1">
              <Link href="/dashboard/bills?status=pending" className="hover:underline">
                View pending bills
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRules}</div>
            <p className="text-muted-foreground text-xs mt-1">
              <Link href="/dashboard/rules" className="hover:underline">
                Manage rules
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bills Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Bills Overview</CardTitle>
          <CardDescription>Status breakdown of all bills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="text-muted-foreground text-sm">Total Bills</div>
                <div className="text-2xl font-bold">{stats.totalBills}</div>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="text-muted-foreground text-sm">Processing</div>
                <div className="text-2xl font-bold">{stats.processingBills}</div>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="text-muted-foreground text-sm">Processed</div>
                <div className="text-2xl font-bold">{stats.processedBills}</div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <div className="text-muted-foreground text-sm">Errors</div>
                <div className="text-2xl font-bold">{stats.errorBills}</div>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/bills">
              <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                View all bills →
              </Badge>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Invoices & Payables */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bills with Invoice Data</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.billsWithInvoices}</div>
            <p className="text-muted-foreground text-xs mt-1">
              Bills containing tenant-chargeable items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bills with Payable Data</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.billsWithPayables}</div>
            <p className="text-muted-foreground text-xs mt-1">
              Bills containing landlord-payable items
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

