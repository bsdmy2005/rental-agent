"use server"

import { ServerClient } from "postmark"
import { db } from "@/db"
import {
  movingInspectionsTable,
  leaseAgreementsTable,
  propertiesTable,
  tenantsTable
} from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"
import { generateFilledInspectionPDFAction } from "@/lib/moving-inspection-pdf-generator"
import { generateMoveOutReportPDFAction } from "@/lib/moving-inspection-pdf-generator"

function getPostmarkClient(): ServerClient {
  const apiKey = process.env.POSTMARK_API_KEY || process.env.POSTMARK_SERVER_API_TOKEN
  if (!apiKey) {
    throw new Error("POSTMARK_API_KEY or POSTMARK_SERVER_API_TOKEN not found in environment")
  }
  return new ServerClient(apiKey)
}

/**
 * Send inspection to tenant via Postmark
 */
export async function sendInspectionToTenantAction(
  inspectionId: string
): Promise<ActionState<void>> {
  try {
    // Get inspection
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, inspectionId))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Inspection not found" }
    }

    // Pre-condition check: Landlord must sign before sending to tenant
    if (!inspection.signedByLandlord) {
      return { isSuccess: false, message: "Landlord must sign before sending to tenant" }
    }

    // Get lease and property
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, inspection.leaseAgreementId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease not found" }
    }

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, lease.tenantId))
      .limit(1)

    if (!tenant || !tenant.email) {
      return { isSuccess: false, message: "Tenant email not found" }
    }

    // Generate or get access token
    let accessToken = inspection.tenantAccessToken
    if (!accessToken) {
      const crypto = await import("crypto")
      accessToken = crypto.randomBytes(32).toString("hex")
      await db
        .update(movingInspectionsTable)
        .set({
          tenantAccessToken: accessToken,
          updatedAt: new Date()
        })
        .where(eq(movingInspectionsTable.id, inspectionId))
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const accessLink = `${appUrl}/inspection/${accessToken}`

    // Prepare email content
    const inspectionTypeLabel = inspection.inspectionType === "moving_in" ? "Moving-In" : "Moving-Out"
    const subject = `Please Review and Sign Your ${inspectionTypeLabel} Inspection Report`

    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>${inspectionTypeLabel} Inspection Report - Signature Required</h2>
          <p>Hello ${tenant.name},</p>
          <p>Please review and sign your ${inspectionTypeLabel.toLowerCase()} inspection report for the following property:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Property:</strong> ${property.name}</p>
            <p><strong>Address:</strong> ${property.streetAddress}, ${property.suburb}, ${property.province}</p>
            <p><strong>Inspection Date:</strong> ${new Date(inspection.createdAt).toLocaleDateString()}</p>
          </div>
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Action Required</h3>
            <p>The inspection has been signed by the landlord/agent. Please review the inspection details and sign using the link below.</p>
            <p style="margin-top: 15px;">
              <a href="${accessLink}" style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Review and Sign Inspection Report
              </a>
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Or copy this link: ${accessLink}
            </p>
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            If you have any questions, please contact your property management team.
          </p>
          <p style="margin-top: 10px; color: #666; font-size: 12px;">
            Best regards,<br>
            Property Management Team
          </p>
        </body>
      </html>
    `.trim()

    const textBody = `
${inspectionTypeLabel} Inspection Report - Signature Required

Hello ${tenant.name},

Please review and sign your ${inspectionTypeLabel.toLowerCase()} inspection report for the following property:

Property: ${property.name}
Address: ${property.streetAddress}, ${property.suburb}, ${property.province}
Inspection Date: ${new Date(inspection.createdAt).toLocaleDateString()}

Action Required:
The inspection has been signed by the landlord/agent. Please review the inspection details and sign using the link below.

Review and Sign Inspection Report: ${accessLink}

If you have any questions, please contact your property management team.

Best regards,
Property Management Team
    `.trim()

    // Send email via Postmark
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "inspections@yourdomain.com"
    const postmarkClient = getPostmarkClient()

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: tenant.email,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      TrackOpens: true,
      TrackLinks: "HtmlAndText"
    })

    return {
      isSuccess: true,
      message: "Inspection email sent to tenant successfully"
    }
  } catch (error) {
    console.error("Error sending inspection to tenant:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send inspection to tenant"
    }
  }
}

/**
 * Send move-out report to tenant via Postmark
 */
export async function sendMoveOutReportToTenantAction(
  moveOutInspectionId: string
): Promise<ActionState<void>> {
  try {
    // Get move-out inspection
    const [moveOutInspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, moveOutInspectionId))
      .limit(1)

    if (!moveOutInspection || moveOutInspection.inspectionType !== "moving_out") {
      return { isSuccess: false, message: "Move-out inspection not found" }
    }

    // Get lease and property
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, moveOutInspection.leaseAgreementId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease not found" }
    }

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, lease.tenantId))
      .limit(1)

    if (!tenant || !tenant.email) {
      return { isSuccess: false, message: "Tenant email not found" }
    }

    // Generate move-out report PDF
    const pdfResult = await generateMoveOutReportPDFAction(moveOutInspectionId)
    if (!pdfResult.isSuccess || !pdfResult.data) {
      return { isSuccess: false, message: "Failed to generate move-out report PDF" }
    }

    const pdfBuffer = pdfResult.data
    const base64Content = pdfBuffer.toString("base64")

    // Prepare email content
    const subject = `Move-Out Inspection Report - ${property.name}`

    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Move-Out Inspection Report</h2>
          <p>Hello ${tenant.name},</p>
          <p>Please find your move-out inspection comparison report for the following property:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Property:</strong> ${property.name}</p>
            <p><strong>Address:</strong> ${property.streetAddress}, ${property.suburb}, ${property.province}</p>
            <p><strong>Move-Out Date:</strong> ${new Date(moveOutInspection.createdAt).toLocaleDateString()}</p>
          </div>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3>Important Information</h3>
            <p>This report compares the condition of the property at move-in versus move-out. Any differences or new defects identified are highlighted in the attached report.</p>
            <p>Please review the report carefully. If you have any questions or disputes, please contact us within 7 days.</p>
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            If you have any questions, please contact your property management team.
          </p>
          <p style="margin-top: 10px; color: #666; font-size: 12px;">
            Best regards,<br>
            Property Management Team
          </p>
        </body>
      </html>
    `.trim()

    const textBody = `
Move-Out Inspection Report

Hello ${tenant.name},

Please find your move-out inspection comparison report for the following property:

Property: ${property.name}
Address: ${property.streetAddress}, ${property.suburb}, ${property.province}
Move-Out Date: ${new Date(moveOutInspection.createdAt).toLocaleDateString()}

Important Information:
This report compares the condition of the property at move-in versus move-out. Any differences or new defects identified are highlighted in the attached report.

Please review the report carefully. If you have any questions or disputes, please contact us within 7 days.

If you have any questions, please contact your property management team.

Best regards,
Property Management Team
    `.trim()

    // Send email via Postmark
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "inspections@yourdomain.com"
    const postmarkClient = getPostmarkClient()

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: tenant.email,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      Attachments: [
        {
          Name: `move-out-inspection-report-${moveOutInspectionId}.pdf`,
          Content: base64Content,
          ContentType: "application/pdf",
          ContentLength: pdfBuffer.length
        }
      ],
      TrackOpens: true,
      TrackLinks: "HtmlAndText"
    })

    return {
      isSuccess: true,
      message: "Move-out report email sent to tenant successfully"
    }
  } catch (error) {
    console.error("Error sending move-out report to tenant:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send move-out report to tenant"
    }
  }
}

