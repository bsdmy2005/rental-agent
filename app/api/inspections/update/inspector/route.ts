import { NextRequest, NextResponse } from "next/server"
import { updateInspectionByInspectorAction } from "@/actions/moving-inspections-actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.token || !body.itemId || (!body.condition && body.notes === undefined && body.confirmedAsPrevious === undefined)) {
      return NextResponse.json(
        { error: "Missing required fields: token, itemId, and at least one of condition, notes, or confirmedAsPrevious" },
        { status: 400 }
      )
    }

    const result = await updateInspectionByInspectorAction(body.token, body.itemId, {
      condition: body.condition,
      notes: body.notes,
      confirmedAsPrevious: body.confirmedAsPrevious
    })

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data
    })
  } catch (error) {
    console.error("Error in inspector update API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

