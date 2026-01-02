import { NextResponse } from "next/server"
import { getLeaseTemplateByIdAction } from "@/actions/lease-templates-actions"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params
    const result = await getLeaseTemplateByIdAction(templateId)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.message },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      template: result.data
    })
  } catch (error) {
    console.error("Error in lease template API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

