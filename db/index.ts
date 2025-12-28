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
  leaseEscalationsTable,
  leaseTemplatesTable,
  billsTable,
  extractionRulesTable,
  ruleSamplesTable,
  emailProcessorsTable,
  extractionJobsTable,
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
  paymentsTable,
  expenseCategoriesTable,
  expensesTable,
  expenseAttachmentsTable,
  depreciationRecordsTable,
  incidentsTable,
  incidentAttachmentsTable,
  incidentStatusHistoryTable,
  serviceProvidersTable,
  serviceProviderAreasTable,
  quoteRequestsTable,
  quotesTable,
  rfqCodesTable,
  rfqAttachmentsTable,
  propertyCodesTable,
  movingInspectionsTable,
  movingInspectionCategoriesTable,
  movingInspectionItemsTable,
  movingInspectionDefectsTable,
  movingInspectionAttachmentsTable,
  movingInspectionDocumentsTable,
  movingInspectionComparisonsTable,
  whatsappSessionsTable,
  whatsappExplorerMessagesTable
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
  leaseEscalations: leaseEscalationsTable,
  leaseTemplates: leaseTemplatesTable,
  bills: billsTable,
  extractionRules: extractionRulesTable,
  ruleSamples: ruleSamplesTable,
  emailProcessors: emailProcessorsTable,
  extractionJobs: extractionJobsTable,
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
  payments: paymentsTable,
  expenseCategories: expenseCategoriesTable,
  expenses: expensesTable,
  expenseAttachments: expenseAttachmentsTable,
  depreciationRecords: depreciationRecordsTable,
  incidents: incidentsTable,
  incidentAttachments: incidentAttachmentsTable,
  incidentStatusHistory: incidentStatusHistoryTable,
  serviceProviders: serviceProvidersTable,
  serviceProviderAreas: serviceProviderAreasTable,
  quoteRequests: quoteRequestsTable,
  quotes: quotesTable,
  rfqCodes: rfqCodesTable,
  rfqAttachments: rfqAttachmentsTable,
  propertyCodes: propertyCodesTable,
  movingInspections: movingInspectionsTable,
  movingInspectionCategories: movingInspectionCategoriesTable,
  movingInspectionItems: movingInspectionItemsTable,
  movingInspectionDefects: movingInspectionDefectsTable,
  movingInspectionAttachments: movingInspectionAttachmentsTable,
  movingInspectionDocuments: movingInspectionDocumentsTable,
  movingInspectionComparisons: movingInspectionComparisonsTable,
  whatsappSessions: whatsappSessionsTable,
  whatsappExplorerMessages: whatsappExplorerMessagesTable
  // relations
}

function initializeDb(url: string) {
  // Configure connection pool to prevent exhaustion
  const client = postgres(url, {
    prepare: false,
    max: 15, // Maximum number of connections in the pool
    idle_timeout: 10, // Close idle connections after 10 seconds
    connect_timeout: 5, // Connection timeout in seconds
    max_lifetime: 60 * 10, // Maximum lifetime of a connection (10 minutes)
    onnotice: () => {}, // Suppress notices
    transform: {
      undefined: null, // Transform undefined to null
    },
  })
  
  // Handle connection errors gracefully
  client.listen('error', (err) => {
    console.error('[DB] Connection error:', err)
  })
  
  return drizzlePostgres(client, { schema: dbSchema })
}

export const db = initializeDb(databaseUrl)