/**
 * Send signed inspection PDF to tenant after both parties have signed
 */
export async function sendSignedInspectionPDFToTenantAction(
  inspectionId: string
): Promise<ActionState<void>> {
  try {
    // Get inspection
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, inspectionId))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Inspection not found" }
    }

    // Verify both parties have signed
    if (!inspection.signedByTenant || !inspection.signedByLandlord) {
      return { isSuccess: false, message: "Both parties must sign before sending PDF" }
    }

    // Get lease and property
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, inspection.leaseAgreementId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease not found" }
    }

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, lease.tenantId))
      .limit(1)

    if (!tenant || !tenant.email) {
      return { isSuccess: false, message: "Tenant email not found" }
    }

    // Generate filled PDF with both signatures
    const pdfResult = inspection.inspectionType === "moving_out"
      ? await generateMoveOutReportPDFAction(inspectionId)
      : await generateFilledInspectionPDFAction(inspectionId)
    
    if (!pdfResult.isSuccess || !pdfResult.data) {
      return { isSuccess: false, message: "Failed to generate PDF" }
    }

    const pdfBuffer = pdfResult.data
    const base64Content = pdfBuffer.toString("base64")

    // Prepare email content
    const inspectionTypeLabel = inspection.inspectionType === "moving_in" ? "Moving-In" : "Moving-Out"
    const subject = `Your Signed ${inspectionTypeLabel} Inspection Report - ${property.name}`

    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Signed ${inspectionTypeLabel} Inspection Report</h2>
          <p>Hello ${tenant.name},</p>
          <p>Your ${inspectionTypeLabel.toLowerCase()} inspection report has been signed by both parties. Please find the completed report attached.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Property:</strong> ${property.name}</p>
            <p><strong>Address:</strong> ${property.streetAddress}, ${property.suburb}, ${property.province}</p>
            <p><strong>Inspection Date:</strong> ${new Date(inspection.createdAt).toLocaleDateString()}</p>
            <p><strong>Signed Date:</strong> ${inspection.signedAt ? new Date(inspection.signedAt).toLocaleDateString() : "N/A"}</p>
          </div>
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3>✓ Inspection Complete</h3>
            <p>This inspection has been signed by both the landlord/agent and yourself. Please keep this document for your records.</p>
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            If you have any questions, please contact your property management team.
          </p>
          <p style="margin-top: 10px; color: #666; font-size: 12px;">
            Best regards,<br>
            Property Management Team
          </p>
        </body>
      </html>
    `.trim()

    const textBody = `
