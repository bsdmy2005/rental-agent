"use server"

import { getAllUserProfilesQuery } from "@/queries/user-profiles-queries"

export async function AdminStats() {
  const allUsers = await getAllUserProfilesQuery()

  const stats = {
    totalUsers: allUsers.length,
    landlords: allUsers.filter((u) => u.userType === "landlord").length,
    rentalAgents: allUsers.filter((u) => u.userType === "rental_agent").length,
    tenants: allUsers.filter((u) => u.userType === "tenant").length,
    activeUsers: allUsers.filter((u) => u.isActive).length
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-lg border p-4">
        <div className="text-muted-foreground text-sm">Total Users</div>
        <div className="text-2xl font-bold">{stats.totalUsers}</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-muted-foreground text-sm">Landlords</div>
        <div className="text-2xl font-bold">{stats.landlords}</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-muted-foreground text-sm">Rental Agents</div>
        <div className="text-2xl font-bold">{stats.rentalAgents}</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-muted-foreground text-sm">Tenants</div>
        <div className="text-2xl font-bold">{stats.tenants}</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-muted-foreground text-sm">Active Users</div>
        <div className="text-2xl font-bold">{stats.activeUsers}</div>
      </div>
    </div>
  )
}

