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
    const { getUserProfileByClerkIdQuery } = await import("@/queries/user-profiles-queries")
    const { getExtractionRulesByUserProfileIdQuery } = await import("@/queries/extraction-rules-queries")
    const { getLandlordByUserProfileIdQuery } = await import("@/queries/landlords-queries")
    const { getRentalAgentByUserProfileIdQuery } = await import("@/queries/rental-agents-queries")
    const { getPropertiesByLandlordIdQuery, getPropertiesByRentalAgentIdQuery } = await import("@/queries/properties-queries")
    const { createBillAction } = await import("@/actions/bills-actions")
    const { processBillAction } = await import("@/actions/bills-actions")

    // Parse webhook payload
    console.log("[Email Processing] Step 1: Parsing webhook payload...")
    const parsed = parsePostmarkWebhook(payload)
    console.log("[Email Processing] ✓ Parsed email data successfully")

    // Find user profile by recipient email
    console.log("[Email Processing] Step 2: Looking up user profile...")
    console.log("[Email Processing]   Searching for email:", parsed.to)
    const userProfiles = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.email, parsed.to))
      .limit(1)

    if (userProfiles.length === 0) {
      // No matching user found - log and return success (don't fail webhook)
      console.warn(`[Email Processing] ✗ No user profile found for email: ${parsed.to}`)
      console.log("[Email Processing]   Available user profiles in database:")
      const allProfiles = await db.select().from(userProfilesTable)
      allProfiles.forEach((p) => {
        console.log(`[Email Processing]     - ${p.email} (${p.userType})`)
      })
      console.log("[Email Processing] ==========================================")
      return {
        isSuccess: true,
        message: `No user profile found for email: ${parsed.to}. Email ignored.`,
        data: undefined
      }
    }

    const userProfile = userProfiles[0]
    console.log(`[Email Processing] ✓ Found user profile: ${userProfile.email} (${userProfile.userType}, ID: ${userProfile.id})`)

    if (parsed.pdfAttachments.length === 0) {
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
    console.log("[Email Processing] Step 3: Creating email processor record...")
    const processorResult = await createEmailProcessorAction({
      userProfileId: userProfile.id,
      postmarkMessageId: parsed.messageId,
      from: parsed.from,
      subject: parsed.subject || null,
      receivedAt: parsed.receivedAt,
      hasAttachments: true,
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
    console.log("[Email Processing] Step 4: Fetching user properties...")
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

    // Get active extraction rules for this user
    console.log("[Email Processing] Step 5: Fetching extraction rules...")
    const allRules = await getExtractionRulesByUserProfileIdQuery(userProfile.id)
    const activeRules = allRules.filter((r) => r.isActive)
    console.log(`[Email Processing]   Total rules: ${allRules.length}, Active rules: ${activeRules.length}`)
    activeRules.forEach((r, idx) => {
      console.log(`[Email Processing]   Rule ${idx + 1}:`, {
        id: r.id,
        name: r.name || "(unnamed)",
        propertyId: r.propertyId || "(no property)",
        billType: r.billType,
        extractForInvoice: r.extractForInvoice,
        extractForPayment: r.extractForPayment,
        emailFilter: r.emailFilter ? JSON.stringify(r.emailFilter) : "none"
      })
    })

    // Match email to rules (by output type flags)
    console.log("[Email Processing] Step 6: Matching email to extraction rules...")
    const { invoiceRule, paymentRule } = matchEmailToRules(
      parsed.from,
      parsed.subject,
      activeRules.map((r) => ({
        id: r.id,
        emailFilter: r.emailFilter as Record<string, unknown> | null,
        propertyId: r.propertyId,
        billType: r.billType,
        extractForInvoice: r.extractForInvoice,
        extractForPayment: r.extractForPayment
      }))
    )

    // Process each PDF attachment
    console.log("[Email Processing] Step 7: Processing PDF attachments...")
    console.log(`[Email Processing]   Found ${parsed.pdfAttachments.length} PDF attachment(s)`)
    
    for (let i = 0; i < parsed.pdfAttachments.length; i++) {
      const attachment = parsed.pdfAttachments[i]
      console.log(`[Email Processing]   Processing attachment ${i + 1}/${parsed.pdfAttachments.length}: ${attachment.name}`)
      
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

      // Upload PDF to Supabase
      console.log(`[Email Processing]     Uploading PDF to Supabase...`)
      const filePath = `bills/${propertyId}/${Date.now()}-${attachment.name}`
      const fileUrl = await uploadPDFToSupabase(attachment.content, filePath)
      console.log(`[Email Processing]     ✓ PDF uploaded: ${fileUrl}`)

      // Create bill record
      console.log(`[Email Processing]     Creating bill record...`)
      const billResult = await createBillAction({
        propertyId,
        billType,
        source: "email",
        emailId: parsed.messageId,
        fileName: attachment.name,
        fileUrl,
        status: "pending",
        extractionRuleId: invoiceRule?.id || paymentRule?.id || null
      })

      if (billResult.isSuccess && billResult.data) {
        console.log(`[Email Processing]     ✓ Bill created: ${billResult.data.id}`)
        // Trigger async processing (don't await)
        console.log(`[Email Processing]     Triggering async bill processing...`)
        processBillAction(billResult.data.id)
          .then(() => {
            console.log(`[Email Processing]     ✓ Bill ${billResult.data?.id} processed successfully`)
          })
          .catch((error) => {
            console.error(`[Email Processing]     ✗ Failed to process bill ${billResult.data?.id}:`, error)
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

