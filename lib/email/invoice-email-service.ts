"use server"

import { ServerClient, Models } from "postmark"
import { db } from "@/db"
import {
  rentalInvoiceInstancesTable,
  tenantsTable,
  propertiesTable,
  billingSchedulesTable,
  type SelectRentalInvoiceInstance
} from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { ActionState } from "@/types"
import type { InvoiceData } from "@/types"
import { generateInvoicePDFAction } from "@/lib/invoice-pdf-generator"
import { createOrUpdateScheduleStatusAction } from "@/actions/billing-schedule-status-actions"
import { calculateExpectedDate } from "@/lib/billing-schedule-compliance"
import { uploadPDFToSupabase } from "@/lib/storage/supabase-storage"

/**
 * Get Postmark client instance (lazy initialization)
 * Supports both POSTMARK_API_KEY and POSTMARK_SERVER_API_TOKEN
 */
function getPostmarkClient(): ServerClient {
  const apiKey = process.env.POSTMARK_API_KEY || process.env.POSTMARK_SERVER_API_TOKEN
  if (!apiKey) {
    throw new Error("POSTMARK_API_KEY or POSTMARK_SERVER_API_TOKEN environment variable is not set")
  }
  return new ServerClient(apiKey)
}

/**
 * Send invoice email to tenant via Postmark
 */
