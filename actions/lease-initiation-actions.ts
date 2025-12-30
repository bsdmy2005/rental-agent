"use server"

import { db } from "@/db"
import {
  leaseAgreementsTable,
  tenantsTable,
  propertiesTable,
  leaseTemplatesTable
} from "@/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { ActionState } from "@/types"
import type { InsertLeaseAgreement, SelectLeaseAgreement } from "@/db/schema"
import { generateLeasePDFAction } from "@/lib/lease-pdf-generator"
import { generateLeasePDFWithTemplateAction } from "@/lib/lease-pdf-generator-template"
import { uploadPDFToSupabase } from "@/lib/storage/supabase-storage"
import { sendLeaseToTenantAction } from "@/lib/email/lease-email-service"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getDefaultLeaseTemplateAction } from "@/actions/lease-templates-actions"
import { randomBytes } from "crypto"

interface InitiateLeaseData {
  propertyId: string
  templateId?: string // Lease template ID
  tenantId?: string // Existing tenant
  tenantName?: string // New tenant
  tenantEmail?: string
  tenantIdNumber?: string
  tenantPhone?: string
  tenantAddress?: string
  leaseStartDate: Date
  leaseEndDate: Date
  monthlyRental: number
  depositAmount?: number
  paymentMethod?: string
  escalationType?: "percentage" | "fixed_amount" | "cpi" | "none"
  escalationPercentage?: number
  escalationFixedAmount?: number
  specialConditions?: string
  landlordName?: string
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
  sendToTenant?: boolean // Whether to send email immediately
}

/**
 * Initiate a new lease agreement
 */
