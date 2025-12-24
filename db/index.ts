import { config } from "dotenv"
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import {
  customers,
  userProfilesTable,
  landlordsTable,
  rentalAgentsTable,
  propertiesTable,
  propertyManagementsTable,
  tenantsTable,
  leaseAgreementsTable,
  billsTable,
  extractionRulesTable,
  ruleSamplesTable,
  emailProcessorsTable,
  billingSchedulesTable,
  billingScheduleStatusTable,
  billingPeriodsTable,
  periodBillMatchesTable,
  billTemplatesTable,
  payableTemplatesTable,
  rentalInvoiceTemplatesTable,
  payableInstancesTable,
  rentalInvoiceInstancesTable,
  billArrivalSchedulesTable,
  payableSchedulesTable,
  paymentInstructionsTable,
  bankAccountsTable,
  beneficiariesTable,
  accountBeneficiariesTable,
  paymentsTable
} from "./schema"

config({ path: ".env.local" })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set")
}

const dbSchema = {
  // tables
  customers,
  userProfiles: userProfilesTable,
  landlords: landlordsTable,
  rentalAgents: rentalAgentsTable,
  properties: propertiesTable,
  propertyManagements: propertyManagementsTable,
  tenants: tenantsTable,
  leaseAgreements: leaseAgreementsTable,
  bills: billsTable,
  extractionRules: extractionRulesTable,
  ruleSamples: ruleSamplesTable,
  emailProcessors: emailProcessorsTable,
  billingSchedules: billingSchedulesTable,
  billingScheduleStatus: billingScheduleStatusTable,
  billingPeriods: billingPeriodsTable,
  periodBillMatches: periodBillMatchesTable,
  billTemplates: billTemplatesTable,
  payableTemplates: payableTemplatesTable,
  rentalInvoiceTemplates: rentalInvoiceTemplatesTable,
  payableInstances: payableInstancesTable,
  rentalInvoiceInstances: rentalInvoiceInstancesTable,
  billArrivalSchedules: billArrivalSchedulesTable,
  payableSchedules: payableSchedulesTable,
  paymentInstructions: paymentInstructionsTable,
  bankAccounts: bankAccountsTable,
  beneficiaries: beneficiariesTable,
  accountBeneficiaries: accountBeneficiariesTable,
  payments: paymentsTable
  // relations
}

function initializeDb(url: string) {
  const client = postgres(url, { prepare: false })
  return drizzlePostgres(client, { schema: dbSchema })
}

export const db = initializeDb(databaseUrl)
