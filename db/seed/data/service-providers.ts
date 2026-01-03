import { type InsertServiceProvider } from "../../schema/service-providers"
import { type InsertServiceProviderArea } from "../../schema/service-provider-areas"

// Note: createdBy will need to be set to an actual userProfileId
// This should be updated when seeding, or you can query for the first landlord/agent user
export const serviceProvidersData: InsertServiceProvider[] = [
  {
    businessName: "Cape Town Plumbing Services",
    contactName: "John Smith",
    phone: "+27 21 123 4567",
    whatsappNumber: "+27 82 123 4567",
    email: "john.smith@capetownplumbing.co.za",
    specialization: "plumbing",
    licenseNumber: "PLB-2024-CT-001",
    insuranceInfo: "Public Liability Insurance: R2M coverage, expires 2025-12-31",
    isActive: true,
    createdBy: "", // Will be set during seeding
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    businessName: "Gauteng Electrical Solutions",
    contactName: "Sarah Johnson",
    phone: "+27 11 234 5678",
    whatsappNumber: "+27 83 234 5678",
    email: "sarah@gautengelectrical.co.za",
    specialization: "electrical",
    licenseNumber: "ELC-2024-GP-045",
    insuranceInfo: "Comprehensive insurance coverage including public liability and equipment insurance",
    isActive: true,
    createdBy: "", // Will be set during seeding
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    businessName: "Durban HVAC Experts",
    contactName: "Michael Brown",
    phone: "+27 31 345 6789",
    whatsappNumber: "+27 84 345 6789",
    email: "michael@durbanhvac.co.za",
    specialization: "hvac",
    licenseNumber: "HVAC-2024-KZN-012",
    insuranceInfo: "Public Liability: R1.5M",
    isActive: true,
    createdBy: "", // Will be set during seeding
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    businessName: "HandyMan Pro",
    contactName: "David Wilson",
    phone: "+27 12 456 7890",
    whatsappNumber: "+27 85 456 7890",
    email: "david@handymanpro.co.za",
    specialization: "general_maintenance",
    licenseNumber: null,
    insuranceInfo: "General liability insurance",
    isActive: true,
    createdBy: "", // Will be set during seeding
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    businessName: "Premium Paint Works",
    contactName: "Lisa Anderson",
    phone: "+27 13 567 8901",
    whatsappNumber: "+27 86 567 8901",
    email: "lisa@premiumpaint.co.za",
    specialization: "painting",
    licenseNumber: null,
    insuranceInfo: null,
    isActive: true,
    createdBy: "", // Will be set during seeding
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    businessName: "Master Carpentry",
    contactName: "Robert Taylor",
    phone: "+27 14 678 9012",
    whatsappNumber: "+27 87 678 9012",
    email: "robert@mastercarpentry.co.za",
    specialization: "carpentry",
    licenseNumber: "CARP-2024-WC-078",
    insuranceInfo: "Full coverage insurance",
    isActive: true,
    createdBy: "", // Will be set during seeding
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    businessName: "Roof Masters",
    contactName: "Jennifer Martinez",
    phone: "+27 15 789 0123",
    whatsappNumber: "+27 88 789 0123",
    email: "jennifer@roofmasters.co.za",
    specialization: "roofing",
    licenseNumber: "ROOF-2024-GP-023",
    insuranceInfo: "Public Liability: R3M, Workers Compensation included",
    isActive: true,
    createdBy: "", // Will be set during seeding
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    businessName: "Quick Fix Services",
    contactName: "Thomas White",
    phone: "+27 16 890 1234",
    whatsappNumber: "+27 89 890 1234",
    email: "thomas@quickfix.co.za",
    specialization: "general_maintenance",
    licenseNumber: null,
    insuranceInfo: null,
    isActive: true,
    createdBy: "", // Will be set during seeding
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    businessName: "Emergency Plumbing 24/7",
    contactName: "James Davis",
    phone: "+27 17 901 2345",
    whatsappNumber: "+27 90 901 2345",
    email: "james@emergencyplumb.co.za",
    specialization: "plumbing",
    licenseNumber: "PLB-2024-WC-156",
    insuranceInfo: "24/7 Emergency coverage insurance",
    isActive: true,
    createdBy: "", // Will be set during seeding
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    businessName: "Bright Electrical",
    contactName: "Patricia Garcia",
    phone: "+27 18 012 3456",
    whatsappNumber: "+27 91 012 3456",
    email: "patricia@brightelectrical.co.za",
    specialization: "electrical",
    licenseNumber: "ELC-2024-KZN-089",
    insuranceInfo: "Comprehensive electrical contractor insurance",
    isActive: true,
    createdBy: "", // Will be set during seeding
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// Service provider areas - matching providers to different provinces, cities, and suburbs
// Using proper city/suburb structure from geographic data
// Note: serviceProviderId will be set during seeding based on providerIndex
// Note: suburb can be null in seed data for city-wide coverage, even though schema requires it
export const serviceProviderAreasData: Array<{
  providerIndex: number
  area: Omit<InsertServiceProviderArea, 'serviceProviderId' | 'suburb'> & { suburb: string | null }
}> = [
  // Cape Town Plumbing Services - Western Cape, Cape Town
  { providerIndex: 0, area: { suburb: "Green Point", city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  { providerIndex: 0, area: { suburb: "Sea Point", city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  { providerIndex: 0, area: { suburb: "Clifton", city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  
  // Gauteng Electrical Solutions - Gauteng (city-wide coverage for Johannesburg and Pretoria)
  { providerIndex: 1, area: { suburb: null, city: "Johannesburg", province: "Gauteng", country: "South Africa" } },
  { providerIndex: 1, area: { suburb: null, city: "Pretoria", province: "Gauteng", country: "South Africa" } },
  
  // Durban HVAC Experts - KwaZulu-Natal (city-wide coverage for Durban)
  { providerIndex: 2, area: { suburb: null, city: "Durban", province: "KwaZulu-Natal", country: "South Africa" } },
  
  // HandyMan Pro - Multiple provinces (city-wide coverage)
  { providerIndex: 3, area: { suburb: null, city: "Johannesburg", province: "Gauteng", country: "South Africa" } },
  { providerIndex: 3, area: { suburb: null, city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  { providerIndex: 3, area: { suburb: null, city: "Durban", province: "KwaZulu-Natal", country: "South Africa" } },
  
  // Premium Paint Works - Western Cape, Cape Town (specific suburbs)
  { providerIndex: 4, area: { suburb: "Camps Bay", city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  { providerIndex: 4, area: { suburb: "Bakoven", city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  { providerIndex: 4, area: { suburb: "Bantry Bay", city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  
  // Master Carpentry - Western Cape, Cape Town
  { providerIndex: 5, area: { suburb: "Fresnaye", city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  { providerIndex: 5, area: { suburb: "Llandudno", city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  
  // Roof Masters - Gauteng (city-wide coverage)
  { providerIndex: 6, area: { suburb: null, city: "Johannesburg", province: "Gauteng", country: "South Africa" } },
  { providerIndex: 6, area: { suburb: null, city: "Pretoria", province: "Gauteng", country: "South Africa" } },
  
  // Quick Fix Services - Multiple provinces (city-wide coverage)
  { providerIndex: 7, area: { suburb: null, city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  { providerIndex: 7, area: { suburb: null, city: "Johannesburg", province: "Gauteng", country: "South Africa" } },
  
  // Emergency Plumbing 24/7 - Western Cape, Cape Town (specific suburbs)
  { providerIndex: 8, area: { suburb: "Somerset West", city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  { providerIndex: 8, area: { suburb: "Strand", city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  { providerIndex: 8, area: { suburb: "Gordon's Bay", city: "Cape Town", province: "Western Cape", country: "South Africa" } },
  
  // Bright Electrical - KwaZulu-Natal (city-wide coverage for Durban)
  { providerIndex: 9, area: { suburb: null, city: "Durban", province: "KwaZulu-Natal", country: "South Africa" } }
]