export async function initiateLeaseAction(
  data: InitiateLeaseData
): Promise<ActionState<SelectLeaseAgreement>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get user profile to determine landlord/agent
    const userProfile = await getUserProfileByClerkIdQuery(userId)

    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // Get property (use manual select to ensure all fields including landlord details are fetched)
    const [property] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, data.propertyId))
      .limit(1)

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    // Get or create tenant
    let tenantId: string
    let tenantName = ""
    let tenantIdNumber = ""
    let tenantEmail = ""
    let tenantPhone = ""
    let tenantAddress = ""

    if (data.tenantId) {
      // Fetch existing tenant with all details
      const existingTenant = await db.query.tenants.findFirst({
        where: eq(tenantsTable.id, data.tenantId)
      })

      if (!existingTenant) {
        return {
          isSuccess: false,
          message: "Tenant not found"
        }
      }

      tenantId = existingTenant.id
      tenantName = existingTenant.name || ""
      tenantIdNumber = existingTenant.idNumber || ""
      tenantEmail = existingTenant.email || ""
      tenantPhone = existingTenant.phone || ""
      // Note: tenant address is not stored in tenant schema, use form data if provided
      tenantAddress = data.tenantAddress || ""

      // Validate required tenant fields
      const missingTenantFields: string[] = []
      if (!tenantName) missingTenantFields.push("Name")
      if (!tenantIdNumber) missingTenantFields.push("ID Number")
      if (!tenantEmail) missingTenantFields.push("Email")
      if (!tenantPhone) missingTenantFields.push("Contact Number")
      
      if (missingTenantFields.length > 0) {
        return {
          isSuccess: false,
          message: `Tenant record is incomplete. Missing: ${missingTenantFields.join(", ")}. Please update the tenant record before creating a lease.`
        }
      }
    } else {
      // Create new tenant
      if (!data.tenantName || !data.tenantIdNumber || !data.tenantEmail) {
        return {
          isSuccess: false,
          message: "Tenant name, ID number, and email are required for new tenants"
        }
      }

      // Validate required fields for new tenant
      if (!data.tenantName || !data.tenantIdNumber || !data.tenantEmail || !data.tenantPhone) {
        const missingFields: string[] = []
        if (!data.tenantName) missingFields.push("Name")
        if (!data.tenantIdNumber) missingFields.push("ID Number")
        if (!data.tenantEmail) missingFields.push("Email")
        if (!data.tenantPhone) missingFields.push("Contact Number")
        
        return {
          isSuccess: false,
          message: `Missing required tenant fields: ${missingFields.join(", ")}`
        }
      }

      const [newTenant] = await db
        .insert(tenantsTable)
        .values({
          propertyId: data.propertyId,
          name: data.tenantName,
          idNumber: data.tenantIdNumber,
          email: data.tenantEmail,
          phone: data.tenantPhone,
          rentalAmount: data.monthlyRental.toString()
        })
        .returning()

      if (!newTenant) {
        return { isSuccess: false, message: "Failed to create tenant" }
      }

      tenantId = newTenant.id
      tenantName = newTenant.name || ""
      tenantIdNumber = newTenant.idNumber || ""
      tenantEmail = newTenant.email || ""
      tenantPhone = newTenant.phone || ""
      tenantAddress = data.tenantAddress || "" // Address is not stored in tenant schema, use form data
    }

    // Get template (use provided or default)
    let templateId: string | null = null
    if (data.templateId) {
      const [template] = await db
        .select()
        .from(leaseTemplatesTable)
        .where(eq(leaseTemplatesTable.id, data.templateId))
        .limit(1)
      if (template) {
        templateId = template.id
      }
    }
    
    // If no template specified, get default
    if (!templateId) {
      const defaultTemplateResult = await getDefaultLeaseTemplateAction()
      if (defaultTemplateResult.isSuccess && defaultTemplateResult.data) {
        templateId = defaultTemplateResult.data.id
      }
    }

    // Get landlord/rental agent details - prioritize form data, then PROPERTY landlord details, then database, then user profile
    // Use nullish coalescing (??) to only use fallback if value is null/undefined (not empty string)
    let landlordName = data.landlordName
    let landlordIdNumber = data.landlordIdNumber
    let landlordAddress = data.landlordAddress
    let landlordEmail = data.landlordEmail
    let landlordPhone = data.landlordPhone
    let landlordBankDetails = data.landlordBankDetails

    // PRIORITY 1: Check property's stored landlord details (this is the source of truth for the property)
    if (property.landlordName || property.landlordEmail || property.landlordPhone || property.landlordIdNumber || property.landlordAddress) {
      landlordName = landlordName ?? property.landlordName ?? ""
      landlordIdNumber = landlordIdNumber ?? property.landlordIdNumber ?? ""
      landlordAddress = landlordAddress ?? property.landlordAddress ?? ""
      landlordEmail = landlordEmail ?? property.landlordEmail ?? ""
      landlordPhone = landlordPhone ?? property.landlordPhone ?? ""
    }

    // PRIORITY 2: Fetch from database based on user type (only if form values and property values are not provided)
    if (userProfile.userType === "landlord") {
      const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
      if (landlord) {
        landlordName = landlordName ?? landlord.companyName ?? (`${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || "Landlord")
        landlordIdNumber = landlordIdNumber ?? landlord.registrationNumber ?? landlord.taxId ?? ""
        landlordAddress = landlordAddress ?? landlord.address ?? ""
        landlordEmail = landlordEmail ?? landlord.contactEmail ?? userProfile.email
        landlordPhone = landlordPhone ?? landlord.contactPhone ?? userProfile.phone ?? ""
      } else {
        // Fallback to user profile
        landlordName = landlordName ?? (`${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || "Landlord")
        landlordEmail = landlordEmail ?? userProfile.email
        landlordPhone = landlordPhone ?? userProfile.phone ?? ""
      }
    } else if (userProfile.userType === "rental_agent") {
      const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
      if (rentalAgent) {
        landlordName = landlordName ?? rentalAgent.agencyName ?? (`${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || "Rental Agent")
        
        landlordIdNumber = landlordIdNumber ?? rentalAgent.licenseNumber ?? ""
        landlordAddress = landlordAddress ?? rentalAgent.address ?? ""
        landlordEmail = landlordEmail ?? rentalAgent.contactEmail ?? userProfile.email
        landlordPhone = landlordPhone ?? rentalAgent.contactPhone ?? userProfile.phone ?? ""
      } else {
        // Fallback to user profile
        landlordName = landlordName ?? (`${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || "Rental Agent")
        landlordEmail = landlordEmail ?? userProfile.email
        landlordPhone = landlordPhone ?? userProfile.phone ?? ""
      }
    }
    
    // Ensure all values are strings (not undefined)
    landlordName = landlordName || ""
    landlordIdNumber = landlordIdNumber || ""
    landlordAddress = landlordAddress || ""
    landlordEmail = landlordEmail || ""
    landlordPhone = landlordPhone || ""

    // Get bank details from property if not provided
    if (!landlordBankDetails && (property.bankName || property.accountHolderName || property.accountNumber || property.branchCode)) {
      landlordBankDetails = {
        bankName: property.bankName || undefined,
        accountHolderName: property.accountHolderName || undefined,
        accountNumber: property.accountNumber || undefined,
        branchCode: property.branchCode || undefined
      }
    }

    // Validate required landlord fields
    const missingFields: string[] = []
    if (!landlordName) missingFields.push("Landlord Name")
    if (!landlordEmail) missingFields.push("Landlord Email")
    if (!landlordIdNumber) missingFields.push("Landlord ID/Registration Number")
    if (!landlordAddress) missingFields.push("Landlord Address")
    if (!landlordPhone) missingFields.push("Landlord Contact Number")
    
    if (missingFields.length > 0) {
      return {
        isSuccess: false,
        message: `Please complete the following required landlord information: ${missingFields.join(", ")}. You can update your profile or provide these details when creating the lease.`
      }
    }

    // Generate draft PDF
    // Ensure all landlord fields are strings (not undefined) for proper rendering
    console.log("Lease data being generated:", {
      landlordName,
      landlordIdNumber,
      landlordAddress,
      landlordEmail,
      landlordPhone
    })
    
    const leaseData = {
      propertyAddress: `${property.streetAddress}, ${property.suburb}, ${property.province}`,
      propertyType: property.propertyType || undefined,
      landlordName: landlordName || "",
      landlordIdNumber: landlordIdNumber || "",
      landlordAddress: landlordAddress || "",
      landlordEmail: landlordEmail || "",
      landlordPhone: landlordPhone || "",
      landlordBankDetails: landlordBankDetails || undefined,
      leaseDate: new Date(), // Current date when lease is created
      tenantName: tenantName || "",
      tenantIdNumber: tenantIdNumber || "",
      tenantEmail: tenantEmail || "",
      tenantPhone: tenantPhone || "",
      tenantAddress: tenantAddress || "",
      leaseStartDate: data.leaseStartDate,
      leaseEndDate: data.leaseEndDate,
      monthlyRental: data.monthlyRental,
      depositAmount: data.depositAmount,
      paymentMethod: data.paymentMethod,
      escalationType: data.escalationType,
      escalationPercentage: data.escalationPercentage,
      escalationFixedAmount: data.escalationFixedAmount,
      specialConditions: data.specialConditions,
      isDraft: true
    }

    // Use template-based PDF generation if template is available
    const pdfResult = templateId
      ? await generateLeasePDFWithTemplateAction(leaseData, templateId)
      : await generateLeasePDFAction(leaseData, templateId || undefined)
    if (!pdfResult.isSuccess || !pdfResult.data) {
      return {
        isSuccess: false,
        message: pdfResult.message || "Failed to generate lease PDF"
      }
    }

    // Upload PDF to storage
    const fileName = `lease-draft-${Date.now()}.pdf`
    const storagePath = `leases/${data.propertyId}/${fileName}`
    const pdfUrl = await uploadPDFToSupabase(pdfResult.data, storagePath)

    // Create lease agreement record
    // Store landlord and tenant details in extractionData so they persist for PDF regeneration
    const extractionData: Record<string, any> = {
      templateId: templateId || null,
      landlordDetails: {
        name: landlordName,
        idNumber: landlordIdNumber,
        address: landlordAddress,
        email: landlordEmail,
        phone: landlordPhone,
        bankDetails: landlordBankDetails
      },
      tenantDetails: {
        name: tenantName,
        idNumber: tenantIdNumber,
        address: tenantAddress,
        email: tenantEmail,
        phone: tenantPhone
      }
    }
    
    const [lease] = await db
      .insert(leaseAgreementsTable)
      .values({
        tenantId,
        propertyId: data.propertyId,
        fileName,
        fileUrl: pdfUrl,
        effectiveStartDate: data.leaseStartDate,
        effectiveEndDate: data.leaseEndDate,
        initiationMethod: "initiate_new",
        initiationStatus: "draft",
        draftPdfUrl: pdfUrl,
        lifecycleState: "waiting",
        escalationType: data.escalationType || "none",
        escalationPercentage: data.escalationPercentage?.toString() || null,
        escalationFixedAmount: data.escalationFixedAmount?.toString() || null,
        initiatedAt: new Date(),
        extractionData: extractionData // Store templateId and landlord details for later use
      })
      .returning()

    if (!lease) {
      return { isSuccess: false, message: "Failed to create lease agreement" }
    }

    // Send to tenant if requested
    if (data.sendToTenant) {
      const sendResult = await sendLeaseToTenantAction(lease.id)
      if (!sendResult.isSuccess) {
        console.warn("Failed to send lease to tenant:", sendResult.message)
        // Don't fail the whole operation if email fails
      }
    }

    return {
      isSuccess: true,
      message: "Lease initiated successfully",
      data: lease
    }
  } catch (error) {
    console.error("Error initiating lease:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to initiate lease"
    }
  }
}

