"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import {
  getPropertiesByLandlordIdQuery,
  getPropertiesForUserQuery,
  getPropertiesByIdsQuery
} from "@/queries/properties-queries"
import { getBillsByPropertyIdsQuery, getRulesByIdsQuery } from "@/queries/bills-queries"
import { db } from "@/db"
import { billTemplatesTable, type SelectBillTemplate } from "@/db/schema"
import { inArray } from "drizzle-orm"
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

  let properties: Array<{ id: string; name: string }> = []
  let propertyIds: string[] = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
      propertyIds = landlordProperties.map((p) => p.id)
    }
  } else if (userProfile.userType === "rental_agent") {
    const agentProperties = await getPropertiesForUserQuery(userProfile.id, userProfile.userType)
    properties = agentProperties.map((p) => ({ id: p.id, name: p.name }))
    propertyIds = agentProperties.map((p) => p.id)
  }

  // Batch fetch all bills for all properties (fixes N+1 query)
  const allBills = await getBillsByPropertyIdsQuery(propertyIds)

  // Batch fetch all properties (fixes N+1 query)
  const propertiesMap = await getPropertiesByIdsQuery(propertyIds)

  // Collect all rule IDs
  const ruleIds = new Set<string>()
  for (const bill of allBills) {
    if (bill.invoiceRuleId) ruleIds.add(bill.invoiceRuleId)
    if (bill.paymentRuleId) ruleIds.add(bill.paymentRuleId)
    if (bill.extractionRuleId) ruleIds.add(bill.extractionRuleId)
  }

  // Batch fetch all rules (fixes N+1 query)
  const rulesMap = await getRulesByIdsQuery(Array.from(ruleIds))

  // Collect all bill template IDs
  const billTemplateIds = new Set<string>()
  for (const bill of allBills) {
    if (bill.billTemplateId) billTemplateIds.add(bill.billTemplateId)
  }

  // Batch fetch all bill templates (fixes N+1 query)
  const billTemplatesMap = new Map<string, SelectBillTemplate>()
  if (billTemplateIds.size > 0) {
    const templates = await db.query.billTemplates.findMany({
      where: inArray(billTemplatesTable.id, Array.from(billTemplateIds))
    })
    templates.forEach((template) => billTemplatesMap.set(template.id, template))
  }

  // Map bills with properties, rules, and templates
  const billsWithProperties = allBills.map((bill) => {
    const property = propertiesMap.get(bill.propertyId)
    const invoiceRule = bill.invoiceRuleId ? rulesMap.get(bill.invoiceRuleId) || null : null
    const paymentRule = bill.paymentRuleId ? rulesMap.get(bill.paymentRuleId) || null : null
    const legacyRule = !invoiceRule && !paymentRule && bill.extractionRuleId
      ? rulesMap.get(bill.extractionRuleId) || null
      : null
    const billTemplate = bill.billTemplateId ? billTemplatesMap.get(bill.billTemplateId) || null : null

    return {
      ...bill,
      propertyName: property?.name || "Unknown Property",
      invoiceRule,
      paymentRule,
      legacyRule,
      billTemplate
    }
  })

  return <BillsTable bills={billsWithProperties} properties={properties} />
}
