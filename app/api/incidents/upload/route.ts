import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { uploadIncidentAttachmentAction } from "@/actions/incidents-actions"
import { uploadPDFToSupabase } from "@/lib/storage/supabase-storage"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const incidentId = formData.get("incidentId") as string

    if (!file || !incidentId) {
      return NextResponse.json(
        { error: "Missing required fields: file, incidentId" },
        { status: 400 }
      )
    }

    // Validate file type (images or PDFs)
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    const isImage = allowedTypes.slice(0, 3).includes(file.type)
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")

    if (!isImage && !isPDF) {
      return NextResponse.json(
        { error: "Only image files (JPEG, PNG) or PDF files are allowed" },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    // Upload file to Supabase storage
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `incidents/${incidentId}/${timestamp}-${sanitizedFileName}`

    let fileUrl: string
    try {
      fileUrl = await uploadPDFToSupabase(file, filePath)
    } catch (error) {
      console.error("Error uploading file to Supabase:", error)
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      )
    }

    // Create incident attachment record
    const fileType = isPDF ? "pdf" : "image"
    const result = await uploadIncidentAttachmentAction({
      incidentId,
      fileUrl,
      fileName: file.name,
      fileType
    })

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      attachment: result.data
    })
  } catch (error) {
    console.error("Error uploading incident attachment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

