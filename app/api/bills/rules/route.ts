import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getActiveExtractionRulesQuery } from "@/queries/extraction-rules-queries"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get("propertyId")
    const billType = searchParams.get("billType")

    if (!propertyId || !billType) {
      return NextResponse.json(
        { error: "Missing required parameters: propertyId, billType" },
        { status: 400 }
      )
    }

    const rules = await getActiveExtractionRulesQuery(
      propertyId,
      billType as "municipality" | "levy" | "utility" | "other"
    )

    // Format rules for frontend
    const formattedRules = rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      extractForInvoice: rule.extractForInvoice,
      extractForPayment: rule.extractForPayment,
      description: `${rule.extractForInvoice ? "Invoice" : ""}${
        rule.extractForInvoice && rule.extractForPayment ? " + " : ""
      }${rule.extractForPayment ? "Payment" : ""} extraction`
    }))

    return NextResponse.json({ rules: formattedRules })
  } catch (error) {
    console.error("Error fetching extraction rules:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

