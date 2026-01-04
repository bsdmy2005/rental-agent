"use server"

import { db } from "@/db"
import {
  serviceProvidersTable,
  serviceProviderAreasTable,
  quoteRequestsTable,
  quotesTable,
  incidentsTable,
  propertiesTable,
  incidentStatusHistoryTable,
  rfqCodesTable,
  type InsertServiceProvider,
  type SelectServiceProvider,
  type InsertServiceProviderArea,
  type SelectServiceProviderArea,
  type InsertQuoteRequest,
  type SelectQuoteRequest,
  type InsertQuote,
  type SelectQuote
} from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, or, ilike, inArray, isNull, desc, gte, lte } from "drizzle-orm"
import type { QuoteExtractionData } from "@/lib/quote-extraction"

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

// Service Provider CRUD Operations

export async function createServiceProviderAction(
  provider: InsertServiceProvider,
  areas?: { suburb: string; city?: string; province: string; country?: string }[]
): Promise<ActionState<SelectServiceProvider>> {
  try {
    // Validate that at least one area with suburb is provided
    if (!areas || areas.length === 0) {
      return {
        isSuccess: false,
        message: "At least one service area with a suburb is required"
      }
    }

    // Validate that all areas have suburbs
    const areasWithoutSuburbs = areas.filter((area) => !area.suburb)
    if (areasWithoutSuburbs.length > 0) {
      return {
        isSuccess: false,
        message: "All service areas must have a suburb specified"
      }
    }

    const [newProvider] = await db.insert(serviceProvidersTable).values(provider).returning()

    if (!newProvider) {
      return { isSuccess: false, message: "Failed to create service provider" }
    }

    // Add service areas
    await db.insert(serviceProviderAreasTable).values(
      areas.map((area) => ({
        serviceProviderId: newProvider.id,
        suburb: area.suburb,
        city: area.city,
        province: area.province,
        country: area.country || "South Africa"
      }))
    )

    return {
      isSuccess: true,
      message: "Service provider created successfully",
      data: newProvider
    }
  } catch (error) {
    console.error("Error creating service provider:", error)
    return { isSuccess: false, message: "Failed to create service provider" }
  }
}

export async function getServiceProvidersByAreaAction(
  suburb?: string,
  city?: string,
  province?: string,
  searchQuery?: string
): Promise<ActionState<SelectServiceProvider[]>> {
  try {
    let providers: SelectServiceProvider[] = []

    if (suburb && province) {
      // Priority 1: Exact suburb match
      const areas = await db
        .select()
        .from(serviceProviderAreasTable)
        .where(
          and(
            ilike(serviceProviderAreasTable.suburb, `%${suburb}%`),
            eq(serviceProviderAreasTable.province, province)
          )
        )

      const providerIds = [...new Set(areas.map((area) => area.serviceProviderId))]
      if (providerIds.length > 0) {
        const conditions = [
          eq(serviceProvidersTable.isActive, true),
          inArray(serviceProvidersTable.id, providerIds)
        ]

        // Add search filter if provided
        if (searchQuery) {
          conditions.push(
            or(
              ilike(serviceProvidersTable.businessName, `%${searchQuery}%`),
              ilike(serviceProvidersTable.contactName, `%${searchQuery}%`)
            )!
          )
        }

        providers = await db
          .select()
          .from(serviceProvidersTable)
          .where(and(...conditions))
      }
    } else if (city && province) {
      // Priority 2: City match
      const areas = await db
        .select()
        .from(serviceProviderAreasTable)
        .where(
          and(
            eq(serviceProviderAreasTable.province, province),
            eq(serviceProviderAreasTable.city, city)
          )
        )

      const providerIds = [...new Set(areas.map((area) => area.serviceProviderId))]
      if (providerIds.length > 0) {
        const conditions = [
          eq(serviceProvidersTable.isActive, true),
          inArray(serviceProvidersTable.id, providerIds)
        ]

        // Add search filter if provided
        if (searchQuery) {
          conditions.push(
            or(
              ilike(serviceProvidersTable.businessName, `%${searchQuery}%`),
              ilike(serviceProvidersTable.contactName, `%${searchQuery}%`)
            )!
          )
        }

        providers = await db
          .select()
          .from(serviceProvidersTable)
          .where(and(...conditions))
      }
    } else if (province) {
      // Priority 3: Province match (fallback)
      const areas = await db
        .select()
        .from(serviceProviderAreasTable)
        .where(eq(serviceProviderAreasTable.province, province))

      const providerIds = [...new Set(areas.map((area) => area.serviceProviderId))]
      if (providerIds.length > 0) {
        const conditions = [
          eq(serviceProvidersTable.isActive, true),
          inArray(serviceProvidersTable.id, providerIds)
        ]

        // Add search filter if provided
        if (searchQuery) {
          conditions.push(
            or(
              ilike(serviceProvidersTable.businessName, `%${searchQuery}%`),
              ilike(serviceProvidersTable.contactName, `%${searchQuery}%`)
            )!
          )
        }

        providers = await db
          .select()
          .from(serviceProvidersTable)
          .where(and(...conditions))
      }
    } else {
      // Get all active providers
      const conditions = [eq(serviceProvidersTable.isActive, true)]

      // Add search filter if provided
      if (searchQuery) {
        conditions.push(
          or(
            ilike(serviceProvidersTable.businessName, `%${searchQuery}%`),
            ilike(serviceProvidersTable.contactName, `%${searchQuery}%`)
          )!
        )
      }

      providers = await db
        .select()
        .from(serviceProvidersTable)
        .where(and(...conditions))
    }

    return {
      isSuccess: true,
      message: "Service providers retrieved successfully",
      data: providers
    }
  } catch (error) {
    console.error("Error getting service providers:", error)
    return { isSuccess: false, message: "Failed to get service providers" }
  }
}

/**
 * Get service providers that can service the property associated with an incident
 */
export async function getServiceProvidersForIncidentAction(
  incidentId: string
): Promise<ActionState<SelectServiceProvider[]>> {
  try {
    // Get incident with property
    const [incident] = await db
      .select({
        propertyId: incidentsTable.propertyId
      })
      .from(incidentsTable)
      .where(eq(incidentsTable.id, incidentId))
      .limit(1)

    if (!incident) {
      return { isSuccess: false, message: "Incident not found" }
    }

    // Get property details
    const [property] = await db
      .select({
        suburb: propertiesTable.suburb,
        province: propertiesTable.province
      })
      .from(propertiesTable)
      .where(eq(propertiesTable.id, incident.propertyId))
      .limit(1)

    if (!property) {
      return { isSuccess: false, message: "Property not found" }
    }

    // Get providers by property location
    const providersResult = await getServiceProvidersByAreaAction(
      property.suburb,
      undefined, // city - not used in current implementation
      property.province
    )

    return providersResult
  } catch (error) {
    console.error("Error getting service providers for incident:", error)
    return { isSuccess: false, message: "Failed to get service providers for incident" }
  }
}

