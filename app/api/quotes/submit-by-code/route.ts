import { NextRequest, NextResponse } from "next/server"
import { submitQuoteByCodeAction } from "@/actions/service-providers-actions"

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const code = formData.get("code") as string
    const amount = formData.get("amount") as string
    const description = formData.get("description") as string
    const estimatedCompletionDate = formData.get("estimatedCompletionDate") as string | null
    const pdfFile = formData.get("pdf") as File | null

    if (!code) {
      return NextResponse.json({ error: "RFQ code is required" }, { status: 400 })
    }

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 })
    }

    // Process PDF if provided
    let pdfBuffer: Buffer | undefined
    let fileName: string | undefined

    if (pdfFile && pdfFile.size > 0) {
      const arrayBuffer = await pdfFile.arrayBuffer()
      pdfBuffer = Buffer.from(arrayBuffer)
      fileName = pdfFile.name
    }

    // Parse date if provided
    let completionDate: Date | undefined
    if (estimatedCompletionDate) {
      completionDate = new Date(estimatedCompletionDate)
      if (isNaN(completionDate.getTime())) {
        return NextResponse.json({ error: "Invalid completion date format" }, { status: 400 })
      }
    }

    // Submit quote
    const result = await submitQuoteByCodeAction(code, {
      amount,
      description: description || undefined,
      estimatedCompletionDate: completionDate,
      pdfBuffer,
      fileName
    })

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: { quoteId: result.data?.id }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Submit Quote API] Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

