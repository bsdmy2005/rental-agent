"use server"

import { ServerClient } from "postmark"
import { db } from "@/db"
import {
  leaseAgreementsTable,
  propertiesTable,
  tenantsTable,
  landlordsTable,
  userProfilesTable
} from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"
import type { SelectLeaseAgreement } from "@/db/schema"
import { generateLeasePDFFromIdAction } from "@/lib/lease-pdf-generator"
import { generateLeasePDFWithTemplateAction } from "@/lib/lease-pdf-generator-template"
import { uploadPDFToSupabase } from "@/lib/storage/supabase-storage"
import { randomBytes } from "crypto"

function getPostmarkClient(): ServerClient {
  const apiKey = process.env.POSTMARK_API_KEY || process.env.POSTMARK_SERVER_API_TOKEN
  if (!apiKey) {
    throw new Error("POSTMARK_API_KEY or POSTMARK_SERVER_API_TOKEN not found in environment")
  }
  return new ServerClient(apiKey)
}

/**
 * Generate secure signing token for tenant
 */
function generateSigningToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Get landlord email from property/lease (helper function)
 */
async function getLandlordEmail(property: any, lease: any): Promise<string> {
  let landlordEmail = ""
  
  // First, check property's stored landlord email (this is the source of truth)
  if (property.landlordEmail) {
    landlordEmail = property.landlordEmail
  }
  
  // If not on property, check if landlord email was stored in extractionData during lease creation
  if (!landlordEmail && lease.extractionData && typeof lease.extractionData === 'object' && 'landlordDetails' in lease.extractionData) {
    const storedDetails = (lease.extractionData as any).landlordDetails
    if (storedDetails?.email) {
      landlordEmail = storedDetails.email
    }
  }

  // If still not found, get from property's landlord record (if landlordId exists)
  if (!landlordEmail && property.landlordId) {
    const [landlord] = await db
      .select()
      .from(landlordsTable)
      .where(eq(landlordsTable.id, property.landlordId))
      .limit(1)

    if (landlord) {
      // Get landlord's user profile email
      const [landlordUserProfile] = await db
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, landlord.userProfileId))
        .limit(1)

      landlordEmail = landlord.contactEmail || landlordUserProfile?.email || ""
    }
  }

  // Fallback to property owner details stored on property (when landlordId is null)
  if (!landlordEmail && property.landlordEmail) {
    landlordEmail = property.landlordEmail
  }

  // Final fallback - use environment variable (but this should rarely happen)
  if (!landlordEmail) {
    landlordEmail = process.env.POSTMARK_FROM_EMAIL || ""
  }

  return landlordEmail
}

/**
 * Send lease to landlord for signing
 */
export async function sendLeaseToLandlordAction(
  leaseId: string
): Promise<ActionState<SelectLeaseAgreement>> {
  try {
    // Get lease with manual joins
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, leaseId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    // Get property
    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    // Get landlord email
    const landlordEmail = await getLandlordEmail(property, lease)
    if (!landlordEmail) {
      return {
        isSuccess: false,
        message: "Landlord email not found. Please ensure the landlord email is specified on the property."
      }
    }

    // Generate signing token
    const signingToken = generateSigningToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Generate PDF
    const pdfResult = await generateLeasePDFFromIdAction(leaseId, false)
    if (!pdfResult.isSuccess || !pdfResult.data) {
      return {
        isSuccess: false,
        message: pdfResult.message || "Failed to generate lease PDF"
      }
    }

    // Upload PDF to storage with timestamp to ensure uniqueness
    const timestamp = Date.now()
    const fileName = `lease-${leaseId}-draft-${timestamp}.pdf`
    const storagePath = `leases/${property.id}/${leaseId}/${fileName}`
    const pdfUrl = await uploadPDFToSupabase(pdfResult.data, storagePath)

    // Create signing link - URL encode the token to handle special characters
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const signingLink = `${appUrl}/lease/sign/landlord/${encodeURIComponent(signingToken)}`

    // Update lease with signing info
    const [updatedLease] = await db
      .update(leaseAgreementsTable)
      .set({
        draftPdfUrl: pdfUrl,
        landlordSigningToken: signingToken,
        landlordSigningLink: signingLink,
        landlordSigningExpiresAt: expiresAt,
        initiationStatus: "sent_to_landlord",
        initiatedAt: lease.initiatedAt || new Date()
      })
      .where(eq(leaseAgreementsTable.id, leaseId))
      .returning()

    if (!updatedLease) {
      return { isSuccess: false, message: "Failed to update lease agreement" }
    }

    // Get tenant for email content
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, lease.tenantId))
      .limit(1)

    // Send email
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "leases@yourdomain.com"
    const postmarkClient = getPostmarkClient()

    const subject = "Please Review and Sign Lease Agreement"
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Lease Agreement for Review</h2>
          <p>Hello,</p>
          <p>Please review and sign the lease agreement for the following property:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Property:</strong> ${property.name}</p>
            <p><strong>Address:</strong> ${property.streetAddress}, ${property.suburb}, ${property.province}</p>
            <p><strong>Tenant:</strong> ${tenant?.name || "N/A"}</p>
            <p><strong>Lease Start:</strong> ${new Date(lease.effectiveStartDate).toLocaleDateString()}</p>
            <p><strong>Lease End:</strong> ${new Date(lease.effectiveEndDate).toLocaleDateString()}</p>
          </div>
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Next Steps</h3>
            <ol>
              <li>Review the attached lease agreement PDF</li>
              <li>Click the signing link below to complete your signature</li>
              <li>Once you sign, the lease will be sent to the tenant for their signature</li>
              <li>The link will expire in 7 days</li>
            </ol>
            <p style="margin-top: 15px;">
              <a href="${signingLink}" style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Sign Lease Agreement
              </a>
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Or copy this link: ${signingLink}
            </p>
          </div>
          <p>Thank you,<br/>Property Management Team</p>
        </body>
      </html>
    `.trim()

    const textBody = `