export async function updateServiceProviderAction(
  providerId: string,
  data: Partial<InsertServiceProvider>,
  areas?: { id?: string; suburb: string; city?: string; province: string; country?: string }[]
): Promise<ActionState<SelectServiceProvider>> {
  try {
    const [updatedProvider] = await db
      .update(serviceProvidersTable)
      .set(data)
      .where(eq(serviceProvidersTable.id, providerId))
      .returning()

    if (!updatedProvider) {
      return { isSuccess: false, message: "Service provider not found" }
    }

    // Handle area updates if provided
    if (areas !== undefined) {
      // Validate that at least one area with suburb is provided
      if (areas.length === 0) {
        return {
          isSuccess: false,
          message: "At least one service area with a suburb is required"
        }
      }

      // Validate that all areas have suburbs
      const areasWithoutSuburbs = areas.filter((area) => !area.suburb)
      if (areasWithoutSuburbs.length > 0) {
        return {
          isSuccess: false,
          message: "All service areas must have a suburb specified"
        }
      }

      // Get existing areas
      const existingAreas = await db
        .select()
        .from(serviceProviderAreasTable)
        .where(eq(serviceProviderAreasTable.serviceProviderId, providerId))

      const existingAreaIds = new Set(existingAreas.map((a) => a.id))
      const newAreaIds = new Set(areas.filter((a) => a.id).map((a) => a.id!))

      // Delete removed areas
      const areasToDelete = existingAreas.filter((a) => !newAreaIds.has(a.id))
      if (areasToDelete.length > 0) {
        // Ensure at least one area remains after deletion
        if (existingAreas.length - areasToDelete.length === 0) {
          return {
            isSuccess: false,
            message: "Cannot remove all service areas. At least one area must remain."
          }
        }
        await db
          .delete(serviceProviderAreasTable)
          .where(
            inArray(
              serviceProviderAreasTable.id,
              areasToDelete.map((a) => a.id)
            )
          )
      }

      // Update or insert areas
      for (const area of areas) {
        if (area.id && existingAreaIds.has(area.id)) {
          // Update existing area
          await db
            .update(serviceProviderAreasTable)
            .set({
              suburb: area.suburb,
              city: area.city,
              province: area.province,
              country: area.country || "South Africa"
            })
            .where(eq(serviceProviderAreasTable.id, area.id))
        } else {
          // Insert new area
          await db.insert(serviceProviderAreasTable).values({
            serviceProviderId: providerId,
            suburb: area.suburb,
            city: area.city,
            province: area.province,
            country: area.country || "South Africa"
          })
        }
      }
    }

    return {
      isSuccess: true,
      message: "Service provider updated successfully",
      data: updatedProvider
    }
  } catch (error) {
    console.error("Error updating service provider:", error)
    return { isSuccess: false, message: "Failed to update service provider" }
  }
}

export async function deleteServiceProviderAction(
  providerId: string
): Promise<ActionState<void>> {
  try {
    // Check if provider has active quote requests
    const activeQuotes = await db
      .select()
      .from(quoteRequestsTable)
      .where(
        and(
          eq(quoteRequestsTable.serviceProviderId, providerId),
          or(
            eq(quoteRequestsTable.status, "requested"),
            eq(quoteRequestsTable.status, "quoted")
          )
        )
      )
      .limit(1)

    if (activeQuotes.length > 0) {
      return {
        isSuccess: false,
        message: "Cannot delete service provider with active quote requests. Please resolve or cancel active quotes first."
      }
    }

    // Delete service provider (cascade delete will handle areas)
    await db.delete(serviceProvidersTable).where(eq(serviceProvidersTable.id, providerId))

    return {
      isSuccess: true,
      message: "Service provider deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting service provider:", error)
    return { isSuccess: false, message: "Failed to delete service provider" }
  }
}

// Service Provider Areas Operations

export async function addServiceProviderAreaAction(
  area: InsertServiceProviderArea
): Promise<ActionState<SelectServiceProviderArea>> {
  try {
    const [newArea] = await db.insert(serviceProviderAreasTable).values(area).returning()

    if (!newArea) {
      return { isSuccess: false, message: "Failed to add service provider area" }
    }

    return {
      isSuccess: true,
      message: "Service provider area added successfully",
      data: newArea
    }
  } catch (error) {
    console.error("Error adding service provider area:", error)
    return { isSuccess: false, message: "Failed to add service provider area" }
  }
}

export async function getServiceProviderAreasAction(
  serviceProviderId: string
): Promise<ActionState<SelectServiceProviderArea[]>> {
  try {
    const areas = await db
      .select()
      .from(serviceProviderAreasTable)
      .where(eq(serviceProviderAreasTable.serviceProviderId, serviceProviderId))

    return {
      isSuccess: true,
      message: "Service provider areas retrieved successfully",
      data: areas
    }
  } catch (error) {
    console.error("Error getting service provider areas:", error)
    return { isSuccess: false, message: "Failed to get service provider areas" }
  }
}

export async function updateServiceProviderAreaAction(
  areaId: string,
  data: Partial<InsertServiceProviderArea>
): Promise<ActionState<SelectServiceProviderArea>> {
  try {
    // Validate suburb is not null if provided
    if (data.suburb !== undefined && !data.suburb) {
      return {
        isSuccess: false,
        message: "Suburb is required and cannot be null"
      }
    }

    const [updatedArea] = await db
      .update(serviceProviderAreasTable)
      .set(data)
      .where(eq(serviceProviderAreasTable.id, areaId))
      .returning()

    if (!updatedArea) {
      return { isSuccess: false, message: "Service provider area not found" }
    }

    return {
      isSuccess: true,
      message: "Service provider area updated successfully",
      data: updatedArea
    }
  } catch (error) {
    console.error("Error updating service provider area:", error)
    return { isSuccess: false, message: "Failed to update service provider area" }
  }
}

export async function deleteServiceProviderAreaAction(
  areaId: string
): Promise<ActionState<void>> {
  try {
    // Get the area to check service provider
    const [area] = await db
      .select()
      .from(serviceProviderAreasTable)
      .where(eq(serviceProviderAreasTable.id, areaId))
      .limit(1)

    if (!area) {
      return { isSuccess: false, message: "Service provider area not found" }
    }

    // Check how many areas remain for this provider
    const remainingAreas = await db
      .select()
      .from(serviceProviderAreasTable)
      .where(eq(serviceProviderAreasTable.serviceProviderId, area.serviceProviderId))

    if (remainingAreas.length <= 1) {
      return {
        isSuccess: false,
        message: "Cannot delete the last service area. Service providers must have at least one area."
      }
    }

    // Delete the area
    await db.delete(serviceProviderAreasTable).where(eq(serviceProviderAreasTable.id, areaId))

    return {
      isSuccess: true,
      message: "Service provider area deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting service provider area:", error)
    return { isSuccess: false, message: "Failed to delete service provider area" }
  }
}

/**
 * Migration action to assign suburbs to existing service providers with null suburbs
 * This should be run before enforcing the NOT NULL constraint on suburb
 */
export async function migrateServiceProviderSuburbsAction(): Promise<ActionState<{
  updated: number
  skipped: number
}>> {
  try {
    // Get all service provider areas with null suburbs
    const areasWithNullSuburb = await db
      .select()
      .from(serviceProviderAreasTable)
      .where(isNull(serviceProviderAreasTable.suburb))

    if (areasWithNullSuburb.length === 0) {
      return {
        isSuccess: true,
        message: "No areas with null suburbs found",
        data: { updated: 0, skipped: 0 }
      }
    }

    let updated = 0
    let skipped = 0

    // For each area with null suburb, try to infer suburb from city or use a default
    for (const area of areasWithNullSuburb) {
      // If city is available, use city name as suburb (fallback)
      // Otherwise, use "Unknown" as a placeholder that needs manual update
      const suburb = area.city || "Unknown"

      try {
        await db
          .update(serviceProviderAreasTable)
          .set({ suburb })
          .where(eq(serviceProviderAreasTable.id, area.id))
        updated++
      } catch (error) {
        console.error(`Error updating area ${area.id}:`, error)
        skipped++
      }
    }

    return {
      isSuccess: true,
      message: `Migration completed: ${updated} updated, ${skipped} skipped`,
      data: { updated, skipped }
    }
  } catch (error) {
    console.error("Error migrating service provider suburbs:", error)
    return { isSuccess: false, message: "Failed to migrate service provider suburbs" }
  }
}

// Quote Request Operations

