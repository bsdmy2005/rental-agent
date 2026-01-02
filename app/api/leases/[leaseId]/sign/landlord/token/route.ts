import { NextRequest, NextResponse } from "next/server"
import { signLeaseAsLandlordViaTokenAction } from "@/actions/lease-initiation-actions"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params
    const body = await request.json()

    if (!body.token || !body.signatureData) {
      return NextResponse.json(
        { error: "Missing required fields: token, signatureData" },
        { status: 400 }
      )
    }

    const result = await signLeaseAsLandlordViaTokenAction(leaseId, body.token, body.signatureData)

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
    console.error("Error in landlord token signing API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

