import { SOUTH_AFRICAN_GEOGRAPHIC_DATA, type City, type Suburb } from "@/lib/constants/south-africa-geographic-data"

/**
 * Get all cities for a given province
 */
export function getCitiesByProvince(province: string): City[] {
  const provinceData = SOUTH_AFRICAN_GEOGRAPHIC_DATA[province]
  if (!provinceData) {
    return []
  }
  return provinceData.cities
}

/**
 * Get all suburbs for a given city within a province
 */
export function getSuburbsByCity(province: string, city: string): Suburb[] {
  const provinceData = SOUTH_AFRICAN_GEOGRAPHIC_DATA[province]
  if (!provinceData) {
    return []
  }

  const cityData = provinceData.cities.find((c) => c.name.toLowerCase() === city.toLowerCase())
  if (!cityData) {
    return []
  }

  return cityData.suburbs
}

/**
 * Get all suburbs as a flat array with province and city information
 */
export function getAllSuburbsFlat(): Array<{ province: string; city: string; suburb: string }> {
  const result: Array<{ province: string; city: string; suburb: string }> = []

  for (const [provinceName, provinceData] of Object.entries(SOUTH_AFRICAN_GEOGRAPHIC_DATA)) {
    for (const city of provinceData.cities) {
      for (const suburb of city.suburbs) {
        result.push({
          province: provinceName,
          city: city.name,
          suburb: suburb.name
        })
      }
    }
  }

  return result
}

/**
 * Search suburbs by query string (searches suburb name, city name, and province name)
 */
export function searchSuburbs(
  query: string
): Array<{ province: string; city: string; suburb: string }> {
  if (!query || query.trim().length === 0) {
    return getAllSuburbsFlat()
  }

  const lowerQuery = query.toLowerCase().trim()
  const allSuburbs = getAllSuburbsFlat()

  return allSuburbs.filter((item) => {
    return (
      item.suburb.toLowerCase().includes(lowerQuery) ||
      item.city.toLowerCase().includes(lowerQuery) ||
      item.province.toLowerCase().includes(lowerQuery)
    )
  })
}

/**
 * Get all provinces
 */
export function getAllProvinces(): string[] {
  return Object.keys(SOUTH_AFRICAN_GEOGRAPHIC_DATA)
}

/**
 * Get all cities across all provinces
 */
export function getAllCities(): Array<{ province: string; city: string }> {
  const result: Array<{ province: string; city: string }> = []

  for (const [provinceName, provinceData] of Object.entries(SOUTH_AFRICAN_GEOGRAPHIC_DATA)) {
    for (const city of provinceData.cities) {
      result.push({
        province: provinceName,
        city: city.name
      })
    }
  }

  return result
}