/**
 * Sign lease as tenant (via token)
 */
export async function signLeaseAsTenantAction(
  leaseId: string,
  token: string,
  signatureData: any
): Promise<ActionState<SelectLeaseAgreement>> {
  try {
    const lease = await db.query.leaseAgreements.findFirst({
      where: eq(leaseAgreementsTable.id, leaseId)
    })

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    // Validate token
    if (lease.tenantSigningToken !== token) {
      return { isSuccess: false, message: "Invalid signing token" }
    }

    if (lease.tenantSigningExpiresAt && new Date(lease.tenantSigningExpiresAt) < new Date()) {
      return { isSuccess: false, message: "Signing token has expired" }
    }

    if (lease.signedByTenant) {
      return { isSuccess: false, message: "Lease already signed by tenant" }
    }

    // Update lease with tenant signature
    const [updatedLease] = await db
      .update(leaseAgreementsTable)
      .set({
        signedByTenant: true,
        tenantSignatureData: signatureData,
        tenantCompletedAt: new Date(),
        initiationStatus: "tenant_signed",
        // Invalidate token after use
        tenantSigningToken: null,
        tenantSigningLink: null
      })
      .where(eq(leaseAgreementsTable.id, leaseId))
      .returning()

    if (!updatedLease) {
      return { isSuccess: false, message: "Failed to update lease agreement" }
    }

    // Notify landlord
    const { notifyLandlordTenantSignedAction } = await import("@/lib/email/lease-email-service")
    await notifyLandlordTenantSignedAction(leaseId)

    return {
      isSuccess: true,
      message: "Lease signed successfully",
      data: updatedLease as SelectLeaseAgreement
    }
  } catch (error) {
    console.error("Error signing lease as tenant:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to sign lease"
    }
  }
}

