import { NextRequest, NextResponse } from "next/server"
import { extractQuoteFromPDF } from "@/lib/quote-extraction"

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const pdfFile = formData.get("pdf") as File | null

    if (!pdfFile || pdfFile.size === 0) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 })
    }

    // Validate file type
    if (!pdfFile.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await pdfFile.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)

    // Extract quote data
    const extractedData = await extractQuoteFromPDF(pdfBuffer, pdfFile.name)

    return NextResponse.json(
      {
        success: true,
        data: extractedData
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Quote Extract API] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to extract quote data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

