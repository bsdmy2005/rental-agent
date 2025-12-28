import { NextResponse } from "next/server"
import { db } from "@/db"
import { leaseAgreementsTable, tenantsTable, propertiesTable } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params
    
    // Get lease with manual joins
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, leaseId))
      .limit(1)

    if (!lease) {
      return NextResponse.json(
        { error: "Lease not found" },
        { status: 404 }
      )
    }

    // Get tenant and property
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, lease.tenantId))
      .limit(1)

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    return NextResponse.json({
      ...lease,
      tenant: tenant || null,
      property: property || null
    })
  } catch (error) {
    console.error("Error in lease API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
