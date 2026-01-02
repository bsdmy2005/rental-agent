import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { uploadInspectionItemImageAction } from "@/actions/inspection-attachments-actions"
import { uploadImageToSupabase } from "@/lib/storage/supabase-storage"
import { db } from "@/db"
import { movingInspectionsTable } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const itemId = formData.get("itemId") as string
    const inspectionId = formData.get("inspectionId") as string
    const inspectorToken = formData.get("inspectorToken") as string | null

    // Allow either authenticated user OR inspector token
    const { userId } = await auth()
    let isAuthorized = !!userId

    // If no authenticated user, check for inspector token
    if (!isAuthorized && inspectorToken) {
      const [inspection] = await db
        .select()
        .from(movingInspectionsTable)
        .where(eq(movingInspectionsTable.inspectorAccessToken, inspectorToken))
        .limit(1)
      
      if (inspection && !inspection.signedByInspector) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!file || !itemId || !inspectionId) {
      return NextResponse.json(
        { error: "Missing required fields: file, itemId, inspectionId" },
        { status: 400 }
      )
    }

    // Validate file type (images only)
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    const isImage = allowedTypes.includes(file.type) || 
      /\.(jpg|jpeg|png|webp)$/i.test(file.name)

    if (!isImage) {
      return NextResponse.json(
        { error: "Only image files (JPEG, PNG, WebP) are allowed" },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB per image)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 })
    }

    // Upload file to Supabase storage
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `inspections/${inspectionId}/${itemId}/${timestamp}-${sanitizedFileName}`

    let fileUrl: string
    try {
      fileUrl = await uploadImageToSupabase(file, filePath)
    } catch (error) {
      console.error("Error uploading image to Supabase:", error)
      return NextResponse.json(
        { error: "Failed to upload image to storage" },
        { status: 500 }
      )
    }

    // Create inspection attachment record
    const result = await uploadInspectionItemImageAction({
      itemId,
      inspectionId,
      fileUrl,
      fileName: file.name,
      fileType: file.type.startsWith("image/") ? file.type.split("/")[1] : "jpeg",
      skipAuth: !!inspectorToken // Skip auth if using inspector token
    })

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      attachment: result.data
    })
  } catch (error) {
    console.error("Error uploading inspection image:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