Lease Agreement for Review

Hello,

Please review and sign the lease agreement for the following property:

Property: ${property.name}
Address: ${property.streetAddress}, ${property.suburb}, ${property.province}
Tenant: ${tenant?.name || "N/A"}
Lease Start: ${new Date(lease.effectiveStartDate).toLocaleDateString()}
Lease End: ${new Date(lease.effectiveEndDate).toLocaleDateString()}

Next Steps:
1. Review the attached lease agreement PDF
2. Click the signing link below to complete your signature
3. Once you sign, the lease will be sent to the tenant for their signature
4. The link will expire in 7 days

Sign Lease Agreement: ${signingLink}

Thank you,
Property Management Team
    `.trim()

    // Convert PDF to base64 for email attachment
    const base64Content = pdfResult.data.toString("base64")

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: landlordEmail,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      Attachments: [
        {
          Name: `lease-agreement-${leaseId}.pdf`,
          Content: base64Content,
          ContentType: "application/pdf",
          ContentLength: pdfResult.data.length
        }
      ],
      TrackOpens: true,
      TrackLinks: "HtmlAndText"
    })

    return {
      isSuccess: true,
      message: "Lease sent to landlord successfully",
      data: updatedLease
    }
  } catch (error) {
    console.error("Error sending lease to landlord:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send lease to landlord"
    }
  }
}

/**
 * Send lease to tenant for signing
 */
export async function sendLeaseToTenantAction(
  leaseId: string
): Promise<ActionState<SelectLeaseAgreement>> {
  try {
    // Get lease with manual joins
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, leaseId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    // Get tenant and property
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, lease.tenantId))
      .limit(1)

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    if (!tenant || !property) {
      return { isSuccess: false, message: "Tenant or property not found" }
    }

    if (!tenant.email) {
      return { isSuccess: false, message: "Tenant email is required" }
    }

    // Generate signing token
    const signingToken = generateSigningToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Generate PDF (will include landlord signature if already signed)
    const pdfResult = await generateLeasePDFFromIdAction(leaseId, false)
    if (!pdfResult.isSuccess || !pdfResult.data) {
      return {
        isSuccess: false,
        message: pdfResult.message || "Failed to generate lease PDF"
      }
    }

    // Use different filename if landlord has already signed (to avoid conflicts)
    // Include timestamp to ensure uniqueness
    const timestamp = Date.now()
    const fileName = lease.signedByLandlord
      ? `lease-${leaseId}-landlord-signed-${timestamp}.pdf`
      : `lease-${leaseId}-draft-${timestamp}.pdf`
    const storagePath = `leases/${property.id}/${leaseId}/${fileName}`
    const pdfUrl = await uploadPDFToSupabase(pdfResult.data, storagePath)

    // Create signing link - URL encode the token to handle special characters
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const signingLink = `${appUrl}/lease/sign/${encodeURIComponent(signingToken)}`

    // Update lease with signing info
    const [updatedLease] = await db
      .update(leaseAgreementsTable)
      .set({
        draftPdfUrl: pdfUrl,
        tenantSigningToken: signingToken,
        tenantSigningLink: signingLink,
        tenantSigningExpiresAt: expiresAt,
        initiationStatus: "sent_to_tenant",
        initiatedAt: new Date()
      })
      .where(eq(leaseAgreementsTable.id, leaseId))
      .returning()

    if (!updatedLease) {
      return { isSuccess: false, message: "Failed to update lease agreement" }
    }

    // Send email
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "leases@yourdomain.com"
    const postmarkClient = getPostmarkClient()

    const subject = "Please Review and Sign Your Lease Agreement"
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Lease Agreement for Review</h2>
          <p>Hello ${tenant.name},</p>
          <p>Please review and sign your lease agreement for the following property:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Property:</strong> ${property.name}</p>
            <p><strong>Address:</strong> ${property.streetAddress}, ${property.suburb}, ${property.province}</p>
            <p><strong>Lease Start:</strong> ${new Date(lease.effectiveStartDate).toLocaleDateString()}</p>
            <p><strong>Lease End:</strong> ${new Date(lease.effectiveEndDate).toLocaleDateString()}</p>
            <p><strong>Monthly Rental:</strong> R ${Number(tenant.rentalAmount || 0).toFixed(2)}</p>
          </div>
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Next Steps</h3>
            <ol>
              <li>Review the attached lease agreement PDF</li>
              <li>Click the signing link below to complete your signature</li>
              <li>The link will expire in 7 days</li>
            </ol>
            <p style="margin-top: 15px;">
              <a href="${signingLink}" style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Sign Lease Agreement
              </a>
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Or copy this link: ${signingLink}
            </p>
          </div>
          <p>If you have any questions, please contact your landlord or rental agent.</p>
          <p>Thank you,<br/>Property Management Team</p>
        </body>
      </html>
    `.trim()

    const textBody = `
Lease Agreement for Review

Hello ${tenant.name},

Please review and sign your lease agreement for the following property:

Property: ${property.name}
Address: ${property.streetAddress}, ${property.suburb}, ${property.province}
Lease Start: ${new Date(lease.effectiveStartDate).toLocaleDateString()}
Lease End: ${new Date(lease.effectiveEndDate).toLocaleDateString()}
Monthly Rental: R ${Number(tenant.rentalAmount || 0).toFixed(2)}

Next Steps:
1. Review the attached lease agreement PDF
2. Click the signing link below to complete your signature
3. The link will expire in 7 days

Sign Lease Agreement: ${signingLink}

If you have any questions, please contact your landlord or rental agent.

Thank you,
Property Management Team
    `.trim()

    // Convert PDF to base64 for email attachment
    const base64Content = pdfResult.data.toString("base64")

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: tenant.email,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      Attachments: [
        {
          Name: `lease-agreement-${leaseId}.pdf`,
          Content: base64Content,
          ContentType: "application/pdf",
          ContentLength: pdfResult.data.length
        }
      ],
      TrackOpens: true,
      TrackLinks: "HtmlAndText"
    })

    return {
      isSuccess: true,
      message: "Lease sent to tenant successfully",
      data: updatedLease
    }
  } catch (error) {
    console.error("Error sending lease to tenant:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send lease to tenant"
    }
  }
}