export async function createQuoteRequestAction(
  quoteRequest: InsertQuoteRequest,
  channel?: "email" | "whatsapp" | "both"
): Promise<ActionState<SelectQuoteRequest>> {
  try {
    // Generate unique email address placeholder (will be updated after creation)
    const domain = process.env.POSTMARK_FROM_EMAIL?.split("@")[1] || "yourdomain.com"
    const tempUniqueEmail = `quote-temp@${domain}`

    const [newQuoteRequest] = await db
      .insert(quoteRequestsTable)
      .values({
        ...quoteRequest,
        uniqueEmailAddress: tempUniqueEmail,
        sentCount: 0,
        receivedCount: 0
      })
      .returning()

    if (!newQuoteRequest) {
      return { isSuccess: false, message: "Failed to create quote request" }
    }

    // Update with actual ID-based email
    const finalUniqueEmail = `quote-${newQuoteRequest.id}@${domain}`
    
    // Generate RFQ code if not provided
    let rfqCode: string | null = newQuoteRequest.rfqCode || null
    if (!rfqCode) {
      try {
        const { generateRfqCodeAction } = await import("@/actions/rfq-codes-actions")
        const codeResult = await generateRfqCodeAction(newQuoteRequest.id)
        if (codeResult.isSuccess && codeResult.data) {
          rfqCode = codeResult.data.code
        }
      } catch (codeError) {
        console.warn("Failed to generate RFQ code:", codeError)
        // Continue without code - can be generated later
      }
    }

    const [updatedQuoteRequest] = await db
      .update(quoteRequestsTable)
      .set({
        uniqueEmailAddress: finalUniqueEmail,
        rfqCode: rfqCode
      })
      .where(eq(quoteRequestsTable.id, newQuoteRequest.id))
      .returning()

    if (!updatedQuoteRequest) {
      return { isSuccess: false, message: "Failed to update quote request email" }
    }

    const sendChannel = channel || "email" // Default to email for backward compatibility
    let emailSent = false
    let whatsappSent = false

    // Send via email if requested
    if (sendChannel === "email" || sendChannel === "both") {
      try {
        const { sendQuoteRequestEmailAction } = await import("@/lib/email/quote-email-service")
        const emailResult = await sendQuoteRequestEmailAction(updatedQuoteRequest.id)
        if (emailResult.isSuccess) {
          emailSent = true
          // Increment sentCount
          await db
            .update(quoteRequestsTable)
            .set({ sentCount: updatedQuoteRequest.sentCount + 1 })
            .where(eq(quoteRequestsTable.id, updatedQuoteRequest.id))
        } else {
          console.warn("Failed to send quote request email:", emailResult.message)
        }
      } catch (emailError) {
        console.error("Error sending quote request email:", emailError)
      }
    }

    // Send via WhatsApp if requested - check if enabled first
    if (sendChannel === "whatsapp" || sendChannel === "both") {
      try {
        // Check if WhatsApp is enabled for this user
        const { isWhatsAppEnabledAction } = await import("@/actions/whatsapp-primary-session-actions")
        const enabledCheck = await isWhatsAppEnabledAction(updatedQuoteRequest.requestedBy)
        
        if (enabledCheck.isSuccess && enabledCheck.data?.enabled && enabledCheck.data?.connected) {
          // WhatsApp is enabled and connected, send via WhatsApp
        const { sendQuoteRequestWhatsAppAction } = await import("@/actions/whatsapp-actions")
        const whatsappResult = await sendQuoteRequestWhatsAppAction(updatedQuoteRequest.id)
        if (whatsappResult.isSuccess) {
          whatsappSent = true
          // Increment sentCount
          await db
            .update(quoteRequestsTable)
            .set({ sentCount: updatedQuoteRequest.sentCount + 1 })
            .where(eq(quoteRequestsTable.id, updatedQuoteRequest.id))
            console.log(`Quote request ${updatedQuoteRequest.id} sent via WhatsApp successfully`)
        } else {
            console.warn(`WhatsApp not available for quote request ${updatedQuoteRequest.id}: ${whatsappResult.message}`)
            // If WhatsApp was the only channel and it failed, this is a problem
            if (sendChannel === "whatsapp") {
              return {
                isSuccess: false,
                message: `Failed to send via WhatsApp: ${whatsappResult.message}. Please configure WhatsApp in settings or use email instead.`
              }
            }
          }
        } else {
          // WhatsApp not enabled or not connected
          console.log(`WhatsApp not enabled/connected for user ${updatedQuoteRequest.requestedBy}. Skipping WhatsApp send.`)
          if (sendChannel === "whatsapp") {
            // If WhatsApp was the only channel, return error
            return {
              isSuccess: false,
              message: "WhatsApp is not enabled or connected. Please configure WhatsApp in settings or use email instead."
            }
          }
          // If "both" was selected, email will still be sent (already handled above)
        }
      } catch (whatsappError) {
        console.error("Error sending quote request via WhatsApp:", whatsappError)
        if (sendChannel === "whatsapp") {
          return {
            isSuccess: false,
            message: `Failed to send via WhatsApp: ${whatsappError instanceof Error ? whatsappError.message : "Unknown error"}. Please configure WhatsApp in settings or use email instead.`
          }
        }
        // If "both" was selected, email will still be sent (already handled above)
      }
    }

    // Determine success message
    let message = "Quote request created"
    if (sendChannel === "both") {
      if (emailSent && whatsappSent) {
        message = "Quote request created and sent via email and WhatsApp successfully"
      } else if (emailSent) {
        message = "Quote request created and sent via email (WhatsApp failed)"
      } else if (whatsappSent) {
        message = "Quote request created and sent via WhatsApp (email failed)"
      } else {
        message = "Quote request created but failed to send via both channels"
      }
    } else if (sendChannel === "whatsapp") {
      message = whatsappSent
        ? "Quote request created and sent via WhatsApp successfully"
        : "Quote request created but failed to send via WhatsApp"
    } else {
      message = emailSent
        ? "Quote request created and email sent successfully"
        : "Quote request created but failed to send email"
    }

    return {
      isSuccess: true,
      message,
      data: updatedQuoteRequest
    }
  } catch (error) {
    console.error("Error creating quote request:", error)
    return { isSuccess: false, message: "Failed to create quote request" }
  }
}

export async function getQuoteRequestsByIncidentAction(
  incidentId: string
): Promise<ActionState<SelectQuoteRequest[]>> {
  try {
    const quoteRequests = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.incidentId, incidentId))
      .orderBy(desc(quoteRequestsTable.requestedAt))

    return {
      isSuccess: true,
      message: "Quote requests retrieved successfully",
      data: quoteRequests
    }
  } catch (error) {
    console.error("Error getting quote requests:", error)
    return { isSuccess: false, message: "Failed to get quote requests" }
  }
}

export async function getQuotesByIncidentAction(
  incidentId: string
): Promise<ActionState<SelectQuote[]>> {
  try {
    const quoteRequests = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.incidentId, incidentId))

    const quoteRequestIds = quoteRequests.map((qr) => qr.id)

    if (quoteRequestIds.length === 0) {
      return {
        isSuccess: true,
        message: "No quotes found for this incident",
        data: []
      }
    }

    const quotes = await db
      .select()
      .from(quotesTable)
      .where(inArray(quotesTable.quoteRequestId, quoteRequestIds))

    return {
      isSuccess: true,
      message: "Quotes retrieved successfully",
      data: quotes
    }
  } catch (error) {
    console.error("Error getting quotes:", error)
    return { isSuccess: false, message: "Failed to get quotes" }
  }
}

export async function approveQuoteAction(
  quoteId: string
): Promise<ActionState<SelectQuote>> {
  try {
    const [updatedQuote] = await db
      .update(quotesTable)
      .set({ status: "approved" })
      .where(eq(quotesTable.id, quoteId))
      .returning()

    if (!updatedQuote) {
      return { isSuccess: false, message: "Quote not found" }
    }

    // Update quote request status
    await db
      .update(quoteRequestsTable)
      .set({ status: "approved" })
      .where(eq(quoteRequestsTable.id, updatedQuote.quoteRequestId))

    return {
      isSuccess: true,
      message: "Quote approved successfully",
      data: updatedQuote
    }
  } catch (error) {
    console.error("Error approving quote:", error)
    return { isSuccess: false, message: "Failed to approve quote" }
  }
}

