import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createRuleSampleAction } from "@/actions/rule-samples-actions"
import { uploadPDFToSupabase } from "@/lib/storage/supabase-storage"
import { getExtractionRuleByIdQuery } from "@/queries/extraction-rules-queries"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ruleId } = await params
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
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

    // Verify rule exists
    const rule = await getExtractionRuleByIdQuery(ruleId)
    if (!rule) {
      return NextResponse.json({ error: "Extraction rule not found" }, { status: 404 })
    }

    // Upload PDF to Supabase storage
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `rules/${ruleId}/samples/${timestamp}-${sanitizedFileName}`

    let fileUrl: string
    try {
      fileUrl = await uploadPDFToSupabase(file, filePath)
    } catch (error) {
      console.error("Error uploading PDF to Supabase:", error)
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      )
    }

    // Create rule sample record
    const result = await createRuleSampleAction({
      extractionRuleId: ruleId,
      fileName: file.name,
      fileUrl
    })

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("Error uploading rule sample:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