/**
 * Notify landlord that tenant has signed
 */
export async function notifyLandlordTenantSignedAction(
  leaseId: string
): Promise<ActionState<void>> {
  try {
    // Get lease with manual joins
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, leaseId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    // Get tenant and property
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, lease.tenantId))
      .limit(1)

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    if (!tenant || !property) {
      return { isSuccess: false, message: "Tenant or property not found" }
    }

    // Get landlord email using helper function
    const landlordEmail = await getLandlordEmail(property, lease)
    if (!landlordEmail) {
      return {
        isSuccess: false,
        message: "Landlord email not found. Please ensure the landlord email is specified on the property."
      }
    }

    // This function is now obsolete - landlord signs first, then tenant signs
    // This is kept for backward compatibility but should not be called in new workflow
    // In new workflow: landlord signs -> send to tenant -> tenant signs -> send final copies

    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "leases@yourdomain.com"
    const postmarkClient = getPostmarkClient()

    const subject = "Tenant Has Signed Lease - Your Signature Required"
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Tenant Has Signed Lease Agreement</h2>
          <p>The tenant ${tenant.name} has signed the lease agreement for:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Property:</strong> ${property.name}</p>
            <p><strong>Address:</strong> ${property.streetAddress}, ${property.suburb}, ${property.province}</p>
          </div>
          <p>Please review and sign the lease agreement to complete the process.</p>
          <p style="margin-top: 15px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/leases/${leaseId}/sign" style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Sign Lease Agreement
            </a>
          </p>
        </body>
      </html>
    `.trim()

    const textBody = `
Tenant Has Signed Lease Agreement

The tenant ${tenant.name} has signed the lease agreement for:

Property: ${property.name}
Address: ${property.streetAddress}, ${property.suburb}, ${property.province}

