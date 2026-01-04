import { config } from "dotenv"
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import {
  customers,
  userProfilesTable,
  landlordsTable,
  rentalAgentsTable,
  rentalAgenciesTable,
  agencyMembershipsTable,
  agencyAdminsTable,
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
  whatsappExplorerMessagesTable,
  whatsappContactsTable,
  whatsappIncidentRateLimitsTable,
  notificationPreferencesTable
} from "./schema"

// Only load .env.local in development (file might not exist in production)
// In production (Render), environment variables are set directly
if (process.env.NODE_ENV !== "production") {
  config({ path: ".env.local" })
}

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
  rentalAgencies: rentalAgenciesTable,
  agencyMemberships: agencyMembershipsTable,
  agencyAdmins: agencyAdminsTable,
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
  whatsappExplorerMessages: whatsappExplorerMessagesTable,
  whatsappContacts: whatsappContactsTable,
  whatsappIncidentRateLimits: whatsappIncidentRateLimitsTable,
  notificationPreferences: notificationPreferencesTable
  // relations
}

function initializeDb(url: string) {
  // Configure connection pool to prevent exhaustion
  // Increased timeout for Render cold starts and network latency
  const client = postgres(url, {
    prepare: false,
    max: 10, // Maximum number of connections in the pool (reduced for Render)
    idle_timeout: 30, // Close idle connections after 20 seconds
    connect_timeout: 30, // Connection timeout in seconds (increased for Render cold starts)
    max_lifetime: 60 * 30, // Maximum lifetime of a connection (30 minutes)
    onnotice: () => {}, // Suppress notices
    transform: {
      undefined: null, // Transform undefined to null
    },
  })
  
  // Handle connection errors gracefully - prevent unhandled rejections
  client.listen('error', (err) => {
    console.error('[DB] Connection error:', err)
    // Errors are logged but not thrown to prevent unhandled rejections
  })
  
  return drizzlePostgres(client, { schema: dbSchema })
}

export const db = initializeDb(databaseUrl)