Signed ${inspectionTypeLabel} Inspection Report

Hello ${tenant.name},

Your ${inspectionTypeLabel.toLowerCase()} inspection report has been signed by both parties. Please find the completed report attached.

Property: ${property.name}
Address: ${property.streetAddress}, ${property.suburb}, ${property.province}
Inspection Date: ${new Date(inspection.createdAt).toLocaleDateString()}
Signed Date: ${inspection.signedAt ? new Date(inspection.signedAt).toLocaleDateString() : "N/A"}

✓ Inspection Complete
This inspection has been signed by both the landlord/agent and yourself. Please keep this document for your records.

If you have any questions, please contact your property management team.

Best regards,
Property Management Team
    `.trim()

    // Send email via Postmark
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "inspections@yourdomain.com"
    const postmarkClient = getPostmarkClient()

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: tenant.email,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      Attachments: [
        {
          Name: `signed-inspection-${inspectionTypeLabel.toLowerCase()}-${inspectionId}.pdf`,
          Content: base64Content,
          ContentType: "application/pdf",
          ContentLength: pdfBuffer.length
        }
      ],
      TrackOpens: true,
      TrackLinks: "HtmlAndText"
    })

    return {
      isSuccess: true,
      message: "Signed inspection PDF sent to tenant successfully"
    }
  } catch (error) {
    console.error("Error sending signed inspection PDF to tenant:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send signed inspection PDF to tenant"
    }
  }
}

/**
 * Send inspection to third-party inspector via Postmark
 */
export async function sendInspectionToInspectorAction(
  inspectionId: string,
  inspectorEmail: string,
  inspectorName: string
): Promise<ActionState<void>> {
  try {
    // Get inspection
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, inspectionId))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Inspection not found" }
    }

    // Get lease and property
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, inspection.leaseAgreementId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease not found" }
    }

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    // Get or generate inspector access token
    let accessToken = inspection.inspectorAccessToken
    if (!accessToken) {
      const crypto = await import("crypto")
      accessToken = crypto.randomBytes(32).toString("hex")
      await db
        .update(movingInspectionsTable)
        .set({
          inspectorAccessToken: accessToken,
          inspectedByThirdParty: true,
          updatedAt: new Date()
        })
        .where(eq(movingInspectionsTable.id, inspectionId))
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const accessLink = `${appUrl}/inspector/${accessToken}`

    // Prepare email content
    const inspectionTypeLabel = inspection.inspectionType === "moving_in" ? "Moving-In" : "Moving-Out"
    const subject = `Property Inspection Request - ${property.name}`

    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Property Inspection Request</h2>
          <p>Hello ${inspectorName},</p>
          <p>You have been assigned to conduct a ${inspectionTypeLabel.toLowerCase()} inspection for the following property:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Property:</strong> ${property.name}</p>
            <p><strong>Address:</strong> ${property.streetAddress}, ${property.suburb}, ${property.province}</p>
            <p><strong>Inspection Type:</strong> ${inspectionTypeLabel}</p>
            <p><strong>Inspection Date:</strong> ${new Date(inspection.createdAt).toLocaleDateString()}</p>
          </div>
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Action Required</h3>
            <p>Please access the inspection form using the link below. You will be able to:</p>
            <ul>
              <li>Fill out the inspection form</li>
              <li>Upload photos for each item</li>
              <li>Set conditions and add comments</li>
              <li>Sign the completed inspection</li>
            </ul>
            <p style="margin-top: 15px;">
              <a href="${accessLink}" style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Access Inspection Form
              </a>
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Or copy this link: ${accessLink}
            </p>
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            If you have any questions, please contact the property management team.
          </p>
          <p style="margin-top: 10px; color: #666; font-size: 12px;">
            Best regards,<br>
            Property Management Team
          </p>
        </body>
      </html>
    `.trim()

    const textBody = `
Property Inspection Request

Hello ${inspectorName},

You have been assigned to conduct a ${inspectionTypeLabel.toLowerCase()} inspection for the following property:

Property: ${property.name}
Address: ${property.streetAddress}, ${property.suburb}, ${property.province}
Inspection Type: ${inspectionTypeLabel}
Inspection Date: ${new Date(inspection.createdAt).toLocaleDateString()}

Action Required:
Please access the inspection form using the link below. You will be able to fill out the inspection form, upload photos, set conditions, add comments, and sign the completed inspection.

Access Inspection Form: ${accessLink}

If you have any questions, please contact the property management team.

Best regards,
Property Management Team
    `.trim()

    // Send email via Postmark
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "inspections@yourdomain.com"
    const postmarkClient = getPostmarkClient()

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: inspectorEmail,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      TrackOpens: true,
      TrackLinks: "HtmlAndText"
    })

    return {
      isSuccess: true,
      message: "Inspection email sent to inspector successfully"
    }
  } catch (error) {
    console.error("Error sending inspection to inspector:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send inspection to inspector"
    }
  }
}

