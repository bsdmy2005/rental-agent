"use server"

import React from "react"
import { renderToStream } from "@react-pdf/renderer"
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import { db } from "@/db"
import { leaseAgreementsTable, propertiesTable, tenantsTable, landlordsTable, userProfilesTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"
import type { SelectLeaseAgreement } from "@/db/schema"
import { generateLeasePDFWithTemplateAction } from "@/lib/lease-pdf-generator-template"

interface LeaseData {
  propertyAddress: string
  propertyType?: string
  landlordName: string
  landlordIdNumber?: string
  landlordAddress?: string
  landlordEmail?: string
  landlordPhone?: string
  landlordBankDetails?: {
    bankName?: string
    accountHolderName?: string
    accountNumber?: string
    branchCode?: string
  }
  tenantName: string
  tenantIdNumber: string
  tenantEmail?: string
  tenantPhone?: string
  tenantAddress?: string
  leaseStartDate: Date
  leaseEndDate: Date
  leaseDate: Date // Date when lease agreement is created/signed
  monthlyRental: number
  depositAmount?: number
  paymentMethod?: string
  escalationType?: "percentage" | "fixed_amount" | "cpi" | "none"
  escalationPercentage?: number
  escalationFixedAmount?: number
  specialConditions?: string
  signedAtLocation?: string // Location where the lease will be signed
  isDraft?: boolean
  tenantSignatureData?: any
  landlordSignatureData?: any
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica"
  },
  draftWatermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "rotate(-45deg) translate(-50%, -50%)",
    fontSize: 72,
    color: "#cccccc",
    opacity: 0.3,
    fontWeight: "bold"
  },
  executedStamp: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "#4caf50",
    color: "white",
    padding: 10,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: "bold"
  },
  header: {
    marginBottom: 30,
    textAlign: "center"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottom: "1px solid #ccc",
    paddingBottom: 4
  },
  row: {
    flexDirection: "row",
    marginBottom: 5
  },
  label: {
    width: "40%",
    fontWeight: "bold"
  },
  value: {
    width: "60%"
  },
  signatureSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: "1px solid #ccc"
  },
  signatureBlock: {
    marginTop: 30,
    width: "45%"
  },
  signatureLine: {
    borderTop: "1px solid #000",
    marginTop: 50,
    paddingTop: 5
  },
  signatureLabel: {
    fontSize: 9,
    marginTop: 5
  }
})

