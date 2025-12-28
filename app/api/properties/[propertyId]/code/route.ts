import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { generatePropertyCodeAction, getPropertyCodeAction, deactivatePropertyCodeAction } from "@/actions/property-codes-actions"
import { getPropertyByIdQuery } from "@/queries/properties-queries"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { propertyId } = await params
    const result = await getPropertyCodeAction(propertyId)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    console.error("Error getting property code:", error)
    return NextResponse.json(
      { error: "Failed to get property code" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { propertyId } = await params
    
    // Verify user has access to this property
    const property = await getPropertyByIdQuery(propertyId)
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    const body = await request.json()
    const { expiresAt } = body

    const result = await generatePropertyCodeAction(
      propertyId,
      userId,
      expiresAt ? new Date(expiresAt) : undefined
    )

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })
  } catch (error) {
    console.error("Error generating property code:", error)
    return NextResponse.json(
      { error: "Failed to generate property code" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { propertyId } = await params
    const body = await request.json()
    const { codeId } = body

    if (!codeId) {
      return NextResponse.json(
        { error: "codeId is required" },
        { status: 400 }
      )
    }

    const result = await deactivatePropertyCodeAction(codeId)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })
  } catch (error) {
    console.error("Error deactivating property code:", error)
    return NextResponse.json(
      { error: "Failed to deactivate property code" },
      { status: 500 }
    )
  }
}

