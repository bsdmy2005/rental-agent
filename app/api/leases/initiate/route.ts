import { NextRequest, NextResponse } from "next/server"
import { initiateLeaseAction } from "@/actions/lease-initiation-actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.propertyId || !body.leaseStartDate || !body.leaseEndDate || !body.monthlyRental) {
      return NextResponse.json(
        { error: "Missing required fields: propertyId, leaseStartDate, leaseEndDate, monthlyRental" },
        { status: 400 }
      )
    }

    // Convert date strings to Date objects
    const data = {
      ...body,
      leaseStartDate: new Date(body.leaseStartDate),
      leaseEndDate: new Date(body.leaseEndDate)
    }

    const result = await initiateLeaseAction(data)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data
    })
  } catch (error) {
    console.error("Error in lease initiation API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