/**
 * Sign lease as landlord (authenticated)
 */
export async function signLeaseAsLandlordAction(
  leaseId: string,
  signatureData: any
): Promise<ActionState<SelectLeaseAgreement>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get lease with manual query
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, leaseId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    if (lease.signedByLandlord) {
      return { isSuccess: false, message: "Lease already signed by landlord" }
    }

    // Update lease with landlord signature
    const [updatedLease] = await db
      .update(leaseAgreementsTable)
      .set({
        signedByLandlord: true,
        landlordSignatureData: signatureData,
        landlordCompletedAt: new Date(),
        signedAt: new Date(),
        initiationStatus: "fully_executed",
        lifecycleState: "signed"
      })
      .where(eq(leaseAgreementsTable.id, leaseId))
      .returning()

    if (!updatedLease) {
      return { isSuccess: false, message: "Failed to update lease agreement" }
    }

    // Generate final signed PDF and send to both parties
    const { sendSignedLeaseCopyAction } = await import("@/lib/email/lease-email-service")
    await sendSignedLeaseCopyAction(leaseId)

    return {
      isSuccess: true,
      message: "Lease signed successfully",
      data: updatedLease as SelectLeaseAgreement
    }
  } catch (error) {
    console.error("Error signing lease as landlord:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to sign lease"
    }
  }
}

/**
 * Get lease by signing token
 */
export async function getLeaseByTokenAction(
  token: string
): Promise<ActionState<SelectLeaseAgreement & { tenant: any; property: any }>> {
  try {
    if (!token || token.trim() === "") {
      return { isSuccess: false, message: "Signing token is required" }
    }

    // Get lease with manual query - try exact match first
    let [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.tenantSigningToken, token))
      .limit(1)

    // If not found, try URL-decoded version (in case token was double-encoded)
    if (!lease) {
      const decodedToken = decodeURIComponent(token)
      if (decodedToken !== token) {
        [lease] = await db
          .select()
          .from(leaseAgreementsTable)
          .where(eq(leaseAgreementsTable.tenantSigningToken, decodedToken))
          .limit(1)
      }
    }

    if (!lease) {
      console.error("Token lookup failed for token:", token.substring(0, 10) + "...")
      return { isSuccess: false, message: "Invalid signing token. Please use the link from your email." }
    }

    if (lease.tenantSigningExpiresAt && new Date(lease.tenantSigningExpiresAt) < new Date()) {
      return { isSuccess: false, message: "Signing token has expired" }
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

    return {
      isSuccess: true,
      message: "Lease found",
      data: {
        ...lease,
        tenant: tenant || null,
        property: property || null
      } as any
    }
  } catch (error) {
    console.error("Error getting lease by token:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get lease"
    }
  }
}

/**
 * Delete lease agreement (only if not fully signed by both parties)
 */
export async function deleteLeaseAction(
  leaseId: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get lease to check signing status
    const [lease] = await db
      .select()
      .from(leaseAgreementsTable)
      .where(eq(leaseAgreementsTable.id, leaseId))
      .limit(1)

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    // Check if both parties have signed
    if (lease.signedByTenant && lease.signedByLandlord) {
      return {
        isSuccess: false,
        message: "Cannot delete a lease that has been signed by both parties"
      }
    }

    // Delete the lease
    await db.delete(leaseAgreementsTable).where(eq(leaseAgreementsTable.id, leaseId))

    return {
      isSuccess: true,
      message: "Lease deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting lease:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to delete lease"
    }
  }
}

