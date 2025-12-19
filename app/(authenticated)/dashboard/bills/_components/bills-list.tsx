"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import {
  getPropertiesByLandlordIdQuery,
  getPropertiesByRentalAgentIdQuery,
  getPropertyByIdQuery
} from "@/queries/properties-queries"
import { getBillsByPropertyIdQuery } from "@/queries/bills-queries"
import { extractionRulesTable } from "@/db/schema"
import { db } from "@/db"
import { eq } from "drizzle-orm"
import { BillsTable } from "./bills-table"

export async function BillsList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const allBills = []
  let properties: Array<{ id: string; name: string }> = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
      for (const property of landlordProperties) {
        const bills = await getBillsByPropertyIdQuery(property.id)
        allBills.push(...bills)
      }
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      const agentProperties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
      properties = agentProperties.map((p) => ({ id: p.id, name: p.name }))
      for (const property of agentProperties) {
        const bills = await getBillsByPropertyIdQuery(property.id)
        allBills.push(...bills)
      }
    }
  }

  // Fetch property names and rules for bills
  const billsWithProperties = await Promise.all(
    allBills.map(async (bill) => {
      const property = await getPropertyByIdQuery(bill.propertyId)
      
      // Fetch rules used for this bill
      const invoiceRule = bill.invoiceRuleId
        ? await db
            .select()
            .from(extractionRulesTable)
            .where(eq(extractionRulesTable.id, bill.invoiceRuleId))
            .limit(1)
            .then((rules) => rules[0] || null)
        : null
      
      const paymentRule = bill.paymentRuleId
        ? await db
            .select()
            .from(extractionRulesTable)
            .where(eq(extractionRulesTable.id, bill.paymentRuleId))
            .limit(1)
            .then((rules) => rules[0] || null)
        : null
      
      // Fallback to legacy extractionRuleId if no invoice/payment rule
      const legacyRule = !invoiceRule && !paymentRule && bill.extractionRuleId
        ? await db
            .select()
            .from(extractionRulesTable)
            .where(eq(extractionRulesTable.id, bill.extractionRuleId))
            .limit(1)
            .then((rules) => rules[0] || null)
        : null
      
      return {
        ...bill,
        propertyName: property?.name || "Unknown Property",
        invoiceRule: invoiceRule || null,
        paymentRule: paymentRule || null,
        legacyRule: legacyRule || null
      }
    })
  )

  return <BillsTable bills={billsWithProperties} properties={properties} />
}
