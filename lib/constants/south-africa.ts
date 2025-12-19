export const SOUTH_AFRICAN_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape"
] as const

export const COUNTRIES = [
  "South Africa"
  // Can be expanded in the future
] as const

export type SouthAfricanProvince = typeof SOUTH_AFRICAN_PROVINCES[number]
export type Country = typeof COUNTRIES[number]

