import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { extractExpenseFromReceipt } from "@/lib/expense-extraction"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    // Validate file type (images or PDFs)
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf"
    ]
    const isValidType =
      allowedTypes.includes(file.type) ||
      file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|pdf)$/i)

    if (!isValidType) {
      return NextResponse.json(
        { error: "Only image files (JPEG, PNG, GIF, WEBP) or PDF files are allowed" },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Extract expense data using AI
    try {
      const extractedData = await extractExpenseFromReceipt(fileBuffer, file.name)

      return NextResponse.json({
        success: true,
        data: extractedData
      })
    } catch (extractionError) {
      console.error("Error extracting expense data:", extractionError)
      return NextResponse.json(
        {
          error: "Failed to extract expense data",
          details: extractionError instanceof Error ? extractionError.message : "Unknown error"
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error processing expense extraction:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

