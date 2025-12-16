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
  billsTable,
  extractionRulesTable,
  emailProcessorsTable
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
  bills: billsTable,
  extractionRules: extractionRulesTable,
  emailProcessors: emailProcessorsTable
  // relations
}

function initializeDb(url: string) {
  const client = postgres(url, { prepare: false })
  return drizzlePostgres(client, { schema: dbSchema })
}

export const db = initializeDb(databaseUrl)
