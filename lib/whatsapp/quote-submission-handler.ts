"use server"

import { db } from "@/db"
import { quoteRequestsTable, quotesTable, serviceProvidersTable } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { parseQuoteSubmission } from "./quote-parser"
import { sendWhatsAppMessage } from "./twilio-client"
import { ActionState } from "@/types"
import type { SelectQuote, SelectQuoteRequest } from "@/db/schema"

/**
 * Parse currency string to numeric value for database storage
 * Handles formats like "R 4,250.00", "$1,500", "4250.00", etc.
 */
function parseAmountToNumeric(amount: string | number): string {
  if (typeof amount === "number") {
    return amount.toString()
  }
  // Remove currency symbols (R, $, €, £, etc.), spaces, and commas
  const cleaned = amount.toString().replace(/[R$€£¥\s,]/g, "").trim()
  const numericValue = parseFloat(cleaned)
  if (isNaN(numericValue)) {
    throw new Error(`Invalid amount format: ${amount}`)
  }
  return numericValue.toString()
}

/**
 * Process quote submission from WhatsApp message
 */
export async function processQuoteSubmissionFromWhatsApp(
  messageText: string,
  fromPhoneNumber: string
): Promise<ActionState<SelectQuote>> {
  try {
    // Parse the message
    const parsed = parseQuoteSubmission(messageText)
    if (!parsed) {
      return {
        isSuccess: false,
        message: "Could not parse quote submission. Please include RFQ code and amount."
      }
    }

    // Find quote request by code
    const [quoteRequest] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.whatsappCode, parsed.rfqCode))
      .limit(1)

    if (!quoteRequest) {
      // Send error message to provider
      await sendWhatsAppMessage(
        fromPhoneNumber,
        `❌ Invalid RFQ code: ${parsed.rfqCode}\n\nPlease check the code and try again.`
      )
      return {
        isSuccess: false,
        message: `Invalid RFQ code: ${parsed.rfqCode}`
      }
    }

    // Check if RFQ has expired (if dueDate is set)
    if (quoteRequest.dueDate) {
      const now = new Date()
      const dueDate = new Date(quoteRequest.dueDate)
      if (now > dueDate) {
        await sendWhatsAppMessage(
          fromPhoneNumber,
          `❌ This quote request has expired. The due date was ${dueDate.toLocaleDateString()}.`
        )
        return {
          isSuccess: false,
          message: "Quote request has expired"
        }
      }
    }

    // Check if quote already exists for this request
    const [existingQuote] = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.quoteRequestId, quoteRequest.id))
      .limit(1)

    if (existingQuote) {
      await sendWhatsAppMessage(
        fromPhoneNumber,
        `ℹ️ A quote has already been submitted for RFQ ${parsed.rfqCode}. If you need to update it, please contact us directly.`
      )
      return {
        isSuccess: false,
        message: "Quote already exists for this request"
      }
    }

    // Validate amount is provided
    if (!parsed.amount) {
      await sendWhatsAppMessage(
        fromPhoneNumber,
        `❌ Please include the quote amount in your message.\n\nFormat:\nRFQ-${parsed.rfqCode}\nAmount: R [amount]\nDescription: [your description]\nCompletion Date: [date] (optional)`
      )
      return {
        isSuccess: false,
        message: "Quote amount is required"
      }
    }

    // Get service provider to verify phone number matches
    const [serviceProvider] = await db
      .select()
      .from(serviceProvidersTable)
      .where(eq(serviceProvidersTable.id, quoteRequest.serviceProviderId))
      .limit(1)

    if (!serviceProvider) {
      return {
        isSuccess: false,
        message: "Service provider not found"
      }
    }

    // Parse amount to numeric value (database expects numeric, not formatted string)
    if (!parsed.amount) {
      throw new Error("Amount is required")
    }
    const parsedAmount = parseAmountToNumeric(parsed.amount)

    // Create quote record
    const [newQuote] = await db
      .insert(quotesTable)
      .values({
        quoteRequestId: quoteRequest.id,
        amount: parsedAmount,
        description: parsed.description || null,
        estimatedCompletionDate: parsed.completionDate || null,
        status: "quoted",
        submittedVia: "whatsapp",
        submissionCode: parsed.rfqCode,
        whatsappReplyId: fromPhoneNumber // Store phone number for reference
      })
      .returning()

    if (!newQuote) {
      return {
        isSuccess: false,
        message: "Failed to create quote"
      }
    }

    // Update quote request status
    await db
      .update(quoteRequestsTable)
      .set({ status: "quoted" })
      .where(eq(quoteRequestsTable.id, quoteRequest.id))

    // Send confirmation message
    const confirmationMessage = `✅ Quote received!\n\nRFQ: ${parsed.rfqCode}\nAmount: R ${parsed.amount}\n${parsed.description ? `Description: ${parsed.description}\n` : ""}${parsed.completionDate ? `Completion Date: ${parsed.completionDate.toLocaleDateString()}\n` : ""}\nThank you for your quote. We will review it and get back to you.`

    await sendWhatsAppMessage(fromPhoneNumber, confirmationMessage).catch((error) => {
      console.error("Failed to send confirmation message:", error)
      // Don't fail the whole operation if confirmation fails
    })

    return {
      isSuccess: true,
      message: "Quote submitted successfully",
      data: newQuote
    }
  } catch (error) {
    console.error("Error processing quote submission from WhatsApp:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to process quote submission"
    }
  }
}