export async function processQuoteEmailReplyAction(
  uniqueEmailAddress: string,
  quoteData: {
    amount: string
    description?: string
    estimatedCompletionDate?: Date
    emailReplyId: string
  },
  extractedFrom?: { source: "email" | "pdf" | "web"; messageId?: string; fileName?: string }
): Promise<ActionState<SelectQuote>> {
  try {
    // Find quote request by unique email address (each provider has a unique email)
    const [quoteRequest] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.uniqueEmailAddress, uniqueEmailAddress))
      .limit(1)

    if (!quoteRequest) {
      return { isSuccess: false, message: "Quote request not found" }
    }

    // Verify service provider is associated with this quote request
    if (!quoteRequest.serviceProviderId) {
      return { isSuccess: false, message: "Quote request is not associated with a service provider" }
    }

    // Get service provider details for logging and verification
    const [serviceProvider] = await db
      .select({
        id: serviceProvidersTable.id,
        businessName: serviceProvidersTable.businessName,
        contactName: serviceProvidersTable.contactName,
        email: serviceProvidersTable.email
      })
      .from(serviceProvidersTable)
      .where(eq(serviceProvidersTable.id, quoteRequest.serviceProviderId))
      .limit(1)

    if (!serviceProvider) {
      return { isSuccess: false, message: "Service provider not found for this quote request" }
    }

    // Check if a quote already exists for this quote request (prevent duplicates)
    const [existingQuote] = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.quoteRequestId, quoteRequest.id))
      .limit(1)

    if (existingQuote) {
      return {
        isSuccess: false,
        message: `A quote has already been submitted for this RFQ by ${serviceProvider.businessName || serviceProvider.contactName}. If you need to update it, please contact us directly.`
      }
    }

    // Log email reply with provider information for tracking
    console.log(`Quote email reply received:`, {
      uniqueEmailAddress,
      emailReplyId: quoteData.emailReplyId,
      rfqId: quoteRequest.id,
      serviceProviderId: quoteRequest.serviceProviderId,
      providerName: serviceProvider.businessName || serviceProvider.contactName,
      providerEmail: serviceProvider.email,
      amount: quoteData.amount
    })

    // Parse amount to numeric value (database expects numeric, not formatted string)
    const parsedAmount = parseAmountToNumeric(quoteData.amount)

    // Create quote record - automatically linked to the service provider via quoteRequest.serviceProviderId
    const [newQuote] = await db
      .insert(quotesTable)
      .values({
        quoteRequestId: quoteRequest.id, // This links to quoteRequest which has serviceProviderId
        amount: parsedAmount,
        description: quoteData.description,
        estimatedCompletionDate: quoteData.estimatedCompletionDate,
        status: "quoted",
        submittedVia: "email",
        emailReplyId: quoteData.emailReplyId,
        submissionCode: quoteRequest.rfqCode || null, // Store RFQ code if available
        extractedFrom: extractedFrom || { source: "email", messageId: quoteData.emailReplyId }
      })
      .returning()

    if (!newQuote) {
      return { isSuccess: false, message: "Failed to create quote" }
    }

    // Update quote request status and receivedCount
    await db
      .update(quoteRequestsTable)
      .set({
        status: "quoted",
        receivedCount: quoteRequest.receivedCount + 1
      })
      .where(eq(quoteRequestsTable.id, quoteRequest.id))

    // Log successful processing with provider tracking
    console.log(`Quote successfully processed from email:`, {
      quoteId: newQuote.id,
      uniqueEmailAddress,
      serviceProviderId: quoteRequest.serviceProviderId,
      providerName: serviceProvider.businessName || serviceProvider.contactName,
      amount: quoteData.amount
    })

    return {
      isSuccess: true,
      message: `Quote processed successfully for ${serviceProvider.businessName || serviceProvider.contactName}`,
      data: newQuote
    }
  } catch (error) {
    console.error("Error processing quote email reply:", error)
    return { isSuccess: false, message: "Failed to process quote email reply" }
  }
}

// New Enhanced RFQ Actions

/**
 * Create a standalone RFQ (not tied to an incident)
 */
export async function createStandaloneRfqAction(
  propertyId: string,
  serviceProviderId: string,
  title: string,
  description: string,
  requestedBy: string,
  dueDate?: Date,
  notes?: string
): Promise<ActionState<SelectQuoteRequest>> {
  try {
    // Create RFQ record without incidentId
    const [rfq] = await db
      .insert(quoteRequestsTable)
      .values({
        propertyId,
        serviceProviderId,
        title,
        description,
        requestedBy,
        dueDate: dueDate || null,
        notes: notes || null,
        incidentId: null,
        status: "requested",
        sentCount: 0,
        receivedCount: 0,
        uniqueEmailAddress: "temp" // Will be updated
      })
      .returning()

    if (!rfq) {
      return { isSuccess: false, message: "Failed to create RFQ" }
    }

    // Generate unique email and RFQ code
    const domain = process.env.POSTMARK_FROM_EMAIL?.split("@")[1] || "yourdomain.com"
    const finalUniqueEmail = `quote-${rfq.id}@${domain}`

    // Generate RFQ code
    let rfqCode: string | null = null
    try {
      const { generateRfqCodeAction } = await import("@/actions/rfq-codes-actions")
      const codeResult = await generateRfqCodeAction(rfq.id)
      if (codeResult.isSuccess && codeResult.data) {
        rfqCode = codeResult.data.code
      }
    } catch (codeError) {
      console.warn("Failed to generate RFQ code:", codeError)
    }

    const [updatedRfq] = await db
      .update(quoteRequestsTable)
      .set({
        uniqueEmailAddress: finalUniqueEmail,
        rfqCode: rfqCode
      })
      .where(eq(quoteRequestsTable.id, rfq.id))
      .returning()

    if (!updatedRfq) {
      return { isSuccess: false, message: "Failed to update RFQ" }
    }

    return {
      isSuccess: true,
      message: "Standalone RFQ created successfully",
      data: updatedRfq
    }
  } catch (error) {
    console.error("Error creating standalone RFQ:", error)
    return { isSuccess: false, message: "Failed to create standalone RFQ" }
  }
}

/**
 * Create bulk RFQ - send RFQ to multiple providers at once
 * 
 * IMPORTANT: Each provider receives a UNIQUE RFQ code that is tied to their serviceProviderId.
 * This ensures we can uniquely track which provider submitted which quote:
 * - Code → rfqId (from rfqCodesTable)
 * - rfqId → quoteRequest (which has serviceProviderId)
 * - quoteRequest → quote (via quoteRequestId)
 * 
 * When a provider submits via their unique code or replies to their unique email address,
 * the quote is automatically associated with the correct serviceProviderId.
 */