const LeasePDFTemplate: React.FC<{ data: LeaseData }> = ({ data }) => {
  const formatCurrency = (amount: number) => `R ${amount.toFixed(2)}`
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {data.isDraft && (
          <View style={styles.draftWatermark}>
            <Text>DRAFT</Text>
          </View>
        )}
        {!data.isDraft && data.tenantSignatureData && data.landlordSignatureData && (
          <View style={styles.executedStamp}>
            <Text>FULLY EXECUTED</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>LEASE AGREEMENT</Text>
          <Text style={styles.subtitle}>Residential Rental Agreement</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARTIES</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Landlord:</Text>
            <Text style={styles.value}>{data.landlordName}</Text>
          </View>
          {data.landlordIdNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>ID/Registration:</Text>
              <Text style={styles.value}>{data.landlordIdNumber}</Text>
            </View>
          )}
          {data.landlordAddress && (
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{data.landlordAddress}</Text>
            </View>
          )}
          {data.landlordEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{data.landlordEmail}</Text>
            </View>
          )}
          {data.landlordPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{data.landlordPhone}</Text>
            </View>
          )}

          <View style={[styles.row, { marginTop: 15 }]}>
            <Text style={styles.label}>Tenant:</Text>
            <Text style={styles.value}>{data.tenantName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>ID Number:</Text>
            <Text style={styles.value}>{data.tenantIdNumber}</Text>
          </View>
          {data.tenantEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{data.tenantEmail}</Text>
            </View>
          )}
          {data.tenantPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{data.tenantPhone}</Text>
            </View>
          )}
          {data.tenantAddress && (
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{data.tenantAddress}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROPERTY</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{data.propertyAddress}</Text>
          </View>
          {data.propertyType && (
            <View style={styles.row}>
              <Text style={styles.label}>Type:</Text>
              <Text style={styles.value}>{data.propertyType}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEASE TERMS</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Lease Start Date:</Text>
            <Text style={styles.value}>{formatDate(data.leaseStartDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Lease End Date:</Text>
            <Text style={styles.value}>{formatDate(data.leaseEndDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Monthly Rental:</Text>
            <Text style={styles.value}>{formatCurrency(data.monthlyRental)}</Text>
          </View>
          {data.depositAmount && (
            <View style={styles.row}>
              <Text style={styles.label}>Deposit Amount:</Text>
              <Text style={styles.value}>{formatCurrency(data.depositAmount)}</Text>
            </View>
          )}
          {data.paymentMethod && (
            <View style={styles.row}>
              <Text style={styles.label}>Payment Method:</Text>
              <Text style={styles.value}>{data.paymentMethod}</Text>
            </View>
          )}
          {data.escalationType && data.escalationType !== "none" && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Escalation Type:</Text>
                <Text style={styles.value}>
                  {data.escalationType === "percentage" && data.escalationPercentage
                    ? `${data.escalationPercentage}% annually`
                    : data.escalationType === "fixed_amount" && data.escalationFixedAmount
                    ? `${formatCurrency(data.escalationFixedAmount)} annually`
                    : data.escalationType === "cpi"
                    ? "CPI-linked"
                    : "N/A"}
                </Text>
              </View>
            </>
          )}
        </View>

        {data.landlordBankDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BANKING DETAILS</Text>
            {data.landlordBankDetails.bankName && (
              <View style={styles.row}>
                <Text style={styles.label}>Bank:</Text>
                <Text style={styles.value}>{data.landlordBankDetails.bankName}</Text>
              </View>
            )}
            {data.landlordBankDetails.accountHolderName && (
              <View style={styles.row}>
                <Text style={styles.label}>Account Holder:</Text>
                <Text style={styles.value}>{data.landlordBankDetails.accountHolderName}</Text>
              </View>
            )}
            {data.landlordBankDetails.accountNumber && (
              <View style={styles.row}>
                <Text style={styles.label}>Account Number:</Text>
                <Text style={styles.value}>{data.landlordBankDetails.accountNumber}</Text>
              </View>
            )}
            {data.landlordBankDetails.branchCode && (
              <View style={styles.row}>
                <Text style={styles.label}>Branch Code:</Text>
                <Text style={styles.value}>{data.landlordBankDetails.branchCode}</Text>
              </View>
            )}
          </View>
        )}

        {data.specialConditions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SPECIAL CONDITIONS</Text>
            <Text>{data.specialConditions}</Text>
          </View>
        )}

        <View style={styles.signatureSection}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={styles.signatureBlock}>
              {(() => {
                const sigData = data.tenantSignatureData
                const sigImage = typeof sigData === "string" ? sigData : sigData?.image
                const sigDate = typeof sigData === "object" && sigData?.signedAt ? sigData.signedAt : null
                
                return sigImage ? (
                  <View style={{ marginBottom: 10 }}>
                    <Image
                      src={sigImage}
                      style={{ width: 150, height: 60, objectFit: "contain" }}
                    />
                  </View>
                ) : (
                  <View style={styles.signatureLine} />
                )
              })()}
              <Text style={styles.signatureLabel}>Tenant Signature</Text>
              <Text style={styles.signatureLabel}>{data.tenantName}</Text>
              <Text style={[styles.signatureLabel, { fontSize: 8, marginTop: 5 }]}>
                Date: {(() => {
                  const sigData = data.tenantSignatureData
                  if (typeof sigData === "object" && sigData?.signedAt) {
                    return formatDate(new Date(sigData.signedAt))
                  }
                  if (sigData) {
                    return formatDate(new Date())
                  }
                  return "___________"
                })()}
              </Text>
            </View>

            <View style={styles.signatureBlock}>
              {(() => {
                const sigData = data.landlordSignatureData
                const sigImage = typeof sigData === "string" ? sigData : sigData?.image
                const sigDate = typeof sigData === "object" && sigData?.signedAt ? sigData.signedAt : null
                
                return sigImage ? (
                  <View style={{ marginBottom: 10 }}>
                    <Image
                      src={sigImage}
                      style={{ width: 150, height: 60, objectFit: "contain" }}
                    />
                  </View>
                ) : (
                  <View style={styles.signatureLine} />
                )
              })()}
              <Text style={styles.signatureLabel}>Landlord Signature</Text>
              <Text style={styles.signatureLabel}>{data.landlordName}</Text>
              <Text style={[styles.signatureLabel, { fontSize: 8, marginTop: 5 }]}>
                Date: {(() => {
                  const sigData = data.landlordSignatureData
                  if (typeof sigData === "object" && sigData?.signedAt) {
                    return formatDate(new Date(sigData.signedAt))
                  }
                  if (sigData) {
                    return formatDate(new Date())
                  }
                  return "___________"
                })()}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/**
 * Generate lease PDF from lease data
 * @param leaseData - Lease data to populate the PDF
 * @param templateId - Optional template ID (for future template-based generation)
 */
export async function generateLeasePDFAction(
  leaseData: LeaseData,
  templateId?: string
): Promise<ActionState<Buffer>> {
  try {
    const pdfDoc = <LeasePDFTemplate data={leaseData} />
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
    console.error("Error generating lease PDF:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate lease PDF"
    }
  }
}

/**
 * Generate lease PDF from lease agreement ID
 */
export async function generateLeasePDFFromIdAction(
  leaseId: string,
  includeSignatures: boolean = false
): Promise<ActionState<Buffer>> {
  try {
    // Get lease with manual joins
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, leaseId))
      .limit(1)

    if (!lease) {
      return {
        isSuccess: false,
        message: "Lease agreement not found"
      }
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
      return {
        isSuccess: false,
        message: "Tenant or property not found"
      }
    }

    // Get landlord details - prioritize stored details from extractionData, then database
    let landlordName = ""
    let landlordIdNumber = ""
    let landlordAddress = ""
    let landlordEmail = ""
    let landlordPhone = ""
    let landlordBankDetails: { bankName?: string; accountHolderName?: string; accountNumber?: string; branchCode?: string } | undefined = undefined

    // Check if landlord details were stored in extractionData during lease initiation
    if (lease.extractionData && typeof lease.extractionData === 'object' && 'landlordDetails' in lease.extractionData) {
      const storedDetails = (lease.extractionData as any).landlordDetails
      if (storedDetails) {
        landlordName = storedDetails.name || ""
        landlordIdNumber = storedDetails.idNumber || ""
        landlordAddress = storedDetails.address || ""
        landlordEmail = storedDetails.email || ""
        landlordPhone = storedDetails.phone || ""
        landlordBankDetails = storedDetails.bankDetails || undefined
      }
    }

    // Fallback to database if stored details are not available (only if landlordId exists)
    if ((!landlordName || !landlordEmail) && property.landlordId) {
      const [landlord] = await db
        .select()
        .from(landlordsTable)
        .where(eq(landlordsTable.id, property.landlordId))
        .limit(1)

      // Get user profile for landlord
      const [landlordUserProfile] = landlord
        ? await db
            .select()
            .from(userProfilesTable)
            .where(eq(userProfilesTable.id, landlord.userProfileId))
            .limit(1)
        : []

      // Get bank details from property
      if (!landlordBankDetails && (property.bankName || property.accountHolderName || property.accountNumber || property.branchCode)) {
        landlordBankDetails = {
          bankName: property.bankName || undefined,
          accountHolderName: property.accountHolderName || undefined,
          accountNumber: property.accountNumber || undefined,
          branchCode: property.branchCode || undefined
        }
      }

      landlordName = landlordName || landlord?.companyName || 
        (landlordUserProfile ? `${landlordUserProfile.firstName || ""} ${landlordUserProfile.lastName || ""}`.trim() : "Landlord") ||
        "Landlord"
      landlordEmail = landlordEmail || landlord?.contactEmail || landlordUserProfile?.email || ""
      landlordPhone = landlordPhone || landlord?.contactPhone || landlordUserProfile?.phone || ""
      landlordAddress = landlordAddress || landlord?.address || ""
      landlordIdNumber = landlordIdNumber || landlord?.registrationNumber || landlord?.taxId || ""
    }

    // Fallback to property owner details stored on property (when landlordId is null)
    if (!landlordName && property.landlordName) {
      landlordName = property.landlordName
    }
    if (!landlordEmail && property.landlordEmail) {
      landlordEmail = property.landlordEmail
    }
    if (!landlordPhone && property.landlordPhone) {
      landlordPhone = property.landlordPhone
    }
    if (!landlordAddress && property.landlordAddress) {
      landlordAddress = property.landlordAddress
    }
    if (!landlordIdNumber && property.landlordIdNumber) {
      landlordIdNumber = property.landlordIdNumber
    }

    // Handle signature data - ensure it's in the correct format
    let tenantSignatureData = undefined
    if (includeSignatures && lease.signedByTenant && lease.tenantSignatureData) {
      const sigData = lease.tenantSignatureData
      tenantSignatureData = typeof sigData === "string" 
        ? { image: sigData, signedAt: lease.tenantCompletedAt?.toISOString() || new Date().toISOString() }
        : sigData
    }

    let landlordSignatureData = undefined
    if (includeSignatures && lease.signedByLandlord && lease.landlordSignatureData) {
      const sigData = lease.landlordSignatureData
      landlordSignatureData = typeof sigData === "string"
        ? { image: sigData, signedAt: lease.landlordCompletedAt?.toISOString() || new Date().toISOString() }
        : sigData
    }

    // Get tenant details - prioritize stored details from extractionData, then database
    let tenantName = tenant.name || ""
    let tenantIdNumber = tenant.idNumber || ""
    let tenantEmail = tenant.email || ""
    let tenantPhone = tenant.phone || ""
    let tenantAddress = "" // Address is not stored in tenant schema, get from extractionData if available

    // Check if tenant details were stored in extractionData during lease initiation
    if (lease.extractionData && typeof lease.extractionData === 'object' && 'tenantDetails' in lease.extractionData) {
      const storedTenantDetails = (lease.extractionData as any).tenantDetails
      if (storedTenantDetails) {
        tenantName = storedTenantDetails.name || tenantName
        tenantIdNumber = storedTenantDetails.idNumber || tenantIdNumber
        tenantEmail = storedTenantDetails.email || tenantEmail
        tenantPhone = storedTenantDetails.phone || tenantPhone
        tenantAddress = storedTenantDetails.address || tenantAddress
      }
    }
    
    // Ensure required fields are not empty (email and phone are required for lease)
    if (!tenantEmail || !tenantPhone) {
      console.warn("Tenant email or phone is missing:", { tenantEmail, tenantPhone, tenantId: tenant.id })
    }

    // Get templateFieldValues and signedAtLocation from extractionData if available
    let templateFieldValues: Record<string, string> | undefined = undefined
    let signedAtLocation: string | undefined = undefined
    if (lease.extractionData && typeof lease.extractionData === 'object') {
      if ('templateFieldValues' in lease.extractionData) {
        templateFieldValues = (lease.extractionData as any).templateFieldValues || undefined
      }
      if ('signedAtLocation' in lease.extractionData) {
        signedAtLocation = (lease.extractionData as any).signedAtLocation || undefined
      }
    }

    const leaseData: LeaseData = {
      propertyAddress: `${property.streetAddress}, ${property.suburb}, ${property.province}`,
      propertyType: property.propertyType || undefined,
      landlordName,
      landlordIdNumber,
      landlordAddress,
      landlordEmail,
      landlordPhone,
      landlordBankDetails,
      tenantName: tenantName || "",
      tenantIdNumber: tenantIdNumber || "",
      tenantEmail: tenantEmail || "",
      tenantPhone: tenantPhone || "",
      tenantAddress: tenantAddress || "",
      leaseStartDate: new Date(lease.effectiveStartDate),
      leaseEndDate: new Date(lease.effectiveEndDate),
      leaseDate: lease.initiatedAt ? new Date(lease.initiatedAt) : new Date(), // Use initiated date or current date
      monthlyRental: Number(tenant.rentalAmount || 0),
      escalationType: lease.escalationType || undefined,
      escalationPercentage: lease.escalationPercentage ? Number(lease.escalationPercentage) : undefined,
      escalationFixedAmount: lease.escalationFixedAmount ? Number(lease.escalationFixedAmount) : undefined,
      templateFieldValues,
      signedAtLocation,
      isDraft: !includeSignatures || (!lease.signedByTenant && !lease.signedByLandlord),
      tenantSignatureData,
      landlordSignatureData
    }

    // If both parties have signed, always include signatures and mark as final
    if (lease.signedByTenant && lease.signedByLandlord) {
      leaseData.isDraft = false
      // Signatures are already set above
    }

    // Get templateId from extractionData if available
    const templateId = lease.extractionData && typeof lease.extractionData === 'object' && 'templateId' in lease.extractionData
      ? (lease.extractionData as any).templateId
      : undefined

    // Use template-based generation
    return await generateLeasePDFWithTemplateAction(leaseData, templateId)
  } catch (error) {
    console.error("Error generating lease PDF from ID:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to generate lease PDF"
    }
  }
}

