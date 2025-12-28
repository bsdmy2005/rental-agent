import { NextResponse } from "next/server"
import { getTenantsByPropertyIdQuery } from "@/queries/tenants-queries"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params
    
    const tenants = await getTenantsByPropertyIdQuery(propertyId)

    return NextResponse.json(tenants)
  } catch (error) {
    console.error("Error fetching tenants:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