export async function createBulkRfqAction(
  rfqData: {
    propertyId: string
    incidentId?: string | null
    title?: string | null
    description?: string | null
    requestedBy: string
    dueDate?: Date | null
    notes?: string | null
  },
  providerIds: string[],
  channel: "email" | "whatsapp" | "both" = "email",
  options?: {
    incidentAttachments?: Array<{ fileUrl: string; fileName: string; fileType: string }>
  }
): Promise<ActionState<{ rfqId: string; quoteRequestIds: string[]; rfqCode: string | null }>> {
  console.log(`[RFQ Creation] ========================================`)
  console.log(`[RFQ Creation] Starting bulk RFQ creation`)
  console.log(`[RFQ Creation] Channel: ${channel}`)
  console.log(`[RFQ Creation] Provider count: ${providerIds.length}`)
  console.log(`[RFQ Creation] Property ID: ${rfqData.propertyId}`)
  console.log(`[RFQ Creation] Requested by: ${rfqData.requestedBy}`)
  console.log(`[RFQ Creation] ========================================`)
  try {
    if (providerIds.length === 0) {
      return { isSuccess: false, message: "At least one service provider must be selected" }
    }

    const domain = process.env.POSTMARK_FROM_EMAIL?.split("@")[1] || "yourdomain.com"
    
    // Generate RFQ code first (we'll use the first quote request ID for this)
    // Create first quote request to get an ID for code generation
    const firstProviderId = providerIds[0]
    const firstUniqueEmail = `quote-temp-${Date.now()}-${firstProviderId}@${domain}`

    const [firstQuoteRequest] = await db
      .insert(quoteRequestsTable)
      .values({
        propertyId: rfqData.propertyId,
        incidentId: rfqData.incidentId || null,
        title: rfqData.title || null,
        description: rfqData.description || null,
        serviceProviderId: firstProviderId,
        requestedBy: rfqData.requestedBy,
        dueDate: rfqData.dueDate || null,
        notes: rfqData.notes || null,
        status: "requested",
        uniqueEmailAddress: firstUniqueEmail,
        sentCount: 0,
        receivedCount: 0
      })
      .returning()

    if (!firstQuoteRequest) {
      return { isSuccess: false, message: "Failed to create first quote request" }
    }

    // Set bulkRfqGroupId to firstQuoteRequest.id (self-reference for parent)
    // This makes the first RFQ the "parent" of the group
    await db
      .update(quoteRequestsTable)
      .set({ bulkRfqGroupId: firstQuoteRequest.id })
      .where(eq(quoteRequestsTable.id, firstQuoteRequest.id))

    // Generate unique RFQ code for first provider
    let firstRfqCode: string | null = null
    try {
      const { generateRfqCodeAction } = await import("@/actions/rfq-codes-actions")
      const codeResult = await generateRfqCodeAction(firstQuoteRequest.id)
      if (codeResult.isSuccess && codeResult.data) {
        firstRfqCode = codeResult.data.code
        // Update first quote request with the code
        await db
          .update(quoteRequestsTable)
          .set({ rfqCode: firstRfqCode })
          .where(eq(quoteRequestsTable.id, firstQuoteRequest.id))
      }
    } catch (codeError) {
      console.warn("Failed to generate RFQ code for first provider:", codeError)
    }

    const quoteRequestIds: string[] = [firstQuoteRequest.id]
    const generatedCodes: string[] = firstRfqCode ? [firstRfqCode] : []
    let sentCount = 0

    // Copy incident attachments to RFQ attachments BEFORE sending messages
    // This ensures attachments are available when WhatsApp/Email services check for them
    if (firstRfqCode && options?.incidentAttachments && options.incidentAttachments.length > 0) {
      try {
        const { copyIncidentAttachmentsToRfqAction } = await import("@/actions/rfq-attachments-actions")
        const { downloadPDFFromSupabase, uploadPDFToSupabase } = await import("@/lib/storage/supabase-storage")
        const { createRfqAttachmentAction } = await import("@/actions/rfq-attachments-actions")
        
        let copiedCount = 0
        let failedCount = 0
        
        for (const incidentAttachment of options.incidentAttachments) {
          try {
            // Download attachment from Supabase
            const fileBuffer = await downloadPDFFromSupabase(incidentAttachment.fileUrl)

            // Sanitize filename
            const sanitizedFileName = incidentAttachment.fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
            const timestamp = Date.now()
            const rfqFilePath = `rfqs/${firstRfqCode}/${timestamp}-${sanitizedFileName}`

            // Upload to RFQ storage path
            const newFileUrl = await uploadPDFToSupabase(fileBuffer, rfqFilePath)

            // Create RFQ attachment record
            const result = await createRfqAttachmentAction({
              rfqCode: firstRfqCode,
              fileUrl: newFileUrl,
              fileName: incidentAttachment.fileName,
              fileType: incidentAttachment.fileType === "pdf" ? "pdf" : "image",
              fileSize: fileBuffer.length,
              uploadedBy: rfqData.requestedBy
            })

            if (result.isSuccess) {
              copiedCount++
              console.log(`[RFQ Attachments] ✓ Copied attachment: ${incidentAttachment.fileName}`)
            } else {
              failedCount++
              console.error(`[RFQ Attachments] ✗ Failed to create RFQ attachment record: ${incidentAttachment.fileName}`, result.message)
            }
          } catch (error) {
            failedCount++
            console.error(`[RFQ Attachments] ✗ Error copying attachment ${incidentAttachment.fileName}:`, error)
          }
        }
        
        console.log(`[RFQ Creation] Copied ${copiedCount} of ${options.incidentAttachments.length} attachment(s) to RFQ before sending`)
        if (failedCount > 0) {
          console.warn(`[RFQ Creation] Failed to copy ${failedCount} attachment(s)`)
        }
      } catch (attachmentError) {
        // Log error but don't fail the RFQ creation
        console.error("[RFQ Creation] Error copying incident attachments to RFQ:", attachmentError)
      }
    }

    // Send RFQ to first provider
    try {
      if (channel === "email" || channel === "both") {
        const { sendQuoteRequestEmailAction } = await import("@/lib/email/quote-email-service")
        const emailResult = await sendQuoteRequestEmailAction(firstQuoteRequest.id)
        if (emailResult.isSuccess) {
          sentCount++
          await db
            .update(quoteRequestsTable)
            .set({ sentCount: 1 })
            .where(eq(quoteRequestsTable.id, firstQuoteRequest.id))
        }
      }

      if (channel === "whatsapp" || channel === "both") {
        const { sendQuoteRequestWhatsAppAction } = await import("@/actions/whatsapp-actions")
        const whatsappResult = await sendQuoteRequestWhatsAppAction(firstQuoteRequest.id)
        if (whatsappResult.isSuccess) {
          sentCount++
        }
      }
    } catch (sendError) {
      console.error(`Error sending RFQ to provider ${firstProviderId}:`, sendError)
    }

    // Create quote requests for remaining providers
    // Note: rfqCode is unique, so we only set it on the first quote request
    // Other quote requests in the same bulk RFQ will have null rfqCode
    const failedProviders: string[] = []
    const successfulProviders: string[] = []

    for (let i = 1; i < providerIds.length; i++) {
      const providerId = providerIds[i]
      const uniqueEmail = `quote-${firstQuoteRequest.id}-${providerId}@${domain}`

      try {
        const [quoteRequest] = await db
          .insert(quoteRequestsTable)
          .values({
            propertyId: rfqData.propertyId,
            incidentId: rfqData.incidentId || null,
            title: rfqData.title || null,
            description: rfqData.description || null,
            serviceProviderId: providerId,
            requestedBy: rfqData.requestedBy,
            dueDate: rfqData.dueDate || null,
            notes: rfqData.notes || null,
            status: "requested",
            uniqueEmailAddress: uniqueEmail,
            rfqCode: null, // Only first quote request has the rfqCode due to unique constraint
            bulkRfqGroupId: firstQuoteRequest.id, // Link to parent RFQ group
            sentCount: 0,
            receivedCount: 0
          })
          .returning()

        if (!quoteRequest) {
          console.error(`Failed to create quote request for provider ${providerId}`)
          failedProviders.push(providerId)
          continue
        }

        quoteRequestIds.push(quoteRequest.id)

        // Generate unique RFQ code for this provider
        let providerRfqCode: string | null = null
        try {
          const { generateRfqCodeAction } = await import("@/actions/rfq-codes-actions")
          const codeResult = await generateRfqCodeAction(quoteRequest.id)
          if (codeResult.isSuccess && codeResult.data) {
            providerRfqCode = codeResult.data.code
            generatedCodes.push(providerRfqCode)
            // Update quote request with the code
            await db
              .update(quoteRequestsTable)
              .set({ rfqCode: providerRfqCode })
              .where(eq(quoteRequestsTable.id, quoteRequest.id))
          }
        } catch (codeError) {
          console.warn(`Failed to generate RFQ code for provider ${providerId}:`, codeError)
        }

        // Send RFQ to provider
        let emailSent = false
        let whatsappSent = false

        console.log(`[RFQ Creation] Processing provider ${i + 1}/${providerIds.length}: ${providerId}`)
        console.log(`[RFQ Creation] Quote Request ID: ${quoteRequest.id}`)
        console.log(`[RFQ Creation] Channel setting: ${channel}`)

        try {
          if (channel === "email" || channel === "both") {
            console.log(`[RFQ Creation] Sending via EMAIL...`)
            const { sendQuoteRequestEmailAction } = await import("@/lib/email/quote-email-service")
            const emailResult = await sendQuoteRequestEmailAction(quoteRequest.id)
            if (emailResult.isSuccess) {
              emailSent = true
              sentCount++
              console.log(`[RFQ Creation] ✓ Email sent successfully`)
              await db
                .update(quoteRequestsTable)
                .set({ sentCount: 1 })
                .where(eq(quoteRequestsTable.id, quoteRequest.id))
            } else {
              console.error(`[RFQ Creation] ❌ Failed to send email to provider ${providerId}:`, emailResult.message)
            }
          } else {
            console.log(`[RFQ Creation] Skipping email (channel is "${channel}")`)
          }

          if (channel === "whatsapp" || channel === "both") {
            console.log(`[RFQ Creation] Sending via WHATSAPP...`)
            console.log(`[RFQ Creation] Calling sendQuoteRequestWhatsAppAction for quote request: ${quoteRequest.id}`)
            const { sendQuoteRequestWhatsAppAction } = await import("@/actions/whatsapp-actions")
            const whatsappResult = await sendQuoteRequestWhatsAppAction(quoteRequest.id)
            console.log(`[RFQ Creation] WhatsApp result:`, {
              isSuccess: whatsappResult.isSuccess,
              message: whatsappResult.message
            })
            if (whatsappResult.isSuccess) {
              whatsappSent = true
              if (!emailSent) {
                sentCount++
              }
              console.log(`[RFQ Creation] ✓ WhatsApp sent successfully`)
            } else {
              console.error(`[RFQ Creation] ❌ Failed to send WhatsApp to provider ${providerId}:`, whatsappResult.message)
            }
          } else {
            console.log(`[RFQ Creation] Skipping WhatsApp (channel is "${channel}")`)
          }

          if (emailSent || whatsappSent) {
            successfulProviders.push(providerId)
          } else {
            failedProviders.push(providerId)
          }
        } catch (sendError) {
          console.error(`Error sending RFQ to provider ${providerId}:`, sendError)
          failedProviders.push(providerId)
        }
      } catch (dbError) {
        console.error(`Database error creating quote request for provider ${providerId}:`, dbError)
        failedProviders.push(providerId)
      }
    }

    // Build detailed success message
    let message = `RFQ sent to ${sentCount} of ${providerIds.length} provider(s)`
    if (failedProviders.length > 0) {
      message += `. Failed to send to ${failedProviders.length} provider(s)`
    }
    if (successfulProviders.length > 0 && failedProviders.length === 0) {
      message = `RFQ successfully sent to all ${providerIds.length} provider(s)`
    }

    console.log(`Bulk RFQ creation summary:`, {
      totalProviders: providerIds.length,
      successful: successfulProviders.length + (sentCount > 0 ? 1 : 0), // +1 for first provider
      failed: failedProviders.length,
      quoteRequestIds: quoteRequestIds.length,
      codesGenerated: generatedCodes.length,
      codes: generatedCodes
    })

    return {
      isSuccess: true,
      message,
      data: { 
        rfqId: firstQuoteRequest.id, 
        quoteRequestIds, 
        rfqCode: firstRfqCode // Return first code for backward compatibility
      }
    }
  } catch (error) {
    console.error("Error creating bulk RFQ:", error)
    return { isSuccess: false, message: "Failed to create bulk RFQ" }
  }
}

