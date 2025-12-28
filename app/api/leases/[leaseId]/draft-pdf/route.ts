import { NextResponse } from "next/server"
import { generateLeasePDFFromIdAction } from "@/lib/lease-pdf-generator"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params
    
    const result = await generateLeasePDFFromIdAction(leaseId, false)

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
        "Content-Disposition": `inline; filename="lease-${leaseId}-draft.pdf"`,
        "Cache-Control": "public, max-age=3600"
      }
    })
  } catch (error) {
    console.error("Error in draft PDF route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

