import { db } from "@/db"
import {
  payableInstancesTable,
  payableTemplatesTable,
  propertiesTable,
  bankAccountsTable,
  beneficiariesTable,
  paymentsTable,
  billsTable,
  type SelectPayableInstance,
  type SelectPayableTemplate,
  type SelectProperty,
  type SelectBankAccount,
  type SelectBeneficiary,
  type SelectPayment,
  type SelectBill
} from "@/db/schema"
import { eq, and, inArray, desc } from "drizzle-orm"

export interface PayableInstanceWithDetails {
  id: string
  propertyId: string
  propertyName: string
  payableTemplateId: string
  templateName: string
  templateBankAccountId: string | null
  templateBeneficiaryId: string | null
  bankAccountName: string | null
  beneficiaryName: string | null
  periodYear: number
  periodMonth: number
  scheduledDate: Date
  status: string
  amount: number // Extracted from payableData
  currency: string
  payableData: any
  latestPayment: {
    id: string
    status: string
    amount: string
    executedAt: Date | null
    transactionId: string | null
  } | null
}

/**
 * Get payable instances with all related details for multiple properties
 */
export async function getPayableInstancesWithDetailsQuery(
  propertyIds: string[]
): Promise<PayableInstanceWithDetails[]> {
  if (propertyIds.length === 0) {
    return []
  }

  // Fetch all payable instances for the properties
  const instances = await db
    .select()
    .from(payableInstancesTable)
    .where(inArray(payableInstancesTable.propertyId, propertyIds))
    .orderBy(desc(payableInstancesTable.periodYear), desc(payableInstancesTable.periodMonth))

  // Fetch related data in parallel
  const templateIds = [...new Set(instances.map((i) => i.payableTemplateId))]
  const templates = await db
    .select()
    .from(payableTemplatesTable)
    .where(inArray(payableTemplatesTable.id, templateIds))

  const properties = await db
    .select()
    .from(propertiesTable)
    .where(inArray(propertiesTable.id, propertyIds))

  // Fetch bank accounts and beneficiaries for templates that have them
  const bankAccountIds = templates
    .map((t) => t.bankAccountId)
    .filter((id): id is string => id !== null)
  const bankAccounts = bankAccountIds.length > 0
    ? await db
        .select()
        .from(bankAccountsTable)
        .where(inArray(bankAccountsTable.id, bankAccountIds))
    : []

  const beneficiaryIds = templates
    .map((t) => (t as any).beneficiaryId)
    .filter((id): id is string => id !== null && id !== undefined)
  const beneficiaries = beneficiaryIds.length > 0
    ? await db
        .select()
        .from(beneficiariesTable)
        .where(inArray(beneficiariesTable.id, beneficiaryIds))
    : []

  // Fetch latest payment for each instance
  const instanceIds = instances.map((i) => i.id)
  const payments = instanceIds.length > 0
    ? await db
        .select()
        .from(paymentsTable)
        .where(inArray(paymentsTable.payableInstanceId, instanceIds))
        .orderBy(desc(paymentsTable.createdAt))
    : []

  // Fetch contributing bills for instances that have them (for fallback amount extraction)
  const allContributingBillIds: string[] = []
  instances.forEach((instance) => {
    if (instance.contributingBillIds && Array.isArray(instance.contributingBillIds)) {
      allContributingBillIds.push(...(instance.contributingBillIds as string[]))
    }
  })
  const contributingBills = allContributingBillIds.length > 0
    ? await db
        .select()
        .from(billsTable)
        .where(inArray(billsTable.id, allContributingBillIds))
    : []

  // Create lookup maps
  const templateMap = new Map(templates.map((t) => [t.id, t]))
  const propertyMap = new Map(properties.map((p) => [p.id, p]))
  const bankAccountMap = new Map(bankAccounts.map((ba) => [ba.id, ba]))
  const beneficiaryMap = new Map(beneficiaries.map((b) => [b.id, b]))
  const billMap = new Map(contributingBills.map((b) => [b.id, b]))
  
  // Group payments by instance ID and get latest
  const paymentMap = new Map<string, SelectPayment>()
  payments.forEach((payment) => {
    if (!paymentMap.has(payment.payableInstanceId)) {
      paymentMap.set(payment.payableInstanceId, payment)
    }
  })

  // Build enriched results
  const results: PayableInstanceWithDetails[] = instances.map((instance) => {
    const template = templateMap.get(instance.payableTemplateId)
    const property = propertyMap.get(instance.propertyId)
    const bankAccount = template?.bankAccountId
      ? bankAccountMap.get(template.bankAccountId)
      : null
    const beneficiary = template && (template as any).beneficiaryId
      ? beneficiaryMap.get((template as any).beneficiaryId)
      : null
    const latestPayment = paymentMap.get(instance.id)

    // Extract amount from payableData
    // payableData structure can be:
    // 1. { amount: number, currency?: string }
    // 2. { totalAmount: number, period?: string, landlordPayableItems?: Array<{ amount: number }> }
    // 3. null (if not yet populated from bill extraction)
    const payableData = instance.payableData as {
      amount?: number
      totalAmount?: number
      currency?: string
      landlordPayableItems?: Array<{ amount?: number }>
    } | null
    
    let amount = 0
    let currency = "ZAR"
    
    // First try to extract from payableData
    if (payableData?.amount) {
      amount = payableData.amount
      currency = payableData.currency || "ZAR"
    } else if (payableData?.totalAmount) {
      amount = payableData.totalAmount
      currency = payableData.currency || "ZAR"
    } else if (payableData?.landlordPayableItems && payableData.landlordPayableItems.length > 0) {
      // Sum amounts from landlordPayableItems if totalAmount not present
      amount = payableData.landlordPayableItems.reduce((sum, item) => sum + (item.amount || 0), 0)
      currency = payableData.currency || "ZAR"
    } else if (!payableData && instance.contributingBillIds && Array.isArray(instance.contributingBillIds)) {
      // Fallback: Extract from contributing bills' paymentExtractionData
      const billIds = instance.contributingBillIds as string[]
      for (const billId of billIds) {
        const bill = billMap.get(billId)
        if (bill?.paymentExtractionData) {
          const paymentData = bill.paymentExtractionData as {
            totalAmount?: number
            landlordPayableItems?: Array<{ amount?: number }>
          } | null
          if (paymentData?.totalAmount) {
            amount = paymentData.totalAmount
            break
          } else if (paymentData?.landlordPayableItems && paymentData.landlordPayableItems.length > 0) {
            amount = paymentData.landlordPayableItems.reduce((sum, item) => sum + (item.amount || 0), 0)
            break
          }
        }
      }
    }

    return {
      id: instance.id,
      propertyId: instance.propertyId,
      propertyName: property?.name || "Unknown Property",
      payableTemplateId: instance.payableTemplateId,
      templateName: template?.name || "Unknown Template",
      templateBankAccountId: template?.bankAccountId || null,
      templateBeneficiaryId: (template as any).beneficiaryId || null,
      bankAccountName: bankAccount?.accountName || null,
      beneficiaryName: beneficiary?.name || null,
      periodYear: instance.periodYear,
      periodMonth: instance.periodMonth,
      scheduledDate: instance.scheduledDate,
      status: instance.status,
      amount,
      currency,
      payableData: instance.payableData,
      latestPayment: latestPayment
        ? {
            id: latestPayment.id,
            status: latestPayment.status,
            amount: latestPayment.amount,
            executedAt: latestPayment.executedAt,
            transactionId: latestPayment.investecTransactionId || null
          }
        : null
    }
  })

  return results
}