export async function sendInvoiceEmailAction(
  instanceId: string
): Promise<ActionState<SelectRentalInvoiceInstance>> {
  try {
    // Get rental invoice instance
    const instance = await db.query.rentalInvoiceInstances.findFirst({
      where: eq(rentalInvoiceInstancesTable.id, instanceId)
    })

    if (!instance) {
      return { isSuccess: false, message: "Rental invoice instance not found" }
    }

    if (instance.status !== "generated") {
      return {
        isSuccess: false,
        message: `Invoice must be in "generated" status to send. Current status: ${instance.status}`
      }
    }

    if (!instance.invoiceData) {
      return {
        isSuccess: false,
        message: "Invoice data not found. Please generate invoice data first."
      }
    }

    const invoiceData = instance.invoiceData as InvoiceData

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenantsTable.id, instance.tenantId)
    })

    if (!tenant) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    if (!tenant.email) {
      return { isSuccess: false, message: "Tenant email address is required" }
    }

    // Get property
    const property = await db.query.properties.findFirst({
      where: eq(propertiesTable.id, instance.propertyId)
    })

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    // Generate PDF invoice directly here to avoid serialization issues
    // Import the generator function and call it directly
    const { generateInvoicePDFAction } = await import("@/lib/invoice-pdf-generator")
    const pdfResult = await generateInvoicePDFAction(instanceId)
    
    if (!pdfResult.isSuccess || !pdfResult.data) {
      return {
        isSuccess: false,
        message: pdfResult.message || "Failed to generate PDF invoice"
      }
    }

    let pdfBuffer: Buffer

    // Handle different buffer formats (Buffer might be serialized as Uint8Array or array)
    if (Buffer.isBuffer(pdfResult.data)) {
      pdfBuffer = pdfResult.data
    } else {
      // After serialization, Buffer might be Uint8Array or array
      // Cast to unknown first to allow instanceof checks
      const data = pdfResult.data as unknown
      if (data instanceof Uint8Array) {
        pdfBuffer = Buffer.from(data)
      } else if (Array.isArray(data)) {
        pdfBuffer = Buffer.from(data)
      } else if (typeof data === "object" && data !== null) {
      // Check if it's a serialized buffer object
        const dataObj = data as Record<string, unknown>
        if ("data" in dataObj && Array.isArray(dataObj.data)) {
        // Handle serialized buffer objects { type: 'Buffer', data: [...] }
          pdfBuffer = Buffer.from(dataObj.data as number[])
        } else if (typeof (dataObj as { toBuffer?: () => Promise<Buffer> | Buffer }).toBuffer === "function") {
        // If it's a PDFDocument instance, call toBuffer()
        try {
            const buffer = await (dataObj as { toBuffer: () => Promise<Buffer> | Buffer }).toBuffer()
          if (Buffer.isBuffer(buffer)) {
            pdfBuffer = buffer
          } else {
            throw new Error("toBuffer() did not return a Buffer")
          }
        } catch (bufferError) {
          console.error("[Invoice Email] Error calling toBuffer():", bufferError)
          return {
            isSuccess: false,
            message: `Failed to convert PDF document to buffer: ${bufferError instanceof Error ? bufferError.message : "Unknown error"}`
          }
        }
      } else {
          const dataType = dataObj.constructor?.name || typeof dataObj
        console.error("[Invoice Email] Unexpected PDF data type:", {
            type: typeof dataObj,
          constructor: dataType,
            keys: Object.keys(dataObj)
        })
        return {
          isSuccess: false,
            message: `Invalid PDF data type received: ${dataType}. Expected Buffer, got ${typeof dataObj}`
        }
      }
    } else {
      return {
        isSuccess: false,
          message: `Invalid PDF data: expected Buffer, got ${typeof data}`
        }
      }
    }

    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error("[Invoice Email] PDF buffer validation failed:", {
        type: typeof pdfResult.data,
        isBuffer: Buffer.isBuffer(pdfResult.data),
        isUint8Array: pdfResult.data instanceof Uint8Array,
        isArray: Array.isArray(pdfResult.data),
        length: pdfResult.data && typeof pdfResult.data === "object" && "length" in pdfResult.data ? (pdfResult.data as { length: number }).length : 0
      })
      return {
        isSuccess: false,
        message: "Generated PDF buffer is empty or invalid"
      }
    }

    // Validate PDF magic bytes
    const pdfMagicBytes = pdfBuffer.slice(0, 4).toString("ascii")
    if (pdfMagicBytes !== "%PDF") {
      return {
        isSuccess: false,
        message: "Generated PDF buffer is not a valid PDF file"
      }
    }

    // Save PDF to Supabase storage for long-term storage
    let pdfUrl: string | null = null
    try {
      const fileName = `invoice-${invoiceData.invoiceNumber}.pdf`
      const filePath = `invoices/${instance.propertyId}/${instance.id}/${fileName}`
      pdfUrl = await uploadPDFToSupabase(pdfBuffer, filePath)
      console.log("[Invoice Email] PDF saved to Supabase:", pdfUrl)

      // Update instance with PDF URL
      await db
        .update(rentalInvoiceInstancesTable)
        .set({
          pdfUrl,
          updatedAt: new Date()
        })
        .where(eq(rentalInvoiceInstancesTable.id, instanceId))
    } catch (storageError) {
      console.error("[Invoice Email] Error saving PDF to Supabase:", storageError)
      // Don't fail the entire operation if storage fails, but log it
      // Continue with email sending
    }

    // Convert to base64 - ensure it's a clean base64 string
    let base64Content: string
    try {
      base64Content = pdfBuffer.toString("base64")
      // Remove any whitespace and validate
      base64Content = base64Content.trim().replace(/\s/g, "")
      
      // Validate base64 string format
      if (!base64Content || base64Content.length === 0) {
        return {
          isSuccess: false,
          message: "Failed to encode PDF to base64: empty result"
        }
      }

      // Validate base64 format (should only contain A-Z, a-z, 0-9, +, /, and =)
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (!base64Regex.test(base64Content)) {
        console.error("[Invoice Email] Invalid base64 format detected")
        return {
          isSuccess: false,
          message: "Failed to encode PDF to base64: invalid format"
        }
      }

      // Log buffer info for debugging
      console.log("[Invoice Email] PDF buffer info:", {
        bufferLength: pdfBuffer.length,
        base64Length: base64Content.length,
        firstBytes: pdfBuffer.slice(0, 10).toString("hex"),
        magicBytes: pdfMagicBytes
      })
    } catch (encodeError) {
      console.error("[Invoice Email] Error encoding PDF to base64:", encodeError)
      return {
        isSuccess: false,
        message: `Failed to encode PDF to base64: ${encodeError instanceof Error ? encodeError.message : "Unknown error"}`
      }
    }

    // Format dates for email
    const formatDate = (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    }

    const dueDate = formatDate(invoiceData.dueDate)
    const periodStart = formatDate(invoiceData.periodStart)
    const periodEnd = formatDate(invoiceData.periodEnd)

    // Format currency
    const formatCurrency = (amount: number) => {
      return `R ${amount.toFixed(2)}`
    }

    // Create email subject
    const subject = `Invoice ${invoiceData.invoiceNumber} - ${invoiceData.propertyAddress.fullAddress}`

    // Create email body (HTML)
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .invoice-details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .total { font-size: 18px; font-weight: bold; color: #2c3e50; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invoice ${invoiceData.invoiceNumber}</h1>
              <p>Property: ${invoiceData.propertyAddress.fullAddress}</p>
            </div>
            
            <p>Dear ${tenant.name},</p>
            
            <p>Please find attached your rental invoice for the period <strong>${periodStart} to ${periodEnd}</strong>.</p>
            
            <div class="invoice-details">
              <h2>Invoice Summary</h2>
              <p><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
              <p><strong>Period:</strong> ${periodStart} - ${periodEnd}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              <p><strong>Total Amount:</strong> <span class="total">${formatCurrency(invoiceData.totalAmount)}</span></p>
            </div>
            
            <h3>Line Items:</h3>
            <ul>
              ${invoiceData.lineItems
                .map(
                  (item) =>
                    `<li>${item.description}: ${formatCurrency(item.amount)}</li>`
                )
                .join("")}
            </ul>
            
            ${invoiceData.billingAddress ? `
              <div class="invoice-details">
                <h3>Payment Instructions</h3>
                <p>Please send payment to:</p>
                <p>${invoiceData.billingAddress}</p>
              </div>
            ` : ""}
            
            <p><strong>Payment is due by: ${dueDate}</strong></p>
            
            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
            
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Create plain text body
    const textBody = `
Invoice ${invoiceData.invoiceNumber}
Property: ${invoiceData.propertyAddress.fullAddress}

Dear ${tenant.name},

Please find attached your rental invoice for the period ${periodStart} to ${periodEnd}.

Invoice Summary:
- Invoice Number: ${invoiceData.invoiceNumber}
- Period: ${periodStart} - ${periodEnd}
- Due Date: ${dueDate}
- Total Amount: ${formatCurrency(invoiceData.totalAmount)}

Line Items:
${invoiceData.lineItems.map((item) => `- ${item.description}: ${formatCurrency(item.amount)}`).join("\n")}

${invoiceData.billingAddress ? `Payment Instructions:\nPlease send payment to:\n${invoiceData.billingAddress}\n\n` : ""}
Payment is due by: ${dueDate}

If you have any questions about this invoice, please don't hesitate to contact us.

Thank you for your business!

This is an automated email. Please do not reply to this message.
    `.trim()

    // Send email via Postmark
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "invoices@yourdomain.com"

    // Check if Postmark is configured
    // Check both POSTMARK_API_KEY and POSTMARK_SERVER_API_TOKEN (alternative name)
    const apiKey = process.env.POSTMARK_API_KEY || process.env.POSTMARK_SERVER_API_TOKEN
    
    if (!apiKey) {
      console.error("[Invoice Email] POSTMARK_API_KEY or POSTMARK_SERVER_API_TOKEN not found in environment")
      console.error("[Invoice Email] Available env vars:", {
        hasPostmarkApiKey: !!process.env.POSTMARK_API_KEY,
        hasPostmarkServerApiToken: !!process.env.POSTMARK_SERVER_API_TOKEN,
        hasPostmarkWebhookSecret: !!process.env.POSTMARK_WEBHOOK_SECRET,
        hasPostmarkFromEmail: !!process.env.POSTMARK_FROM_EMAIL
      })
      return {
        isSuccess: false,
        message: "Postmark email service is not configured. Please set POSTMARK_API_KEY or POSTMARK_SERVER_API_TOKEN environment variable in .env.local and restart your development server."
      }
    }

    // Use the found API key
    const postmarkClient = new ServerClient(apiKey)

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: tenant.email,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      Attachments: [
        {
          Name: `invoice-${invoiceData.invoiceNumber}.pdf`,
          Content: base64Content,
          ContentType: "application/pdf",
          ContentLength: pdfBuffer.length,
          ContentID: ""
        }
      ],
      TrackOpens: true,
      TrackLinks: Models.LinkTrackingOptions.HtmlAndText
    })

    // Update instance status to "sent" and record sent timestamp
    invoiceData.sentAt = new Date().toISOString()

    const [updatedInstance] = await db
      .update(rentalInvoiceInstancesTable)
      .set({
        status: "sent",
        invoiceData: invoiceData as unknown as Record<string, unknown>,
        updatedAt: new Date()
      })
      .where(eq(rentalInvoiceInstancesTable.id, instanceId))
      .returning()

    if (!updatedInstance) {
      return { isSuccess: false, message: "Failed to update invoice instance" }
    }

    // Update billing schedule status
    try {
      // Find billing schedule with scheduleType = "invoice_output" for this property
      const invoiceSchedule = await db.query.billingSchedules.findFirst({
        where: and(
          eq(billingSchedulesTable.propertyId, instance.propertyId),
          eq(billingSchedulesTable.scheduleType, "invoice_output")
        )
      })

      if (invoiceSchedule) {
        // Calculate expected date from schedule
        const expectedDate = calculateExpectedDate(
          invoiceSchedule,
          instance.periodYear,
          instance.periodMonth
        )

        const actualDate = new Date() // Current timestamp

        // Calculate days late
        const daysLate = Math.floor(
          (actualDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Update schedule status to "sent" (invoice has been sent to tenant)
        await createOrUpdateScheduleStatusAction({
          scheduleId: invoiceSchedule.id,
          periodYear: instance.periodYear,
          periodMonth: instance.periodMonth,
          expectedDate,
          actualDate,
          status: "sent",
          invoiceId: instanceId,
          daysLate: daysLate > 0 ? daysLate : 0
        })

        console.log(
          `[Invoice Email] Updated billing schedule status to "sent" for schedule ${invoiceSchedule.id}, period ${instance.periodYear}-${instance.periodMonth}`
        )
      }
    } catch (scheduleError) {
      console.error("Error updating billing schedule status:", scheduleError)
      // Don't fail the entire operation if schedule update fails
    }

    return {
      isSuccess: true,
      message: "Invoice sent successfully",
      data: updatedInstance
    }
  } catch (error) {
    console.error("Error sending invoice email:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send invoice email"
    }
  }
}