/**
 * Get RFQ by code
 */
export async function getRfqByCodeAction(
  code: string
): Promise<ActionState<SelectQuoteRequest>> {
  try {
    const [rfq] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.rfqCode, code))
      .limit(1)

    if (!rfq) {
      return { isSuccess: false, message: "RFQ not found" }
    }

    return {
      isSuccess: true,
      message: "RFQ retrieved successfully",
      data: rfq
    }
  } catch (error) {
    console.error("Error getting RFQ by code:", error)
    return { isSuccess: false, message: "Failed to get RFQ" }
  }
}

/**
 * Get RFQ details by code (including property and incident information)
 */
export async function getRfqDetailsByCodeAction(
  code: string
): Promise<
  ActionState<{
    rfq: SelectQuoteRequest
    property: {
      id: string
      name: string
      streetAddress: string
      suburb: string
      province: string
    } | null
    incident: {
      id: string
      title: string
      description: string | null
      priority: string | null
    } | null
  }>
> {
  try {
    // First try to find in rfqCodesTable
    const [rfqCode] = await db
      .select()
      .from(rfqCodesTable)
      .where(eq(rfqCodesTable.code, code))
      .limit(1)

    let quoteRequestId: string | null = null

    if (rfqCode) {
      quoteRequestId = rfqCode.rfqId
    } else {
      // Fallback: check if code exists in quoteRequestsTable.rfqCode
      const [quoteRequest] = await db
        .select({ id: quoteRequestsTable.id })
        .from(quoteRequestsTable)
        .where(eq(quoteRequestsTable.rfqCode, code))
        .limit(1)

      if (!quoteRequest) {
        return { isSuccess: false, message: "RFQ not found" }
      }

      quoteRequestId = quoteRequest.id
    }

    // Now get the full quote request details
    const [rfq] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.id, quoteRequestId))
      .limit(1)

    if (!rfq) {
      return { isSuccess: false, message: "RFQ not found" }
    }

    // Get property
    let property = null
    if (rfq.propertyId) {
      const [propertyData] = await db
        .select({
          id: propertiesTable.id,
          name: propertiesTable.name,
          streetAddress: propertiesTable.streetAddress,
          suburb: propertiesTable.suburb,
          province: propertiesTable.province
        })
        .from(propertiesTable)
        .where(eq(propertiesTable.id, rfq.propertyId))
        .limit(1)
      property = propertyData || null
    }

    // Get incident if linked
    let incident = null
    if (rfq.incidentId) {
      const [incidentData] = await db
        .select({
          id: incidentsTable.id,
          title: incidentsTable.title,
          description: incidentsTable.description,
          priority: incidentsTable.priority
        })
        .from(incidentsTable)
        .where(eq(incidentsTable.id, rfq.incidentId))
        .limit(1)
      incident = incidentData || null
    }

    return {
      isSuccess: true,
      message: "RFQ details retrieved successfully",
      data: { rfq, property, incident }
    }
  } catch (error) {
    console.error("Error getting RFQ details by code:", error)
    return { isSuccess: false, message: "Failed to get RFQ details" }
  }
}

/**
 * Submit quote via code (public action)
 */
