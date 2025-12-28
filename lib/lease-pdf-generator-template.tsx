"use server"

import React from "react"
import { renderToStream } from "@react-pdf/renderer"
import { db } from "@/db"
import { leaseAgreementsTable, leaseTemplatesTable, propertiesTable, tenantsTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"
import type { SelectLeaseAgreement } from "@/db/schema"
import { getDefaultLeaseTemplateAction } from "@/actions/lease-templates-actions"
import type { TemplateSection } from "@/lib/utils/template-helpers"
import { TemplateBasedPDF, type LeaseData } from "@/lib/lease-pdf-component"


/**
 * Generate lease PDF using template structure
 */
export async function generateLeasePDFWithTemplateAction(
  leaseData: LeaseData,
  templateId?: string
): Promise<ActionState<Buffer>> {
  try {
    // Debug: Log landlord data to ensure it's being passed correctly
    console.log("PDF Generation - Landlord Data:", {
      landlordName: leaseData.landlordName,
      landlordIdNumber: leaseData.landlordIdNumber,
      landlordAddress: leaseData.landlordAddress,
      landlordEmail: leaseData.landlordEmail,
      landlordPhone: leaseData.landlordPhone
    })
    
    // Get template (use provided or default)
    let template
    if (templateId) {
      const [foundTemplate] = await db
        .select()
        .from(leaseTemplatesTable)
        .where(eq(leaseTemplatesTable.id, templateId))
        .limit(1)
      if (foundTemplate) {
        template = foundTemplate
      }
    }

    if (!template) {
      const defaultTemplateResult = await getDefaultLeaseTemplateAction()
      if (defaultTemplateResult.isSuccess && defaultTemplateResult.data) {
        template = defaultTemplateResult.data
      }
    }

    if (!template || !template.templateData) {
      return {
        isSuccess: false,
        message: "Template not found"
      }
    }

    const templateData = template.templateData as { sections: TemplateSection[] }
    const sections = templateData.sections || []

    // Sort sections by order if available
    const sortedSections = [...sections].sort((a, b) => {
      const orderA = a.order ?? 999
      const orderB = b.order ?? 999
      return orderA - orderB
    })

    const pdfDoc = <TemplateBasedPDF data={leaseData} templateSections={sortedSections} />
    const stream = await renderToStream(pdfDoc)

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      return {
        isSuccess: false,
        message: "Failed to generate PDF buffer"
      }
    }

    const pdfMagicBytes = pdfBuffer.slice(0, 4).toString("ascii")
    if (pdfMagicBytes !== "%PDF") {
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
    console.error("Error generating lease PDF with template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate lease PDF"
    }
  }
}

