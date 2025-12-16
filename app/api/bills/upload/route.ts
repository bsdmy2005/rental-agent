import { NextRequest, NextResponse } from "next/server"
import { createBillAction } from "@/actions/bills-actions"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const propertyId = formData.get("propertyId") as string
    const billType = formData.get("billType") as string
    const source = formData.get("source") as string

    if (!file || !propertyId || !billType || !source) {
      return NextResponse.json(
        { error: "Missing required fields: file, propertyId, billType, source" },
        { status: 400 }
      )
    }

    // TODO: Upload file to storage (Vercel Blob or S3)
    // For now, we'll just create a placeholder
    const fileUrl = `placeholder-url-for-${file.name}`

    const result = await createBillAction({
      propertyId,
      billType: billType as "municipality" | "levy" | "utility" | "other",
      source: source as "email" | "manual_upload",
      fileName: file.name,
      fileUrl,
      status: "pending"
    })

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("Error uploading bill:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