export async function submitQuoteByCodeAction(
  code: string,
  quoteData: {
    amount: string
    description?: string
    estimatedCompletionDate?: Date
    pdfBuffer?: Buffer
    fileName?: string
  }
): Promise<ActionState<SelectQuote>> {
  try {
    // Validate code
    const { validateRfqCodeAction, incrementRfqCodeUsageAction } = await import("@/actions/rfq-codes-actions")
    const validationResult = await validateRfqCodeAction(code)
    
    if (!validationResult.isSuccess || !validationResult.data) {
      return { isSuccess: false, message: validationResult.message }
    }

    const { rfqId } = validationResult.data

    // Get quote request with service provider information
    const [quoteRequest] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.id, rfqId))
      .limit(1)

    if (!quoteRequest) {
      return { isSuccess: false, message: "Quote request not found" }
    }

    // Verify service provider is associated with this quote request
    if (!quoteRequest.serviceProviderId) {
      return { isSuccess: false, message: "Quote request is not associated with a service provider" }
    }

    // Get service provider details for logging and verification
    const [serviceProvider] = await db
      .select({
        id: serviceProvidersTable.id,
        businessName: serviceProvidersTable.businessName,
        contactName: serviceProvidersTable.contactName,
        email: serviceProvidersTable.email
      })
      .from(serviceProvidersTable)
      .where(eq(serviceProvidersTable.id, quoteRequest.serviceProviderId))
      .limit(1)

    if (!serviceProvider) {
      return { isSuccess: false, message: "Service provider not found for this quote request" }
    }

    // Log submission with provider information for tracking
    console.log(`Quote submission via code ${code}:`, {
      code,
      rfqId: quoteRequest.id,
      serviceProviderId: quoteRequest.serviceProviderId,
      providerName: serviceProvider.businessName || serviceProvider.contactName,
      providerEmail: serviceProvider.email
    })

    // Extract from PDF if provided
    let extractedData = {
      amount: quoteData.amount,
      description: quoteData.description || "",
      estimatedCompletionDate: quoteData.estimatedCompletionDate
    }

    if (quoteData.pdfBuffer && quoteData.fileName) {
      try {
        // Ensure pdfBuffer is a proper Buffer (it might be serialized when passed through server action)
        let pdfBuffer: Buffer
        const bufferData = quoteData.pdfBuffer
        if (Buffer.isBuffer(bufferData)) {
          pdfBuffer = bufferData
        } else if (Array.isArray(bufferData)) {
          // If it was serialized as an array, convert back to Buffer
          pdfBuffer = Buffer.from(bufferData)
        } else {
          // Try to convert from any object that might have data (Uint8Array, plain object, etc.)
          pdfBuffer = Buffer.from(bufferData as any)
        }
        
        const { extractQuoteFromPDF } = await import("@/lib/quote-extraction")
        const pdfExtracted = await extractQuoteFromPDF(pdfBuffer, quoteData.fileName)
        extractedData = {
          amount: pdfExtracted.amount,
          description: pdfExtracted.description,
          estimatedCompletionDate: pdfExtracted.estimatedCompletionDate
            ? new Date(pdfExtracted.estimatedCompletionDate)
            : undefined
        }
      } catch (extractError) {
        console.warn("Failed to extract from PDF, using manual data:", extractError)
      }
    }

    // Check if a quote already exists for this quote request (prevent duplicates)
    const [existingQuote] = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.quoteRequestId, quoteRequest.id))
      .limit(1)

    if (existingQuote) {
      return {
        isSuccess: false,
        message: `A quote has already been submitted for this RFQ code by ${serviceProvider.businessName || serviceProvider.contactName}. If you need to update it, please contact us directly.`
      }
    }

    // Parse amount to numeric value (database expects numeric, not formatted string)
    const parsedAmount = parseAmountToNumeric(extractedData.amount)

    // Create quote record - automatically linked to the service provider via quoteRequest.serviceProviderId
    const [newQuote] = await db
      .insert(quotesTable)
      .values({
        quoteRequestId: quoteRequest.id, // This links to quoteRequest which has serviceProviderId
        amount: parsedAmount,
        description: extractedData.description,
        estimatedCompletionDate: extractedData.estimatedCompletionDate,
        status: "quoted",
        submittedVia: "web_form",
        submissionCode: code, // Store the code used for submission tracking
        extractedFrom: quoteData.pdfBuffer
          ? { source: "pdf", fileName: quoteData.fileName }
          : { source: "web" }
      })
      .returning()

    if (!newQuote) {
      return { isSuccess: false, message: "Failed to create quote" }
    }

    // Increment usage count
    await incrementRfqCodeUsageAction(code)

    // Update quote request status and receivedCount
    await db
      .update(quoteRequestsTable)
      .set({
        status: "quoted",
        receivedCount: quoteRequest.receivedCount + 1
      })
      .where(eq(quoteRequestsTable.id, quoteRequest.id))

    // Log successful submission with provider tracking
    console.log(`Quote successfully submitted:`, {
      quoteId: newQuote.id,
      code,
      serviceProviderId: quoteRequest.serviceProviderId,
      providerName: serviceProvider.businessName || serviceProvider.contactName,
      amount: extractedData.amount
    })

    return {
      isSuccess: true,
      message: `Quote submitted successfully for ${serviceProvider.businessName || serviceProvider.contactName}`,
      data: newQuote
    }
  } catch (error) {
    console.error("Error submitting quote by code:", error)
    return { isSuccess: false, message: "Failed to submit quote" }
  }
}

/**
 * Extract quote from email using AI
 */
export async function extractQuoteFromEmailAction(
  emailBody: string,
  attachments?: Array<{ fileName: string; content: Buffer }>
): Promise<ActionState<QuoteExtractionData>> {
  try {
    const { extractQuoteFromEmail } = await import("@/lib/quote-extraction")
    const extracted = await extractQuoteFromEmail(emailBody, attachments)

    return {
      isSuccess: true,
      message: "Quote extracted successfully",
      data: extracted
    }
  } catch (error) {
    console.error("Error extracting quote from email:", error)
    return { isSuccess: false, message: "Failed to extract quote from email" }
  }
}

/**
 * Accept a quote and send notification
 */
export async function acceptQuoteAction(
  quoteId: string,
  notifyProvider: boolean = true
): Promise<ActionState<SelectQuote>> {
  try {
    // Get quote with request details
    const [quote] = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.id, quoteId))
      .limit(1)

    if (!quote) {
      return { isSuccess: false, message: "Quote not found" }
    }

    const [quoteRequest] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.id, quote.quoteRequestId))
      .limit(1)

    if (!quoteRequest) {
      return { isSuccess: false, message: "Quote request not found" }
    }

    // Find all RFQs in the same group
    let groupRfqIds: string[] = [quoteRequest.id]

    if (quoteRequest.bulkRfqGroupId) {
      // Get all RFQs with the same bulkRfqGroupId (including the parent)
      const groupRfqs = await db
        .select({ id: quoteRequestsTable.id })
        .from(quoteRequestsTable)
        .where(
          or(
            eq(quoteRequestsTable.bulkRfqGroupId, quoteRequest.bulkRfqGroupId),
            eq(quoteRequestsTable.id, quoteRequest.bulkRfqGroupId) // Include the parent RFQ
          )
        )
      groupRfqIds = groupRfqs.map((r) => r.id)
    } else {
      // Fallback: use incidentId + propertyId + requestedAt (within 5 min window) for backward compatibility
      if (quoteRequest.incidentId && quoteRequest.propertyId) {
        const requestedAt = new Date(quoteRequest.requestedAt)
        const windowStart = new Date(requestedAt.getTime() - 5 * 60 * 1000)
        const windowEnd = new Date(requestedAt.getTime() + 5 * 60 * 1000)

        const groupRfqs = await db
          .select({ id: quoteRequestsTable.id })
          .from(quoteRequestsTable)
          .where(
            and(
              eq(quoteRequestsTable.incidentId, quoteRequest.incidentId),
              eq(quoteRequestsTable.propertyId, quoteRequest.propertyId),
              gte(quoteRequestsTable.requestedAt, windowStart),
              lte(quoteRequestsTable.requestedAt, windowEnd)
            )!
          )
        groupRfqIds = groupRfqs.map((r) => r.id)
      }
    }

    // Get all quotes for all RFQs in the group
    const allQuotesInGroup = await db
      .select()
      .from(quotesTable)
      .where(inArray(quotesTable.quoteRequestId, groupRfqIds))

    // Update quote status (approve the selected quote)
    const [updatedQuote] = await db
      .update(quotesTable)
      .set({ status: "approved" })
      .where(eq(quotesTable.id, quoteId))
      .returning()

    if (!updatedQuote) {
      return { isSuccess: false, message: "Failed to update quote" }
    }

    // Reject all other quotes in the group
    const otherQuoteIds = allQuotesInGroup
      .filter((q) => q.id !== quoteId && q.status !== "rejected")
      .map((q) => q.id)

    if (otherQuoteIds.length > 0) {
      await db
        .update(quotesTable)
        .set({ status: "rejected" })
        .where(inArray(quotesTable.id, otherQuoteIds))
    }

    // Update all RFQ statuses in the group
    await db
      .update(quoteRequestsTable)
      .set({ status: "approved" })
      .where(inArray(quoteRequestsTable.id, groupRfqIds))

    // Update incident status if linked
    if (quoteRequest.incidentId) {
      await db
        .update(incidentsTable)
        .set({ status: "in_progress" })
        .where(eq(incidentsTable.id, quoteRequest.incidentId))

      // Create status history entry
      await db.insert(incidentStatusHistoryTable).values({
        incidentId: quoteRequest.incidentId,
        status: "in_progress",
        changedBy: quoteRequest.requestedBy,
        notes: `Quote approved: ${quote.amount} (${otherQuoteIds.length} other quote${otherQuoteIds.length !== 1 ? "s" : ""} rejected)`
      })
    }

    // Send acceptance notification
    if (notifyProvider) {
      try {
        const { sendQuoteAcceptanceEmailAction } = await import("@/lib/email/quote-acceptance-service")
        await sendQuoteAcceptanceEmailAction(quoteId)
      } catch (emailError) {
        console.warn("Failed to send acceptance email:", emailError)
        // Don't fail the action if email fails
      }
    }

    return {
      isSuccess: true,
      message: `Quote accepted successfully${otherQuoteIds.length > 0 ? ` (${otherQuoteIds.length} other quote${otherQuoteIds.length !== 1 ? "s" : ""} rejected)` : ""}`,
      data: updatedQuote
    }
  } catch (error) {
    console.error("Error accepting quote:", error)
    return { isSuccess: false, message: "Failed to accept quote" }
  }
}

