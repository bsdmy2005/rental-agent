import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createBillAction, processBillAction } from "@/actions/bills-actions"
import { uploadPDFToSupabase } from "@/lib/storage/supabase-storage"
import { getExtractionRulesByPropertyIdQuery } from "@/queries/extraction-rules-queries"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const propertyId = formData.get("propertyId") as string
    const billType = formData.get("billType") as string
    const source = formData.get("source") as string || "manual_upload"
    const ruleId = formData.get("ruleId") as string | null // Explicitly selected rule for manual uploads
    const billingYearStr = formData.get("billingYear") as string | null
    const billingMonthStr = formData.get("billingMonth") as string | null

    if (!file || !propertyId || !billType) {
      return NextResponse.json(
        { error: "Missing required fields: file, propertyId, billType" },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    // Upload PDF to Supabase storage
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `bills/${propertyId}/${timestamp}-${sanitizedFileName}`
    
    let fileUrl: string
    try {
      fileUrl = await uploadPDFToSupabase(file, filePath)
    } catch (error) {
      console.error("Error uploading PDF to Supabase:", error)
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      )
    }

    // For manual uploads, use the explicitly selected rule
    // For email uploads, rules are matched in processBillAction based on email filters
    let extractionRuleId: string | null = null
    
    if (source === "manual_upload" && ruleId) {
      // Validate that the selected rule exists and matches property/bill type
      const { getExtractionRuleByIdQuery } = await import("@/queries/extraction-rules-queries")
      const selectedRule = await getExtractionRuleByIdQuery(ruleId)
      
      if (!selectedRule) {
        return NextResponse.json({ error: "Selected extraction rule not found" }, { status: 400 })
      }
      
      if (selectedRule.propertyId !== propertyId) {
        return NextResponse.json(
          { error: "Selected rule does not belong to the selected property" },
          { status: 400 }
        )
      }
      
      if (selectedRule.billType !== billType) {
        return NextResponse.json(
          { error: "Selected rule does not match the selected bill type" },
          { status: 400 }
        )
      }
      
      if (!selectedRule.isActive) {
        return NextResponse.json(
          { error: "Selected rule is not active" },
          { status: 400 }
        )
      }
      
      extractionRuleId = ruleId
    } else if (source === "manual_upload") {
      // For manual uploads without explicit rule selection, try to find a default rule
      // This is a fallback for when no rules exist or user didn't select one
      const allRules = await getExtractionRulesByPropertyIdQuery(propertyId)
      const activeRules = allRules.filter(
        (r) => r.isActive && r.billType === billType
      )
      
      // Find rules for each output type
      const ruleExtractingBoth = activeRules.find(
        (r) => r.extractForInvoice && r.extractForPayment
      )
      const invoiceRule = ruleExtractingBoth || activeRules.find((r) => r.extractForInvoice) || null
      const paymentRule = ruleExtractingBoth || activeRules.find((r) => r.extractForPayment) || null
      
      // Use invoice rule if available, otherwise payment rule
      extractionRuleId = invoiceRule?.id || paymentRule?.id || null
    }
    // For email uploads, extractionRuleId remains null - matching happens in processBillAction

    // Parse billing period if provided (user-provided values are authoritative)
    const billingYear = billingYearStr ? parseInt(billingYearStr, 10) : undefined
    const billingMonth = billingMonthStr ? parseInt(billingMonthStr, 10) : undefined

    // Validate billing period if provided
    if (billingYear !== undefined && (billingYear < 2020 || billingYear > 2100)) {
      return NextResponse.json({ error: "Invalid billing year" }, { status: 400 })
    }
    if (billingMonth !== undefined && (billingMonth < 1 || billingMonth > 12)) {
      return NextResponse.json({ error: "Invalid billing month" }, { status: 400 })
    }

    // Create bill record
    const result = await createBillAction({
      propertyId,
      billType: billType as "municipality" | "levy" | "utility" | "other",
      source: source as "email" | "manual_upload",
      fileName: file.name,
      fileUrl,
      status: "pending",
      extractionRuleId,
      billingYear: billingYear !== undefined ? billingYear : null,
      billingMonth: billingMonth !== undefined ? billingMonth : null
    })

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    // Trigger async processing (don't await)
    if (result.data) {
      processBillAction(result.data.id).catch((error) => {
        console.error(`Failed to process bill ${result.data?.id}:`, error)
      })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("Error uploading bill:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

