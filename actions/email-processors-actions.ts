"use server"

import { db } from "@/db"
import {
  emailProcessorsTable,
  userProfilesTable,
  type InsertEmailProcessor,
  type SelectEmailProcessor
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export interface PostmarkWebhookPayload {
  MessageID: string
  From: string
  FromName?: string
  FromFull?: {
    Email?: string
    Name?: string
    MailboxHash?: string
  }
  To?: string // May be "Name" <email@domain.com> format or Postmark inbound address
  ToFull?: Array<{ Email?: string; MailboxHash?: string; Name?: string; Method?: string }>
  Recipient?: string // Alternative field name Postmark might use
  OriginalRecipient?: string
  Subject?: string
  Date?: string // Postmark sends Date field (RFC 2822 format)
  ReceivedAt?: string // May be missing
  MailboxHash?: string // Top-level MailboxHash if present
  MessageStream?: string // Usually "inbound"
  Attachments?: Array<{
    Name: string
    Content: string // Base64-encoded content (should be present per Postmark docs)
    ContentType: string
    ContentLength?: number
    ContentID?: string
  }>
  TextBody?: string // Email body as plain text
  HtmlBody?: string // Email body as HTML
  StrippedTextReply?: string // Parsed reply text (if applicable)
  // Additional Postmark fields that might be present
  [key: string]: unknown
}

export async function createEmailProcessorAction(
  processor: InsertEmailProcessor
): Promise<ActionState<SelectEmailProcessor>> {
  try {
    const [newProcessor] = await db.insert(emailProcessorsTable).values(processor).returning()

    if (!newProcessor) {
      return { isSuccess: false, message: "Failed to create email processor" }
    }

    return {
      isSuccess: true,
      message: "Email processor created successfully",
      data: newProcessor
    }
  } catch (error) {
    console.error("Error creating email processor:", error)
    return { isSuccess: false, message: "Failed to create email processor" }
  }
}

export async function updateEmailProcessorAction(
  processorId: string,
  data: Partial<InsertEmailProcessor>
): Promise<ActionState<SelectEmailProcessor>> {
  try {
    const [updatedProcessor] = await db
      .update(emailProcessorsTable)
      .set(data)
      .where(eq(emailProcessorsTable.id, processorId))
      .returning()

    if (!updatedProcessor) {
      return { isSuccess: false, message: "Email processor not found" }
    }

    return {
      isSuccess: true,
      message: "Email processor updated successfully",
      data: updatedProcessor
    }
  } catch (error) {
    console.error("Error updating email processor:", error)
    return { isSuccess: false, message: "Failed to update email processor" }
  }
}

export async function processEmailWebhookAction(
  payload: PostmarkWebhookPayload
): Promise<ActionState<void>> {
  console.log("[Email Processing] ==========================================")
  console.log("[Email Processing] Starting email webhook processing...")
  
  try {
    // Validate payload structure
    if (!payload) {
      throw new Error("Payload is null or undefined")
    }
    if (!payload.MessageID) {
      throw new Error("Payload missing MessageID field")
    }
    if (!payload.From) {
      throw new Error("Payload missing From field")
    }
    const { parsePostmarkWebhook, matchEmailToRules } = await import("@/lib/email/postmark-parser")
    const { uploadPDFToSupabase } = await import("@/lib/storage/supabase-storage")
    const { downloadPDFFromUrl } = await import("@/lib/storage/url-downloader")
    const { selectRelevantFileFromLinks } = await import("@/lib/email/file-selector")
    const { getExtractionRulesByUserProfileIdQuery } = await import("@/queries/extraction-rules-queries")
    const { getLandlordByUserProfileIdQuery } = await import("@/queries/landlords-queries")
    const { getRentalAgentByUserProfileIdQuery } = await import("@/queries/rental-agents-queries")
    const { getPropertiesByLandlordIdQuery, getPropertiesByRentalAgentIdQuery } = await import("@/queries/properties-queries")
    const { createBillAction } = await import("@/actions/bills-actions")
    const { processBillAction } = await import("@/actions/bills-actions")

    // Step 1: Parse email to get basic info (from, subject)
    console.log("[Email Processing] Step 1: Parsing email to extract basic info...")
    const tempParsed = await parsePostmarkWebhook(payload)
    console.log("[Email Processing]   From:", tempParsed.from)
    console.log("[Email Processing]   Subject:", tempParsed.subject || "(no subject)")
    
    // Step 2: Match email against ALL active email_forward rules (not user-specific)
    console.log("[Email Processing] Step 2: Matching email against all email_forward rules...")
    const { extractionRulesTable } = await import("@/db/schema")
    const { eq, and } = await import("drizzle-orm")
    
    // Get all active rules with email_forward channel
    const allEmailRules = await db
      .select()
      .from(extractionRulesTable)
      .where(
        and(
          eq(extractionRulesTable.channel, "email_forward"),
          eq(extractionRulesTable.isActive, true)
        )
      )
    
    console.log(`[Email Processing]   Found ${allEmailRules.length} active email_forward rule(s)`)
    
    if (allEmailRules.length === 0) {
      console.warn("[Email Processing] ✗ No active email_forward rules found in system")
      console.log("[Email Processing] ==========================================")
      return {
        isSuccess: true,
        message: "No active email_forward rules found. Email ignored.",
        data: undefined
      }
    }
    
    // Match email to rules
    const { invoiceRule, paymentRule } = matchEmailToRules(
      tempParsed.from,
      tempParsed.subject,
      allEmailRules.map((r) => ({
        id: r.id,
        emailFilter: r.emailFilter as Record<string, unknown> | null,
        propertyId: r.propertyId,
        billType: r.billType,
        extractForInvoice: r.extractForInvoice,
        extractForPayment: r.extractForPayment
      }))
    )
    
    if (!invoiceRule && !paymentRule) {
      console.warn("[Email Processing] ✗ Email did not match any rules")
      console.log("[Email Processing]   Email from:", tempParsed.from)
      console.log("[Email Processing]   Email subject:", tempParsed.subject)
      console.log("[Email Processing] ==========================================")
      return {
        isSuccess: true,
        message: "Email did not match any extraction rules. Email ignored.",
        data: undefined
      }
    }
    
    // Get user profile from matched rule (rules are user-specific)
    const matchedRule = invoiceRule || paymentRule
    const matchedRuleFull = allEmailRules.find(r => r.id === matchedRule.id)
    
    if (!matchedRuleFull) {
      console.error("[Email Processing] ✗ Matched rule not found in full rules list")
      return {
        isSuccess: false,
        message: "Error: Matched rule not found"
      }
    }
    
    const userProfile = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, matchedRuleFull.userProfileId))
      .limit(1)
      .then(profiles => profiles[0] || null)
    
    if (!userProfile) {
      console.error(`[Email Processing] ✗ User profile not found for rule ${matchedRule.id}`)
      return {
        isSuccess: false,
        message: "Error: User profile not found for matched rule"
      }
    }
    
    console.log(`[Email Processing] ✓ Matched rule: ${matchedRuleFull.name} (ID: ${matchedRule.id})`)
    console.log(`[Email Processing] ✓ User profile: ${userProfile.email} (ID: ${userProfile.id})`)
    
    // Get email processing instruction from matched rule
    const emailProcessingInstruction = matchedRuleFull.emailProcessingInstruction || undefined
    
    if (emailProcessingInstruction) {
      console.log("[Email Processing] ✓ Found email processing instruction from matched rule")
    }

    // Parse webhook payload with instruction
    console.log("[Email Processing] Step 3: Parsing webhook payload with instruction...")
    const parsed = await parsePostmarkWebhook(payload, emailProcessingInstruction)
    console.log("[Email Processing] ✓ Parsed email data successfully")

    if (parsed.pdfAttachments.length === 0 && parsed.pdfLinks.length === 0) {
      // No PDF attachments, just create email processor record
      console.log("[Email Processing] No PDF attachments found, creating email processor record only...")
      await createEmailProcessorAction({
        userProfileId: userProfile.id,
        postmarkMessageId: parsed.messageId,
        from: parsed.from,
        subject: parsed.subject || null,
        receivedAt: parsed.receivedAt,
        hasAttachments: false,
        status: "processed"
      })
      console.log("[Email Processing] ✓ Email processor record created (no attachments)")
      console.log("[Email Processing] ==========================================")
      return {
        isSuccess: true,
        message: "Email processed (no PDF attachments)",
        data: undefined
      }
    }

    // Create email processor record
    console.log("[Email Processing] Step 4: Creating email processor record...")
    const processorResult = await createEmailProcessorAction({
      userProfileId: userProfile.id,
      postmarkMessageId: parsed.messageId,
      from: parsed.from,
      subject: parsed.subject || null,
      receivedAt: parsed.receivedAt,
      hasAttachments: parsed.pdfAttachments.length > 0 || parsed.pdfLinks.length > 0,
      status: "processing"
    })

    if (!processorResult.isSuccess || !processorResult.data) {
      console.error("[Email Processing] ✗ Failed to create email processor record")
      console.log("[Email Processing] ==========================================")
      return {
        isSuccess: false,
        message: "Failed to create email processor record"
      }
    }
    console.log(`[Email Processing] ✓ Email processor record created (ID: ${processorResult.data.id})`)

    // Get user's properties
    console.log("[Email Processing] Step 5: Fetching user properties...")
    let properties: Array<{ id: string; name: string }> = []
    if (userProfile.userType === "landlord") {
      console.log("[Email Processing]   User is a landlord, fetching landlord properties...")
      const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
      if (landlord) {
        console.log(`[Email Processing]   Found landlord record (ID: ${landlord.id})`)
        const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
        properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
        console.log(`[Email Processing]   Found ${properties.length} property(ies)`)
        properties.forEach((p) => {
          console.log(`[Email Processing]     - ${p.name} (ID: ${p.id})`)
        })
      } else {
        console.warn("[Email Processing]   ✗ No landlord record found for user profile")
      }
    } else if (userProfile.userType === "rental_agent") {
      console.log("[Email Processing]   User is a rental agent, fetching agent properties...")
      const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
      if (rentalAgent) {
        console.log(`[Email Processing]   Found rental agent record (ID: ${rentalAgent.id})`)
        const agentProperties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
        properties = agentProperties.map((p) => ({ id: p.id, name: p.name }))
        console.log(`[Email Processing]   Found ${properties.length} property(ies)`)
        properties.forEach((p) => {
          console.log(`[Email Processing]     - ${p.name} (ID: ${p.id})`)
        })
      } else {
        console.warn("[Email Processing]   ✗ No rental agent record found for user profile")
      }
    } else {
      console.warn(`[Email Processing]   ✗ Unknown user type: ${userProfile.userType}`)
    }

    if (properties.length === 0) {
      console.error("[Email Processing] ✗ User has no properties, cannot process email")
      await updateEmailProcessorAction(processorResult.data.id, {
        status: "error"
      })
      console.log("[Email Processing] ==========================================")
      return {
        isSuccess: false,
        message: "User has no properties"
      }
    }
    console.log(`[Email Processing] ✓ Found ${properties.length} property(ies)`)

    // Process PDFs from attachments and links
    console.log("[Email Processing] Step 6: Processing PDFs...")
    console.log(`[Email Processing]   Found ${parsed.pdfAttachments.length} PDF attachment(s)`)
    console.log(`[Email Processing]   Found ${parsed.pdfLinks.length} PDF link(s)`)
    
    // Collect all PDFs to process (from attachments and links)
    const pdfsToProcess: Array<{ name: string; content: Buffer }> = []
    
    // Process attachments
    for (const attachment of parsed.pdfAttachments) {
      pdfsToProcess.push({
        name: attachment.name,
        content: attachment.content
      })
    }
    
    // Process links
    if (parsed.pdfLinks.length > 0) {
      console.log("[Email Processing]   Processing PDF links...")
      
      try {
        // Get links with labels if available
        const linksWithLabels = parsed.pdfLinksWithLabels || parsed.pdfLinks.map(url => ({ url }))
        
        // If multiple links, use AI to select relevant ones
        let linksToDownload = parsed.pdfLinks
        if (parsed.pdfLinks.length > 1 && emailProcessingInstruction) {
          console.log("[Email Processing]     Multiple links found, using AI to select relevant ones...")
          const selectedLinks = await selectRelevantFileFromLinks(parsed.pdfLinks, emailProcessingInstruction)
          linksToDownload = Array.isArray(selectedLinks) ? selectedLinks : [selectedLinks]
          console.log(`[Email Processing]     ✓ Selected ${linksToDownload.length} link(s) from ${parsed.pdfLinks.length}`)
        }
        
        // Download PDFs from selected links
        for (let i = 0; i < linksToDownload.length; i++) {
          const linkUrl = linksToDownload[i]
          // Find the link with label if available
          const linkWithLabel = linksWithLabels.find(l => l.url === linkUrl)
          const linkLabel = linkWithLabel?.label
          
          console.log(`[Email Processing]     Downloading PDF ${i + 1}/${linksToDownload.length} from: ${linkUrl}`)
          if (linkLabel) {
            console.log(`[Email Processing]     Using link label as filename: "${linkLabel}"`)
          }
          try {
            const pdfBuffer = await downloadPDFFromUrl(linkUrl)
            // Use link label if available, otherwise extract from URL
            const fileName = linkLabel 
              ? (linkLabel.toLowerCase().endsWith(".pdf") ? linkLabel : `${linkLabel}.pdf`)
              : extractFileNameFromUrl(linkUrl) || `downloaded-${Date.now()}.pdf`
            pdfsToProcess.push({
              name: fileName,
              content: pdfBuffer
            })
            console.log(`[Email Processing]     ✓ Downloaded: ${fileName} (${pdfBuffer.length} bytes)`)
          } catch (error) {
            console.error(`[Email Processing]     ✗ Failed to download PDF from ${linkUrl}:`, error)
            // Continue with other links
          }
        }
      } catch (error) {
        console.error("[Email Processing]     ✗ Error processing links:", error)
        // Continue with attachments if link processing fails
      }
    }
    
    console.log(`[Email Processing]   Total PDFs to process: ${pdfsToProcess.length}`)
    
    // Helper function to extract filename from URL
    // Always ensures the filename has a .pdf extension for OpenAI compatibility
    function extractFileNameFromUrl(url: string): string {
      let fileName: string
      try {
        const urlObj = new URL(url)
        const pathname = urlObj.pathname
        fileName = pathname.split("/").pop() || ""
        fileName = fileName.split("?")[0] || url.split("/").pop()?.split("?")[0] || "unknown"
      } catch {
        const match = url.match(/\/([^\/\?]+\.pdf)/i)
        fileName = match ? match[1] : `downloaded-${Date.now()}`
      }
      
      // Ensure filename has .pdf extension (required by OpenAI)
      if (!fileName.toLowerCase().endsWith(".pdf")) {
        // Remove any existing extension and add .pdf
        const nameWithoutExt = fileName.split(".").slice(0, -1).join(".") || fileName
        fileName = `${nameWithoutExt}.pdf`
      }
      
      return fileName
    }
    
    // Process each PDF
    console.log("[Email Processing] Step 7: Processing PDFs...")
    
    for (let i = 0; i < pdfsToProcess.length; i++) {
      const pdf = pdfsToProcess[i]
      console.log(`[Email Processing]   Processing PDF ${i + 1}/${pdfsToProcess.length}: ${pdf.name}`)
      
      // Determine property (use first property if no rule match, or rule's property)
      const propertyId =
        invoiceRule?.propertyId || paymentRule?.propertyId || properties[0].id
      const propertyName = properties.find((p) => p.id === propertyId)?.name || "Unknown"
      console.log(`[Email Processing]     Selected property: ${propertyName} (ID: ${propertyId})`)

      // Determine bill type (use rule's bill type or default to "other")
      const billType =
        (invoiceRule?.billType as "municipality" | "levy" | "utility" | "other") ||
        (paymentRule?.billType as "municipality" | "levy" | "utility" | "other") ||
        "other"
      console.log(`[Email Processing]     Selected bill type: ${billType}`)
      console.log(`[Email Processing]     Selected extraction rule: ${invoiceRule?.id || paymentRule?.id || "none"}`)

      // Validate PDF before processing
      const pdfMagicBytes = pdf.content.slice(0, 4).toString("ascii")
      if (pdfMagicBytes !== "%PDF") {
        console.error(`[Email Processing]     ✗ Invalid PDF file: ${pdf.name}. Magic bytes: ${pdfMagicBytes}`)
        continue // Skip this PDF
      }
      console.log(`[Email Processing]     ✓ PDF validated: ${pdf.name} (${pdf.content.length} bytes)`)

      // Upload PDF to Supabase for storage
      console.log(`[Email Processing]     Uploading PDF to Supabase...`)
      const filePath = `bills/${propertyId}/${Date.now()}-${pdf.name}`
      const fileUrl = await uploadPDFToSupabase(pdf.content, filePath)
      console.log(`[Email Processing]     ✓ PDF uploaded to Supabase: ${fileUrl}`)

      // Create bill record
      console.log(`[Email Processing]     Creating bill record...`)
      const billResult = await createBillAction({
        propertyId,
        billType,
        source: "email",
        emailId: parsed.messageId,
        fileName: pdf.name,
        fileUrl,
        status: "pending",
        extractionRuleId: invoiceRule?.id || paymentRule?.id || null
      })

      if (billResult.isSuccess && billResult.data) {
        console.log(`[Email Processing]     ✓ Bill created: ${billResult.data.id}`)
        
        // Process PDF directly with the buffer (not from Supabase) to avoid corruption
        // This ensures downloaded PDFs are processed the same way as attached PDFs
        console.log(`[Email Processing]     Processing PDF directly with buffer...`)
        const { processPDFWithDualPurposeExtraction } = await import("@/lib/pdf-processing")
        const { updateBillAction } = await import("@/actions/bills-actions")
        
        processPDFWithDualPurposeExtraction(
          pdf.content, // Use the original buffer, not Supabase URL
          invoiceRule
            ? {
                id: invoiceRule.id,
                extractionConfig: allEmailRules.find(r => r.id === invoiceRule.id)?.invoiceExtractionConfig as Record<string, unknown> | undefined,
                instruction: allEmailRules.find(r => r.id === invoiceRule.id)?.invoiceInstruction || undefined
              }
            : undefined,
          paymentRule
            ? {
                id: paymentRule.id,
                extractionConfig: allEmailRules.find(r => r.id === paymentRule.id)?.paymentExtractionConfig as Record<string, unknown> | undefined,
                instruction: allEmailRules.find(r => r.id === paymentRule.id)?.paymentInstruction || undefined
              }
            : undefined,
          pdf.name
        )
          .then(async ({ invoiceData, paymentData }) => {
            // Update bill with extracted data
            const updateResult = await updateBillAction(billResult.data!.id, {
              status: "processed",
              invoiceExtractionData: invoiceData as any,
              paymentExtractionData: paymentData as any,
              invoiceRuleId: invoiceRule?.id || null,
              paymentRuleId: paymentRule?.id || null
            })
            console.log(`[Email Processing]     ✓ Bill ${billResult.data?.id} processed successfully`)
            
            // Link bill to template after successful processing
            if (updateResult.isSuccess && updateResult.data) {
              try {
                const { linkBillToTemplate } = await import("@/actions/bills-actions")
                await linkBillToTemplate(billResult.data!.id, updateResult.data)
                console.log(`[Email Processing]     ✓ Template linking attempted for bill ${billResult.data?.id}`)
              } catch (linkError) {
                // Log but don't fail - template linking is optional
                console.error(`[Email Processing]     Error linking template for bill ${billResult.data?.id}:`, linkError)
              }
            }
          })
          .catch(async (error) => {
            console.error(`[Email Processing]     ✗ Failed to process bill ${billResult.data?.id}:`, error)
            // Update status to error
            await updateBillAction(billResult.data!.id, { status: "error" })
          })
      } else {
        console.error(`[Email Processing]     ✗ Failed to create bill:`, billResult.message)
      }
    }

    // Update email processor status
    console.log("[Email Processing] Step 8: Updating email processor status...")
    await updateEmailProcessorAction(processorResult.data.id, {
      status: "processed",
      processedAt: new Date()
    })
    console.log(`[Email Processing] ✓ Email processor status updated to "processed"`)

    console.log("[Email Processing] ✓ Email webhook processed successfully")
    console.log("[Email Processing] ==========================================")
    return {
      isSuccess: true,
      message: "Email webhook processed successfully",
      data: undefined
    }
  } catch (error) {
    console.error("[Email Processing] ✗ Error processing email webhook:", error)
    if (error instanceof Error) {
      console.error("[Email Processing]   Error message:", error.message)
      console.error("[Email Processing]   Stack trace:", error.stack)
    }
    console.log("[Email Processing] ==========================================")
    return { isSuccess: false, message: "Failed to process email webhook" }
  }
}

