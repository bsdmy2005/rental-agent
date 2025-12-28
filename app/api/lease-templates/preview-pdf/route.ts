import { NextRequest, NextResponse } from "next/server"
import { renderToStream } from "@react-pdf/renderer"
import React from "react"
import { TemplateBasedPDF } from "@/lib/lease-pdf-component"
import type { TemplateSection } from "@/lib/utils/template-helpers"

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sections } = body

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json({ error: "Sections array is required" }, { status: 400 })
    }

    // Sample data for preview
    const sampleLeaseData = {
      propertyAddress: "456 Oak Avenue, Sandton, Gauteng",
      propertyType: "Apartment",
      landlordName: "Jane Smith",
      landlordIdNumber: "8002025800086",
      landlordAddress: "123 Landlord Street, Johannesburg",
      landlordEmail: "jane.smith@example.com",
      landlordPhone: "+27 83 987 6543",
      landlordBankDetails: {
        bankName: "Standard Bank",
        accountHolderName: "Jane Smith",
        accountNumber: "1234567890",
        branchCode: "051001"
      },
      tenantName: "John Doe",
      tenantIdNumber: "9001015800085",
      tenantEmail: "john.doe@example.com",
      tenantPhone: "+27 82 123 4567",
      tenantAddress: "123 Main Street, Cape Town",
      leaseStartDate: new Date("2024-01-01"),
      leaseEndDate: new Date("2024-12-31"),
      leaseDate: new Date(),
      monthlyRental: 15000,
      depositAmount: 30000,
      paymentMethod: "EFT",
      escalationType: "percentage" as const,
      escalationPercentage: 5,
      isDraft: true
    }

    // Sort sections by order
    const sortedSections = [...sections].sort((a, b) => {
      const orderA = a.order ?? 999
      const orderB = b.order ?? 999
      return orderA - orderB
    })

    const pdfDoc = React.createElement(TemplateBasedPDF, {
      data: sampleLeaseData,
      templateSections: sortedSections
    })
    
    const stream = await renderToStream(pdfDoc)
    
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      return NextResponse.json({ error: "Failed to generate PDF buffer" }, { status: 500 })
    }

    // Convert buffer to base64 for transmission
    const base64 = pdfBuffer.toString("base64")

    return NextResponse.json({
      success: true,
      pdf: base64,
      mimeType: "application/pdf"
    })
  } catch (error) {
    console.error("Error generating PDF preview:", error)
    return NextResponse.json(
      {
        error: "Failed to generate PDF preview",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

