import { NextRequest, NextResponse } from "next/server"
import { extractLeaseDatesFromPDF } from "@/lib/lease-extraction"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract tenant data from lease
    const extractedData = await extractLeaseDatesFromPDF(buffer, file.name)

    return NextResponse.json({
      success: true,
      data: extractedData
    })
  } catch (error) {
    console.error("Error extracting tenant data from lease:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to extract tenant data from lease"
      },
      { status: 500 }
    )
  }
}