/**
 * Get single payable instance with all details
 */
export async function getPayableInstanceWithDetailsQuery(
  instanceId: string
): Promise<PayableInstanceWithDetails | null> {
  const instance = await db.query.payableInstances.findFirst({
    where: eq(payableInstancesTable.id, instanceId)
  })

  if (!instance) {
    return null
  }

  // Fetch related data
  const template = await db.query.payableTemplates.findFirst({
    where: eq(payableTemplatesTable.id, instance.payableTemplateId)
  })

  const property = await db.query.properties.findFirst({
    where: eq(propertiesTable.id, instance.propertyId)
  })

  const bankAccount = template?.bankAccountId
    ? await db.query.bankAccounts.findFirst({
        where: eq(bankAccountsTable.id, template.bankAccountId)
      })
    : null

  const beneficiary = template && (template as any).beneficiaryId
    ? await db.query.beneficiaries.findFirst({
        where: eq(beneficiariesTable.id, (template as any).beneficiaryId)
      })
    : null

  // Fetch all payments for this instance
  const allPayments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.payableInstanceId, instanceId))
    .orderBy(desc(paymentsTable.createdAt))

  const latestPayment = allPayments[0] || null

  // Fetch contributing bills for fallback amount extraction
  const contributingBillIds = instance.contributingBillIds && Array.isArray(instance.contributingBillIds)
    ? (instance.contributingBillIds as string[])
    : []
  const contributingBills = contributingBillIds.length > 0
    ? await db
        .select()
        .from(billsTable)
        .where(inArray(billsTable.id, contributingBillIds))
    : []
  const billMap = new Map(contributingBills.map((b) => [b.id, b]))

  // Extract amount from payableData
  // payableData structure can be:
  // 1. { amount: number, currency?: string }
  // 2. { totalAmount: number, period?: string, landlordPayableItems?: Array<{ amount: number }> }
  // 3. null (if not yet populated from bill extraction)
  const payableData = instance.payableData as {
    amount?: number
    totalAmount?: number
    currency?: string
    landlordPayableItems?: Array<{ amount?: number }>
  } | null
  
  let amount = 0
  let currency = "ZAR"
  
  // First try to extract from payableData
  if (payableData?.amount) {
    amount = payableData.amount
    currency = payableData.currency || "ZAR"
  } else if (payableData?.totalAmount) {
    amount = payableData.totalAmount
    currency = payableData.currency || "ZAR"
  } else if (payableData?.landlordPayableItems && payableData.landlordPayableItems.length > 0) {
    // Sum amounts from landlordPayableItems if totalAmount not present
    amount = payableData.landlordPayableItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    currency = payableData.currency || "ZAR"
  } else if (!payableData && contributingBillIds.length > 0) {
    // Fallback: Extract from contributing bills' paymentExtractionData
    for (const billId of contributingBillIds) {
      const bill = billMap.get(billId)
      if (bill?.paymentExtractionData) {
        const paymentData = bill.paymentExtractionData as {
          totalAmount?: number
          landlordPayableItems?: Array<{ amount?: number }>
        } | null
        if (paymentData?.totalAmount) {
          amount = paymentData.totalAmount
          break
        } else if (paymentData?.landlordPayableItems && paymentData.landlordPayableItems.length > 0) {
          amount = paymentData.landlordPayableItems.reduce((sum, item) => sum + (item.amount || 0), 0)
          break
        }
      }
    }
  }

  return {
    id: instance.id,
    propertyId: instance.propertyId,
    propertyName: property?.name || "Unknown Property",
    payableTemplateId: instance.payableTemplateId,
    templateName: template?.name || "Unknown Template",
    templateBankAccountId: template?.bankAccountId || null,
    templateBeneficiaryId: (template as any).beneficiaryId || null,
    bankAccountName: bankAccount?.accountName || null,
    beneficiaryName: beneficiary?.name || null,
    periodYear: instance.periodYear,
    periodMonth: instance.periodMonth,
    scheduledDate: instance.scheduledDate,
    status: instance.status,
    amount,
    currency,
    payableData: instance.payableData,
    latestPayment: latestPayment
      ? {
          id: latestPayment.id,
          status: latestPayment.status,
          amount: latestPayment.amount,
          executedAt: latestPayment.executedAt,
          transactionId: latestPayment.investecTransactionId || null
        }
      : null
  }
}

