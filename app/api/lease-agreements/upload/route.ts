import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { uploadLeaseAgreementAction } from "@/actions/lease-agreements-actions"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userProfile = await getUserProfileByClerkIdQuery(userId)
    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const tenantId = formData.get("tenantId") as string
    const propertyId = formData.get("propertyId") as string

    if (!file || !tenantId || !propertyId) {
      return NextResponse.json(
        { error: "Missing required fields: file, tenantId, propertyId" },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Upload lease agreement
    const result = await uploadLeaseAgreementAction(tenantId, propertyId, fileBuffer, file.name)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    // Link lease agreement to tenant
    try {
      const { linkLeaseAgreementToTenantAction } = await import("@/actions/tenants-actions")
      await linkLeaseAgreementToTenantAction(tenantId, result.data.id)
    } catch (linkError) {
      console.error("Error linking lease agreement to tenant:", linkError)
      // Don't fail the upload if linking fails
    }

    return NextResponse.json({
      success: true,
      leaseAgreement: result.data
    })
  } catch (error) {
    console.error("Error uploading lease agreement:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

