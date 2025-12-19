import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getBillByIdQuery } from "@/queries/bills-queries"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { billId } = await params
    const bill = await getBillByIdQuery(billId)

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 })
    }

    return NextResponse.json({
      status: bill.status,
      hasInvoiceData: !!bill.invoiceExtractionData,
      hasPaymentData: !!bill.paymentExtractionData
    })
  } catch (error) {
    console.error("Error fetching bill status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

