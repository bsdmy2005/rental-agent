"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import {
  getPropertiesByLandlordIdQuery,
  getPropertiesByRentalAgentIdQuery
} from "@/queries/properties-queries"
import {
  getRentalInvoiceInstancesByPropertyIdQuery,
  type InvoiceFilters
} from "@/queries/rental-invoice-instances-queries"
import { RentalInvoicesTable } from "./rental-invoices-table"

export async function RentalInvoicesList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  let properties: Array<{ id: string; name: string }> = []
  let propertyIds: string[] = []
  let allInvoices: any[] = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
      propertyIds = landlordProperties.map((p) => p.id)
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      const agentProperties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
      properties = agentProperties.map((p) => ({ id: p.id, name: p.name }))
      propertyIds = agentProperties.map((p) => p.id)
    }
  }

  // Batch fetch all invoices for all properties
  if (propertyIds.length > 0) {
    const invoicePromises = propertyIds.map((propertyId) =>
      getRentalInvoiceInstancesByPropertyIdQuery(propertyId)
    )
    const invoiceArrays = await Promise.all(invoicePromises)
    allInvoices = invoiceArrays.flat()

    // Enrich invoices with property and tenant names
    const propertyMap = new Map(properties.map((p) => [p.id, p.name]))
    allInvoices = allInvoices.map((invoice) => ({
      ...invoice,
      propertyName: propertyMap.get(invoice.propertyId) || "Unknown Property"
    }))
  }

  return <RentalInvoicesTable invoices={allInvoices} properties={properties} />
}

