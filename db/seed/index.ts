"use server"

import process from "process"
import { db } from "../index"
import { customers } from "../schema/customers"
import { customersData } from "./data/customers"
import { expenseCategoriesTable } from "../schema/expense-categories"
import { standardExpenseCategoriesData } from "./data/expense-categories"
import { serviceProvidersTable } from "../schema/service-providers"
import { serviceProviderAreasTable } from "../schema/service-provider-areas"
import { serviceProvidersData, serviceProviderAreasData } from "./data/service-providers"
import { movingInspectionCategoriesTable } from "../schema/moving-inspection-categories-schema"
import { movingInspectionCategoriesData } from "./data/moving-inspection-categories"
import { userProfilesTable } from "../schema/user-profiles"
import { seedLeaseTemplates } from "./data/lease-templates"
import { eq, or } from "drizzle-orm"

async function seed() {
  console.warn("Seeding database...")

  // Reset all tables in reverse order of dependencies
  console.warn("Resetting tables...")
  await db.execute("TRUNCATE TABLE service_provider_areas CASCADE")
  await db.execute("TRUNCATE TABLE service_providers CASCADE")
  await db.execute("TRUNCATE TABLE customers CASCADE")
  await db.execute("TRUNCATE TABLE expense_categories CASCADE")
  await db.execute("TRUNCATE TABLE moving_inspection_categories CASCADE")
  console.warn("Finished resetting tables")

  // Seed customers
  console.warn("Seeding customers...")
  await db.insert(customers).values(customersData)

  // Seed standard expense categories
  console.warn("Seeding standard expense categories...")
  await db.insert(expenseCategoriesTable).values(standardExpenseCategoriesData)

  // Seed moving inspection categories
  console.warn("Seeding moving inspection categories...")
  await db.insert(movingInspectionCategoriesTable).values(movingInspectionCategoriesData)

  // Seed service providers
  console.warn("Seeding service providers...")
  
  // Get first landlord or rental agent user profile to use as createdBy
  const [userProfile] = await db
    .select()
    .from(userProfilesTable)
    .where(or(eq(userProfilesTable.userType, "landlord"), eq(userProfilesTable.userType, "rental_agent")))
    .limit(1)

  if (!userProfile) {
    console.warn("No landlord or rental agent user profile found. Service providers will be seeded without createdBy.")
    console.warn("Please create a landlord or rental agent user first, then re-run the seed.")
  } else {
    console.warn(`Using user profile ${userProfile.id} (${userProfile.userType}) as createdBy for service providers`)
    
    // Set createdBy for all service providers
    const providersWithCreatedBy = serviceProvidersData.map(provider => ({
      ...provider,
      createdBy: userProfile.id
    }))

    // Insert service providers
    const insertedProviders = await db
      .insert(serviceProvidersTable)
      .values(providersWithCreatedBy)
      .returning()

    console.warn(`Inserted ${insertedProviders.length} service providers`)

    // Insert service provider areas
    // Convert null suburbs to city name (for city-wide coverage)
    const areasToInsert = serviceProviderAreasData.map(({ providerIndex, area }) => ({
      ...area,
      suburb: area.suburb || area.city || "Unknown", // Use city name if suburb is null
      serviceProviderId: insertedProviders[providerIndex].id
    }))

    await db.insert(serviceProviderAreasTable).values(areasToInsert)
    console.warn(`Inserted ${areasToInsert.length} service provider areas`)
  }

  // Seed lease templates
  console.warn("Seeding lease templates...")
  await seedLeaseTemplates()

  console.warn("Seeding complete!")
  db.$client.end()
}

seed().catch(error => {
  console.error("Error seeding database:", error)
  process.exit(1)
})
