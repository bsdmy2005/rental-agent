import { NextResponse } from "next/server"
import { getLeaseTemplatesAction } from "@/actions/lease-templates-actions"

export async function GET() {
  try {
    const result = await getLeaseTemplatesAction()

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      templates: result.data || []
    })
  } catch (error) {
    console.error("Error in lease templates API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

