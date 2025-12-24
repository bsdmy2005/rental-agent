"use server"

import { sendInvoiceEmailAction } from "@/lib/email/invoice-email-service"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await sendInvoiceEmailAction(id)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.message || "Failed to send invoice" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data
    })
  } catch (error) {
    console.error("Error in send invoice route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

