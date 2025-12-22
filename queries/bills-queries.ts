import { db } from "@/db"
import { billsTable, extractionRulesTable, type SelectBill, type SelectExtractionRule } from "@/db/schema"
import { eq, inArray } from "drizzle-orm"

export async function getBillByIdQuery(billId: string): Promise<SelectBill | null> {
  const [bill] = await db
    .select()
    .from(billsTable)
    .where(eq(billsTable.id, billId))
    .limit(1)

  return bill || null
}

export async function getBillsByPropertyIdQuery(propertyId: string): Promise<SelectBill[]> {
  const bills = await db
    .select()
    .from(billsTable)
    .where(eq(billsTable.propertyId, propertyId))

  return bills
}

export async function getBillsByStatusQuery(
  status: "pending" | "processing" | "processed" | "error"
): Promise<SelectBill[]> {
  const bills = await db
    .select()
    .from(billsTable)
    .where(eq(billsTable.status, status))

  return bills
}

export interface BillWithRules extends SelectBill {
  invoiceRule: SelectExtractionRule | null
  paymentRule: SelectExtractionRule | null
}

export async function getBillWithRulesQuery(billId: string): Promise<BillWithRules | null> {
  const bill = await getBillByIdQuery(billId)
  if (!bill) {
    return null
  }

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

  return {
    ...bill,
    invoiceRule,
    paymentRule
  }
}

export async function getBillsByPropertyWithRulesQuery(
  propertyId: string
): Promise<BillWithRules[]> {
  const bills = await getBillsByPropertyIdQuery(propertyId)

  // Fetch rules for all bills
  const billsWithRules = await Promise.all(
    bills.map(async (bill) => {
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

      return {
        ...bill,
        invoiceRule,
        paymentRule
      }
    })
  )

  return billsWithRules
}

/**
 * Batch fetch bills for multiple properties
 */
export async function getBillsByPropertyIdsQuery(propertyIds: string[]): Promise<SelectBill[]> {
  if (propertyIds.length === 0) {
    return []
  }

  const bills = await db
    .select()
    .from(billsTable)
    .where(inArray(billsTable.propertyId, propertyIds))

  return bills
}

/**
 * Batch fetch rules by IDs
 */
export async function getRulesByIdsQuery(ruleIds: string[]): Promise<Map<string, SelectExtractionRule>> {
  if (ruleIds.length === 0) {
    return new Map()
  }

  const rules = await db
    .select()
    .from(extractionRulesTable)
    .where(inArray(extractionRulesTable.id, ruleIds))

  return new Map(rules.map((rule) => [rule.id, rule]))
}

