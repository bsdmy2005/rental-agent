import { NextRequest, NextResponse } from "next/server"
import { submitPublicIncidentAction } from "@/actions/incidents-actions"
import { uploadIncidentAttachmentAction } from "@/actions/incidents-actions"
import { uploadPDFToSupabase } from "@/lib/storage/supabase-storage"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract incident data
    const propertyId = formData.get("propertyId") as string
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const priority = formData.get("priority") as string
    const submittedName = formData.get("submittedName") as string | null
    const submittedPhone = formData.get("submittedPhone") as string | null
    const tenantId = formData.get("tenantId") as string | null

    // Validate required fields
    if (!propertyId || !title || !description || !priority) {
      return NextResponse.json(
        { error: "Missing required fields: propertyId, title, description, priority" },
        { status: 400 }
      )
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "urgent"]
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: "Invalid priority value" },
        { status: 400 }
      )
    }

    // Submit incident
    const result = await submitPublicIncidentAction({
      propertyId,
      title,
      description,
      priority: priority as "low" | "medium" | "high" | "urgent",
      submittedName: submittedName || undefined,
      submittedPhone: submittedPhone || undefined,
      tenantId: tenantId || undefined
    })

    if (!result.isSuccess || !result.data) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      )
    }

    const incidentId = result.data.id

    // Handle file uploads if any
    const files = formData.getAll("files") as File[]
    if (files.length > 0) {
      for (const file of files) {
        if (file.size === 0) continue // Skip empty files

        try {
          // Validate file type (images only for now)
          const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
          if (!allowedTypes.includes(file.type)) {
            console.warn(`Skipping invalid file type: ${file.type}`)
            continue
          }

          // Validate file size (max 10MB)
          const maxSize = 10 * 1024 * 1024
          if (file.size > maxSize) {
            console.warn(`Skipping file exceeding size limit: ${file.name}`)
            continue
          }

          // Upload to Supabase
          const timestamp = Date.now()
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
          const filePath = `incidents/${incidentId}/${timestamp}-${sanitizedFileName}`

          const fileUrl = await uploadPDFToSupabase(file, filePath)

          // Create attachment record
          const fileType = file.type.startsWith("image/") ? "image" : "pdf"
          await uploadIncidentAttachmentAction({
            incidentId,
            fileUrl,
            fileName: file.name,
            fileType
          })
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error)
          // Continue with other files even if one fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Incident submitted successfully",
      data: {
        incidentId: result.data.id,
        referenceNumber: `INC-${result.data.id.slice(0, 8).toUpperCase()}`
      }
    })
  } catch (error) {
    console.error("Error submitting public incident:", error)
    return NextResponse.json(
      { error: "Failed to submit incident" },
      { status: 500 }
    )
  }
}