/**
 * Send inspection to tenant after inspector signs (auto-notification)
 */
export async function sendInspectionToTenantAfterInspectorAction(
  inspectionId: string
): Promise<ActionState<void>> {
  try {
    // Get inspection
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.id, inspectionId))
      .limit(1)

    if (!inspection) {
      return { isSuccess: false, message: "Inspection not found" }
    }

    // Verify inspector has signed
    if (!inspection.signedByInspector) {
      return { isSuccess: false, message: "Inspector must sign before sending to tenant" }
    }

    // Get lease and property
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, inspection.leaseAgreementId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease not found" }
    }

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, lease.tenantId))
      .limit(1)

    if (!tenant || !tenant.email) {
      return { isSuccess: false, message: "Tenant email not found" }
    }

    // Generate or get access token for tenant
    let accessToken = inspection.tenantAccessToken
    if (!accessToken) {
      const crypto = await import("crypto")
      accessToken = crypto.randomBytes(32).toString("hex")
      await db
        .update(movingInspectionsTable)
        .set({
          tenantAccessToken: accessToken,
          updatedAt: new Date()
        })
        .where(eq(movingInspectionsTable.id, inspectionId))
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const accessLink = `${appUrl}/inspection/${accessToken}`

    // Generate filled PDF
    const pdfResult = await generateFilledInspectionPDFAction(inspectionId)
    if (!pdfResult.isSuccess || !pdfResult.data) {
      return { isSuccess: false, message: "Failed to generate PDF" }
    }

    const pdfBuffer = pdfResult.data
    const base64Content = pdfBuffer.toString("base64")

    // Prepare email content
    const inspectionTypeLabel = inspection.inspectionType === "moving_in" ? "Moving-In" : "Moving-Out"
    const subject = `Please Review and Sign Your ${inspectionTypeLabel} Inspection Report`

    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>${inspectionTypeLabel} Inspection Report - Signature Required</h2>
          <p>Hello ${tenant.name},</p>
          <p>The ${inspectionTypeLabel.toLowerCase()} inspection for your property has been completed by an independent inspector. Please review and sign the inspection report.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Property:</strong> ${property.name}</p>
            <p><strong>Address:</strong> ${property.streetAddress}, ${property.suburb}, ${property.province}</p>
            <p><strong>Inspection Date:</strong> ${new Date(inspection.createdAt).toLocaleDateString()}</p>
            ${inspection.inspectorName ? `<p><strong>Inspector:</strong> ${inspection.inspectorName}${inspection.inspectorCompany ? ` (${inspection.inspectorCompany})` : ""}</p>` : ""}
          </div>
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Action Required</h3>
            <p>Please review the inspection details and sign using the link below.</p>
            <p style="margin-top: 15px;">
              <a href="${accessLink}" style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Review and Sign Inspection Report
              </a>
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Or copy this link: ${accessLink}
            </p>
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            If you have any questions, please contact your property management team.
          </p>
          <p style="margin-top: 10px; color: #666; font-size: 12px;">
            Best regards,<br>
            Property Management Team
          </p>
        </body>
      </html>
    `.trim()

    const textBody = `
${inspectionTypeLabel} Inspection Report - Signature Required

Hello ${tenant.name},

The ${inspectionTypeLabel.toLowerCase()} inspection for your property has been completed by an independent inspector. Please review and sign the inspection report.

Property: ${property.name}
Address: ${property.streetAddress}, ${property.suburb}, ${property.province}
Inspection Date: ${new Date(inspection.createdAt).toLocaleDateString()}
${inspection.inspectorName ? `Inspector: ${inspection.inspectorName}${inspection.inspectorCompany ? ` (${inspection.inspectorCompany})` : ""}` : ""}

Action Required:
Please review the inspection details and sign using the link below.

Review and Sign Inspection Report: ${accessLink}

If you have any questions, please contact your property management team.

Best regards,
Property Management Team
    `.trim()

    // Send email via Postmark
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "inspections@yourdomain.com"
    const postmarkClient = getPostmarkClient()

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: tenant.email,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      Attachments: [
        {
          Name: `inspection-report-${inspectionTypeLabel.toLowerCase()}-${inspectionId}.pdf`,
          Content: base64Content,
          ContentType: "application/pdf",
          ContentLength: pdfBuffer.length
        }
      ],
      TrackOpens: true,
      TrackLinks: "HtmlAndText"
    })

    return {
      isSuccess: true,
      message: "Inspection email sent to tenant successfully"
    }
  } catch (error) {
    console.error("Error sending inspection to tenant after inspector:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send inspection to tenant"
    }
  }
}
