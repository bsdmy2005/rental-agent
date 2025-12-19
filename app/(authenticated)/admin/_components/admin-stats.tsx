"use server"

import { getSystemStatsQuery, getRecentBillsQuery, getFailedBillsQuery } from "@/queries/admin-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export async function AdminStats() {
  const stats = await getSystemStatsQuery()
  const recentBills = await getRecentBillsQuery(5)
  const failedBills = await getFailedBillsQuery()

  return (
    <div className="space-y-6">
      {/* System Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-muted-foreground text-xs">
              {stats.usersByType.landlord} landlords • {stats.usersByType.rental_agent} agents •{" "}
              {stats.usersByType.tenant} tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-muted-foreground text-xs">Properties managed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
            <p className="text-muted-foreground text-xs">Active tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBills}</div>
            <p className="text-muted-foreground text-xs">
              {stats.billsByStatus.processed} processed • {stats.billsByStatus.error} errors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Processing Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Extraction Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExtractionRules}</div>
            <p className="text-muted-foreground text-xs">
              {stats.activeExtractionRules} active rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Processing Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingSuccessRate}%</div>
            <p className="text-muted-foreground text-xs">
              {stats.billsByStatus.processed} successful • {stats.billsByStatus.error} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bill Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Pending</span>
                <span className="font-medium">{stats.billsByStatus.pending}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Processing</span>
                <span className="font-medium">{stats.billsByStatus.processing}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Processed</span>
                <span className="font-medium text-green-600">{stats.billsByStatus.processed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Error</span>
                <span className="font-medium text-red-600">{stats.billsByStatus.error}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
            <CardDescription>Latest bills processed</CardDescription>
          </CardHeader>
          <CardContent>
            {recentBills.length === 0 ? (
              <p className="text-muted-foreground text-sm">No bills yet</p>
            ) : (
              <div className="space-y-2">
                {recentBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{bill.fileName}</span>
                    <Badge
                      variant={
                        bill.status === "processed"
                          ? "default"
                          : bill.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {bill.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failed Bills</CardTitle>
            <CardDescription>Bills that failed processing</CardDescription>
          </CardHeader>
          <CardContent>
            {failedBills.length === 0 ? (
              <p className="text-muted-foreground text-sm">No failed bills</p>
            ) : (
              <div className="space-y-2">
                {failedBills.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{bill.fileName}</span>
                    <Badge variant="destructive">Error</Badge>
                  </div>
                ))}
                {failedBills.length > 5 && (
                  <p className="text-muted-foreground text-xs">
                    +{failedBills.length - 5} more failed bills
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
