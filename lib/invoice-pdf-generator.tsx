"use server"

import { db } from "@/db"
import {
  rentalInvoiceInstancesTable,
  rentalInvoiceTemplatesTable,
  propertiesTable,
  tenantsTable,
  type SelectRentalInvoiceInstance
} from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"
import type { InvoiceData, BankingDetails } from "@/types"
import React from "react"
import { renderToStream, type DocumentProps } from "@react-pdf/renderer"
import {
  ClassicInvoicePDF,
  ModernInvoicePDF,
  MinimalInvoicePDF,
  ProfessionalInvoicePDF,
  ElegantInvoicePDF,
  CompactInvoicePDF
} from "./invoice-pdf-templates"


/**
 * Generate PDF invoice from rental invoice instance
 */
export async function generateInvoicePDFAction(
  instanceId: string,
  pdfTemplateOverride?: "classic" | "modern" | "minimal" | "professional" | "elegant" | "compact"
): Promise<ActionState<Buffer>> {
  try {
    // Get rental invoice instance
    const instance = await db.query.rentalInvoiceInstances.findFirst({
      where: eq(rentalInvoiceInstancesTable.id, instanceId)
    })

    if (!instance) {
      return { isSuccess: false, message: "Rental invoice instance not found" }
    }

    // Get property
    const property = await db.query.properties.findFirst({
      where: eq(propertiesTable.id, instance.propertyId)
    })

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenantsTable.id, instance.tenantId)
    })

    if (!tenant) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    if (!instance.invoiceData) {
      return {
        isSuccess: false,
        message: "Invoice data not found. Please generate invoice data first."
      }
    }

    let invoiceData = instance.invoiceData as InvoiceData

    // Helper function to check if banking details exist
    function hasBankingDetails(bankingDetails?: BankingDetails | null): boolean {
      if (!bankingDetails) return false
      return !!(
        bankingDetails.bankName ||
        bankingDetails.accountHolderName ||
        bankingDetails.accountNumber ||
        bankingDetails.branchCode ||
        bankingDetails.swiftCode ||
        bankingDetails.referenceFormat
      )
    }

    // If banking details are missing from invoiceData, fetch them from property
    // This handles cases where invoices were generated before banking details were added
    if (!invoiceData.bankingDetails || !hasBankingDetails(invoiceData.bankingDetails)) {
      const bankingDetails: BankingDetails | null =
        property.bankName ||
        property.accountHolderName ||
        property.accountNumber ||
        property.branchCode ||
        property.swiftCode ||
        property.referenceFormat
          ? {
              bankName: property.bankName || null,
              accountHolderName: property.accountHolderName || null,
              accountNumber: property.accountNumber || null,
              branchCode: property.branchCode || null,
              swiftCode: property.swiftCode || null,
              referenceFormat: property.referenceFormat || null
            }
          : null

      if (bankingDetails) {
        invoiceData = {
          ...invoiceData,
          bankingDetails
        }
      }
    }

    // Get rental invoice template to determine PDF template style
    // Use override if provided, otherwise use template's default
    let pdfTemplate: "classic" | "modern" | "minimal" | "professional" | "elegant" | "compact" = "classic"
    
    if (pdfTemplateOverride) {
      pdfTemplate = pdfTemplateOverride
    } else {
      const template = await db.query.rentalInvoiceTemplates.findFirst({
        where: eq(rentalInvoiceTemplatesTable.id, instance.rentalInvoiceTemplateId)
      })
      pdfTemplate = (template?.pdfTemplate as "classic" | "modern" | "minimal" | "professional" | "elegant" | "compact") || "classic"
    }

    // Select the appropriate PDF template component
    let pdfDoc: React.ReactElement
    const commonProps = {
      invoiceData,
      propertyName: property.name,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      tenantPhone: tenant.phone
    }

    switch (pdfTemplate) {
      case "modern":
        pdfDoc = <ModernInvoicePDF {...commonProps} />
        break
      case "minimal":
        pdfDoc = <MinimalInvoicePDF {...commonProps} />
        break
      case "professional":
        pdfDoc = <ProfessionalInvoicePDF {...commonProps} />
        break
      case "elegant":
        pdfDoc = <ElegantInvoicePDF {...commonProps} />
        break
      case "compact":
        pdfDoc = <CompactInvoicePDF {...commonProps} />
        break
      case "classic":
      default:
        pdfDoc = <ClassicInvoicePDF {...commonProps} />
        break
    }

    // Generate PDF buffer using renderToStream (more reliable than pdf().toBuffer())
    const stream = await renderToStream(pdfDoc as React.ReactElement<DocumentProps>)
    
    // Convert stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    // Ensure we have a valid Buffer
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      console.error("[PDF Generator] Generated PDF is not a valid Buffer:", {
        type: typeof pdfBuffer,
        constructor: pdfBuffer?.constructor?.name,
        isBuffer: Buffer.isBuffer(pdfBuffer),
        length: pdfBuffer?.length
      })
      return {
        isSuccess: false,
        message: "Failed to generate PDF buffer"
      }
    }

    // Validate PDF magic bytes
    const pdfMagicBytes = pdfBuffer.slice(0, 4).toString("ascii")
    if (pdfMagicBytes !== "%PDF") {
      console.error("[PDF Generator] Generated buffer is not a valid PDF:", {
        magicBytes: pdfMagicBytes,
        bufferLength: pdfBuffer.length
      })
      return {
        isSuccess: false,
        message: "Generated buffer is not a valid PDF file"
      }
    }

    return {
      isSuccess: true,
      message: "PDF generated successfully",
      data: pdfBuffer
    }
  } catch (error) {
    console.error("Error generating invoice PDF:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate invoice PDF"
    }
  }
}