/**
 * Reject a quote
 */
export async function rejectQuoteAction(
  quoteId: string,
  reason?: string
): Promise<ActionState<SelectQuote>> {
  try {
    const [updatedQuote] = await db
      .update(quotesTable)
      .set({ status: "rejected" })
      .where(eq(quotesTable.id, quoteId))
      .returning()

    if (!updatedQuote) {
      return { isSuccess: false, message: "Quote not found" }
    }

    return {
      isSuccess: true,
      message: "Quote rejected successfully",
      data: updatedQuote
    }
  } catch (error) {
    console.error("Error rejecting quote:", error)
    return { isSuccess: false, message: "Failed to reject quote" }
  }
}

/**
 * Mark quote work as completed
 */
export async function completeQuoteAction(
  quoteId: string
): Promise<ActionState<SelectQuote>> {
  try {
    const [quote] = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.id, quoteId))
      .limit(1)

    if (!quote) {
      return { isSuccess: false, message: "Quote not found" }
    }

    // Update quote request completedAt
    const [quoteRequest] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.id, quote.quoteRequestId))
      .limit(1)

    if (quoteRequest) {
      await db
        .update(quoteRequestsTable)
        .set({ completedAt: new Date() })
        .where(eq(quoteRequestsTable.id, quoteRequest.id))
    }

    return {
      isSuccess: true,
      message: "Quote marked as completed",
      data: quote
    }
  } catch (error) {
    console.error("Error completing quote:", error)
    return { isSuccess: false, message: "Failed to complete quote" }
  }
}

/**
 * Get all quotes for an RFQ group for comparison
 * Aggregates quotes from all RFQs in the same bulk group, including quotes from all submission methods
 */
export async function getRfqComparisonAction(
  rfqId: string
): Promise<
  ActionState<{
    quotes: Array<
      SelectQuote & {
        providerName: string
        providerBusinessName: string | null
        submissionMethod: string
        submissionCode: string | null
      }
    >
    cheapestQuoteId: string | null
    totalQuotes: number
    totalProviders: number
  }>
> {
  try {
    // Get the base RFQ
    const [baseRfq] = await db
      .select()
      .from(quoteRequestsTable)
      .where(eq(quoteRequestsTable.id, rfqId))
      .limit(1)

    if (!baseRfq) {
      return { isSuccess: false, message: "RFQ not found" }
    }

    // Primary grouping: Use bulkRfqGroupId to find all RFQs in the same bulk request
    let matchingRequests: SelectQuoteRequest[] = []

    if (baseRfq.bulkRfqGroupId) {
      // Find all RFQs with the same bulkRfqGroupId (including the parent)
      const groupId = baseRfq.bulkRfqGroupId
      matchingRequests = await db
        .select()
        .from(quoteRequestsTable)
        .where(
          or(
            eq(quoteRequestsTable.bulkRfqGroupId, groupId),
            eq(quoteRequestsTable.id, groupId) // Include the parent RFQ
          )
        )
    } else {
      // Fallback grouping: Use incidentId + propertyId + requestedAt (within 5 min window) for backward compatibility
      const conditions: Array<ReturnType<typeof eq | typeof and>> = []

      if (baseRfq.incidentId && baseRfq.propertyId) {
        // Group by incidentId + propertyId + requestedAt (within 5 min window)
        const requestedAt = new Date(baseRfq.requestedAt)
        const windowStart = new Date(requestedAt.getTime() - 5 * 60 * 1000) // 5 minutes before
        const windowEnd = new Date(requestedAt.getTime() + 5 * 60 * 1000) // 5 minutes after

        conditions.push(
          and(
            eq(quoteRequestsTable.incidentId, baseRfq.incidentId),
            eq(quoteRequestsTable.propertyId, baseRfq.propertyId),
            gte(quoteRequestsTable.requestedAt, windowStart),
            lte(quoteRequestsTable.requestedAt, windowEnd)
          )!
        )
      } else if (baseRfq.rfqCode) {
        // Fallback: use RFQ code (legacy behavior)
        conditions.push(eq(quoteRequestsTable.rfqCode, baseRfq.rfqCode))
      }

      if (conditions.length === 0) {
        // No grouping possible, just return quotes for this single RFQ
        matchingRequests = [baseRfq]
      } else {
        matchingRequests = await db
          .select()
          .from(quoteRequestsTable)
          .where(or(...conditions))
      }
    }

    if (matchingRequests.length === 0) {
      return { isSuccess: false, message: "No matching quote requests found" }
    }

    const requestIds = matchingRequests.map((r) => r.id)

    // Get all quotes for these requests (includes quotes from all submission methods: email, WhatsApp, web)
    const quotes = await db
      .select()
      .from(quotesTable)
      .where(inArray(quotesTable.quoteRequestId, requestIds))

    if (quotes.length === 0) {
      return {
        isSuccess: true,
        message: "No quotes found for this RFQ group",
        data: {
          quotes: [],
          cheapestQuoteId: null,
          totalQuotes: 0,
          totalProviders: matchingRequests.length
        }
      }
    }

    // Get provider details for each quote
    const uniqueProviderIds = [...new Set(matchingRequests.map((r) => r.serviceProviderId))]
    const providers = await db
      .select()
      .from(serviceProvidersTable)
      .where(inArray(serviceProvidersTable.id, uniqueProviderIds))

    const providerMap = new Map(providers.map((p) => [p.id, p]))
    const requestMap = new Map(matchingRequests.map((r) => [r.id, r]))

    // Build quotes with provider info and sort by amount (cheapest first)
    const quotesWithProviders = quotes
      .map((quote) => {
        const request = requestMap.get(quote.quoteRequestId)
        const provider = request ? providerMap.get(request.serviceProviderId) : null

        return {
          ...quote,
          providerName: provider?.contactName || "Unknown",
          providerBusinessName: provider?.businessName || null,
          submissionMethod: quote.submittedVia || "unknown",
          submissionCode: quote.submissionCode || null
        }
      })
      .sort((a, b) => {
        const amountA = parseFloat(a.amount)
        const amountB = parseFloat(b.amount)
        return amountA - amountB // Sort ascending (cheapest first)
      })

    // Find cheapest quote (first one after sorting)
    const cheapestQuoteId = quotesWithProviders.length > 0 ? quotesWithProviders[0].id : null

    // Get unique provider count
    const uniqueProvidersInQuotes = new Set(
      quotesWithProviders.map((q) => {
        const request = requestMap.get(q.quoteRequestId)
        return request?.serviceProviderId
      }).filter(Boolean)
    )

    return {
      isSuccess: true,
      message: "Quotes retrieved successfully",
      data: {
        quotes: quotesWithProviders,
        cheapestQuoteId,
        totalQuotes: quotesWithProviders.length,
        totalProviders: uniqueProvidersInQuotes.size
      }
    }
  } catch (error) {
    console.error("Error getting RFQ comparison:", error)
    return { isSuccess: false, message: "Failed to get quotes for comparison" }
  }
}


