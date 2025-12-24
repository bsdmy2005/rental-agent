"use server"

import { generateInvoicePDFAction } from "@/lib/invoice-pdf-generator"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get template parameter from query string (optional)
    const { searchParams } = new URL(request.url)
    const templateParam = searchParams.get("template") as "classic" | "modern" | "minimal" | null

    const result = await generateInvoicePDFAction(id, templateParam || undefined)

    if (!result.isSuccess || !result.data) {
      return NextResponse.json(
        { error: result.message || "Failed to generate PDF" },
        { status: 400 }
      )
    }

    // Return PDF with proper headers
    return new NextResponse(result.data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${id}.pdf"`,
        "Cache-Control": "public, max-age=3600" // Cache for 1 hour
      }
    })
  } catch (error) {
    console.error("Error in PDF route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

