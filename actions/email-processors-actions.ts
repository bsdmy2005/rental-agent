"use server"

import { db } from "@/db"
import {
  emailProcessorsTable,
  extractionJobsTable,
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
  
  // Declare variables outside try block for error handling
  let processorResult: { isSuccess: boolean; data?: SelectEmailProcessor } | null = null
  let extractionJobId: string | undefined = undefined
  
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
    if (!matchedRule) {
      console.error("[Email Processing] ✗ No matched rule found")
      return {
        isSuccess: false,
        message: "Error: No matched rule found"
      }
    }
    
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
    
    // Step 0: Create email processor record and extraction job
    console.log("[Email Processing] Step 3: Creating email processor record...")
    // parsePostmarkWebhook is already imported at line 110
    const parsed = await parsePostmarkWebhook(payload, matchedRuleFull.emailProcessingInstruction || undefined)
    
    processorResult = await createEmailProcessorAction({
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
      return {
        isSuccess: false,
        message: "Failed to create email processor record"
      }
    }

    // Create extraction job
    const { createExtractionJobAction, updateExtractionJobAction } = await import("@/actions/extraction-jobs-actions")
    const extractionJobResult = await createExtractionJobAction({
      emailProcessorId: processorResult.data.id,
      extractionRuleId: matchedRuleFull.id,
      status: "pending",
      lane: "unknown",
      trace: [],
      startedAt: new Date()
    })

    if (!extractionJobResult.isSuccess || !extractionJobResult.data) {
      console.warn("[Email Processing] ⚠ Failed to create extraction job, continuing without it")
    }

    extractionJobId = extractionJobResult.data?.id

    // Use lane-based processing
    console.log("[Email Processing] Step 4: Processing email with lane-based architecture...")
    const { processEmailWithLanes } = await import("@/lib/email/lane-orchestrator")
    const laneResult = await processEmailWithLanes(payload, matchedRuleFull)

    // Update extraction job with lane result
    if (extractionJobId) {
      await updateExtractionJobAction(extractionJobId, {
        lane: laneResult.lane,
        status: laneResult.success ? "processing" : "failed",
        trace: laneResult.trace,
        error: laneResult.error || undefined
      })
    }

    if (!laneResult.success || laneResult.pdfBuffers.length === 0) {
      console.error("[Email Processing] ✗ Lane processing failed or no PDFs extracted")
      await updateEmailProcessorAction(processorResult.data.id, {
        status: "error"
      })
      if (extractionJobId) {
        await updateExtractionJobAction(extractionJobId, {
          status: "failed",
          error: laneResult.error || "No PDFs extracted",
          completedAt: new Date()
        })
      }
      return {
        isSuccess: false,
        message: laneResult.error || "Failed to extract PDFs from email"
      }
    }

    console.log(`[Email Processing] ✓ Lane ${laneResult.lane} extracted ${laneResult.pdfBuffers.length} PDF(s)`)

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

    // Process PDFs from lane results
    console.log("[Email Processing] Step 6: Processing PDFs from lane results...")
    const pdfsToProcess = laneResult.pdfBuffers.map((pdf) => ({
      name: pdf.name,
      content: pdf.content
    }))
    
    console.log(`[Email Processing]   Total PDFs to process: ${pdfsToProcess.length}`)
    
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
        emailId: parsed.messageId || payload.MessageID,
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
            
            // CRITICAL: Link bill to template FIRST before period matching
            // Template linking is required for proper dependency validation during period matching
            if (updateResult.isSuccess && updateResult.data) {
              try {
                const { linkBillToTemplate } = await import("@/actions/bills-actions")
                const { getBillByIdQuery } = await import("@/queries/bills-queries")
                
                // Get updated bill after PDF processing
                const billAfterProcessing = await getBillByIdQuery(billResult.data!.id)
                
                if (billAfterProcessing) {
                  console.log(`[Email Processing]     Linking bill ${billResult.data?.id} to template before period matching...`)
                  await linkBillToTemplate(billResult.data!.id, billAfterProcessing)
                  
                  // Get bill after template linking to check if it succeeded
                  const billWithTemplate = await getBillByIdQuery(billResult.data!.id)
                  
                  if (billWithTemplate?.billTemplateId) {
                    console.log(`[Email Processing]     ✓ Bill ${billResult.data?.id} linked to template ${billWithTemplate.billTemplateId}`)
                  } else {
                    console.warn(`[Email Processing]     ⚠ Template linking failed for bill ${billResult.data?.id}. Skipping period matching.`)
                    console.warn(`[Email Processing]       Bill must have a template ID before period matching can occur.`)
                    return // Skip period matching if template linking failed
                  }
                }
              } catch (linkError) {
                // Log error and skip period matching if template linking fails
                console.error(`[Email Processing]     Error linking template for bill ${billResult.data?.id}:`, linkError)
                console.warn(`[Email Processing]     Skipping period matching due to template linking failure.`)
                return // Skip period matching if template linking failed
              }
              
              // Process period extraction and auto-matching using reusable function
              // This handles period inference and matching to all compatible periods
              // Now that bill has template ID, matching can validate template dependencies correctly
              try {
                const { processBillPeriod } = await import("@/lib/bill-period-processing")
                const periodResult = await processBillPeriod(
                  billResult.data!.id,
                  invoiceData || null,
                  paymentData || null,
                  pdf.name
                )
                
                if (periodResult.periodSet) {
                  console.log(`[Email Processing]     ✓ Period extraction completed for bill ${billResult.data?.id}`)
                } else {
                  console.log(`[Email Processing]     ⚠ Could not extract period for bill ${billResult.data?.id}. Can be manually matched later.`)
                }
                
                if (periodResult.matched) {
                  console.log(
                    `[Email Processing]     ✓ Auto-matched bill ${billResult.data?.id} to ${periodResult.matchedPeriods.length} period(s): ${periodResult.matchedPeriods.map(m => `${m.periodType}:${m.periodId}`).join(", ")}`
                  )
                } else {
                  console.log(
                    `[Email Processing]     ⚠ Bill ${billResult.data?.id} was not auto-matched to any periods. Can be manually matched later.`
                  )
                }
              } catch (periodError) {
                // Log error but don't fail - period processing is optional
                console.error(`[Email Processing]     Error processing period for bill ${billResult.data?.id}:`, periodError)
                if (periodError instanceof Error) {
                  console.error(`[Email Processing]       Error message: ${periodError.message}`)
                }
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

    // Update extraction job status
    if (extractionJobId) {
      await updateExtractionJobAction(extractionJobId, {
        status: "completed",
        completedAt: new Date(),
        result: {
          pdfCount: pdfsToProcess.length,
          lane: laneResult.lane
        }
      })
    }

    console.log("[Email Processing] ✓ Email webhook processed successfully")
    console.log("[Email Processing] ==========================================")
    return {
      isSuccess: true,
      message: "Email webhook processed successfully",
      data: undefined
    }
  } catch (error) {
    console.error("[Email Processing] ✗ Error processing email webhook:", error)
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error("[Email Processing]   Error name:", error.name)
      console.error("[Email Processing]   Error message:", error.message)
      if (error.stack) {
        console.error("[Email Processing]   Stack trace:", error.stack)
      }
      
      // Handle specific error types
      if (error.name === "AbortError" || error.message.includes("aborted")) {
        console.error("[Email Processing]   ⚠ Request was aborted (likely timeout or cancellation)")
        console.error("[Email Processing]   This may indicate a timeout in Browser Use API or file download")
      }
      if (error.message.includes("timeout")) {
        console.error("[Email Processing]   ⚠ Request timed out")
      }
      if (error.message.includes("No PDF files found")) {
        console.error("[Email Processing]   ⚠ Browser Use task completed but didn't produce PDF files")
        console.error("[Email Processing]   This may indicate the task failed or couldn't access the portal")
      }
    } else {
      console.error("[Email Processing]   Unknown error type:", typeof error)
      console.error("[Email Processing]   Error value:", JSON.stringify(error, null, 2))
    }
    
    // Update email processor status to error
    if (processorResult?.data?.id) {
      try {
        await updateEmailProcessorAction(processorResult.data.id, {
          status: "error"
        })
      } catch (updateError) {
        console.error("[Email Processing]   Failed to update processor status:", updateError)
      }
    }
    
    // Update extraction job status to failed
    if (extractionJobId) {
      try {
        const { updateExtractionJobAction } = await import("@/actions/extraction-jobs-actions")
        await updateExtractionJobAction(extractionJobId, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date()
        })
      } catch (updateError) {
        console.error("[Email Processing]   Failed to update extraction job status:", updateError)
      }
    }
    
    console.log("[Email Processing] ==========================================")
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to process email webhook"
    }
  }
}