Please review and sign the lease agreement to complete the process.

Sign Lease Agreement: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/leases/${leaseId}/sign
    `.trim()

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: landlordEmail,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      TrackOpens: true,
      TrackLinks: "HtmlAndText"
    })

    return {
      isSuccess: true,
      message: "Landlord notified successfully"
    }
  } catch (error) {
    console.error("Error notifying landlord:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to notify landlord"
    }
  }
}

/**
 * Send final signed lease copy to both parties
 */
export async function sendSignedLeaseCopyAction(
  leaseId: string
): Promise<ActionState<void>> {
  try {
    // Get lease with manual joins
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, leaseId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    // Get tenant and property
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, lease.tenantId))
      .limit(1)

    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, lease.propertyId))
      .limit(1)

    if (!tenant || !property) {
      return { isSuccess: false, message: "Tenant or property not found" }
    }

    if (!lease.signedByTenant || !lease.signedByLandlord) {
      return {
        isSuccess: false,
        message: "Lease must be signed by both parties before sending final copy"
      }
    }

    // Generate final signed PDF
    const pdfResult = await generateLeasePDFFromIdAction(leaseId, true)
    if (!pdfResult.isSuccess || !pdfResult.data) {
      return {
        isSuccess: false,
        message: pdfResult.message || "Failed to generate final lease PDF"
      }
    }

    // Upload final PDF
    const fileName = `lease-${leaseId}-signed.pdf`
    const storagePath = `leases/${property.id}/${leaseId}/${fileName}`
    const pdfUrl = await uploadPDFToSupabase(pdfResult.data, storagePath)

    // Update lease with final PDF URL
    await db
      .update(leaseAgreementsTable)
      .set({
        finalPdfUrl: pdfUrl,
        fileUrl: pdfUrl, // Update main file URL to final signed version
        fileName: fileName
      })
      .where(eq(leaseAgreementsTable.id, leaseId))

    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "leases@yourdomain.com"
    const postmarkClient = getPostmarkClient()
    const base64Content = pdfResult.data.toString("base64")

    const subject = "Your Fully Executed Lease Agreement"
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Lease Agreement Fully Executed</h2>
          <p>Your lease agreement has been fully executed and signed by both parties.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Property:</strong> ${property.name}</p>
            <p><strong>Address:</strong> ${property.streetAddress}, ${property.suburb}, ${property.province}</p>
            <p><strong>Lease Start:</strong> ${new Date(lease.effectiveStartDate).toLocaleDateString()}</p>
            <p><strong>Lease End:</strong> ${new Date(lease.effectiveEndDate).toLocaleDateString()}</p>
          </div>
          <p>Please find the fully executed lease agreement attached.</p>
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Complete the moving-in inspection</li>
            <li>Arrange key handover</li>
            <li>Set up payment method for rent</li>
          </ul>
          <p>Thank you,<br/>Property Management Team</p>
        </body>
      </html>
    `.trim()

    const textBody = `
Lease Agreement Fully Executed

Your lease agreement has been fully executed and signed by both parties.

Property: ${property.name}
Address: ${property.streetAddress}, ${property.suburb}, ${property.province}
Lease Start: ${new Date(lease.effectiveStartDate).toLocaleDateString()}
Lease End: ${new Date(lease.effectiveEndDate).toLocaleDateString()}

Please find the fully executed lease agreement attached.

Next Steps:
- Complete the moving-in inspection
- Arrange key handover
- Set up payment method for rent

Thank you,
Property Management Team
    `.trim()

    // Send to tenant
    if (tenant.email) {
      await postmarkClient.sendEmail({
        From: fromEmail,
        To: tenant.email,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody,
        Attachments: [
          {
            Name: fileName,
            Content: base64Content,
            ContentType: "application/pdf",
            ContentLength: pdfResult.data.length
          }
        ],
        TrackOpens: true,
        TrackLinks: "HtmlAndText"
      })
    }

    // Get landlord email using helper function
    const landlordEmail = await getLandlordEmail(property, lease)
    if (landlordEmail) {
      await postmarkClient.sendEmail({
        From: fromEmail,
        To: landlordEmail,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody,
        Attachments: [
          {
            Name: fileName,
            Content: base64Content,
            ContentType: "application/pdf",
            ContentLength: pdfResult.data.length
          }
        ],
        TrackOpens: true,
        TrackLinks: "HtmlAndText"
      })
    } else {
      console.warn(`Could not find landlord email for lease ${leaseId}. Skipping landlord notification.`)
    }

    return {
      isSuccess: true,
      message: "Signed lease copies sent successfully"
    }
  } catch (error) {
    console.error("Error sending signed lease copy:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to send signed lease copy"
    }
  }
}

