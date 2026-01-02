import { NextRequest, NextResponse } from "next/server"
import { signLeaseAsLandlordAction } from "@/actions/lease-initiation-actions"

// This route handles authenticated landlord signing (backward compatibility)
// For token-based signing, use /api/leases/[leaseId]/sign/landlord/token

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params
    const body = await request.json()

    if (!body.signatureData) {
      return NextResponse.json(
        { error: "Missing required field: signatureData" },
        { status: 400 }
      )
    }

    const result = await signLeaseAsLandlordAction(leaseId, body.signatureData)

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
    console.error("Error in landlord signing API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

