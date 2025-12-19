import { NextRequest, NextResponse } from "next/server"
import { getBillingSchedulesForPropertyAction } from "@/actions/billing-schedules-actions"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get("propertyId")

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 })
    }

    const result = await getBillingSchedulesForPropertyAction(propertyId)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({ schedules: result.data })
  } catch (error) {
    console.error("Error fetching billing schedules:", error)
    return NextResponse.json({ error: "Failed to fetch billing schedules" }, { status: 500 })
  }
}

