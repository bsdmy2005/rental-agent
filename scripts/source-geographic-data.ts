#!/usr/bin/env bun

/**
 * Script to source South African geographic data from Property24 or similar sources
 * This script scrapes/fetches real data from external sources, not AI-generated content
 */

import { writeFileSync } from "fs"
import { join } from "path"
import * as cheerio from "cheerio"

interface Suburb {
  name: string
  code?: string
}

interface City {
  name: string
  suburbs: Suburb[]
}

interface ProvinceData {
  name: string
  cities: City[]
}

// Rate limiting helper
async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Scrapes Property24's city listing pages to extract cities and suburbs
 * Pattern: https://www.property24.com/for-sale/all-cities/{province-slug}/1
 */
async function fetchFromProperty24(): Promise<Record<string, ProvinceData> | null> {
  try {
    console.log("Fetching data from Property24...")
    
    const data: Record<string, ProvinceData> = {}
    
    // Province slugs mapping (lowercase, hyphenated)
    const provinces = [
      { name: "Western Cape", slug: "western-cape" },
      { name: "Gauteng", slug: "gauteng" },
      { name: "KwaZulu-Natal", slug: "kwa-zulu-natal" },
      { name: "Eastern Cape", slug: "eastern-cape" },
      { name: "Free State", slug: "free-state" },
      { name: "Mpumalanga", slug: "mpumalanga" },
      { name: "Limpopo", slug: "limpopo" },
      { name: "North West", slug: "north-west" },
      { name: "Northern Cape", slug: "northern-cape" }
    ]

    for (const province of provinces) {
      try {
        console.log(`\nFetching ${province.name}...`)
        
        // Fetch province cities page
        const provinceUrl = `https://www.property24.com/for-sale/all-cities/${province.slug}/1`
        const response = await fetch(provinceUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        })

        if (!response.ok) {
          console.warn(`Failed to fetch ${province.name}: ${response.status} ${response.statusText}`)
          continue
        }

        const html = await response.text()
        const $ = cheerio.load(html)
        
        const cities: City[] = []
        const seenCities = new Set<string>()
        
        // Property24 lists cities with pattern: "CityName (property_count)"
        // Look for links that match this pattern
        $("a[href*='/for-sale/']").each((_, element) => {
          const href = $(element).attr("href") || ""
          let text = $(element).text().trim()
          
          // Remove property count from text if present: "CityName (1234)" -> "CityName"
          text = text.replace(/\s*\(\d+\)\s*$/, "").trim()
          
          // Pattern: /for-sale/{city-slug}/{province-slug}
          // Extract city name from link text
          if (
            href.includes("/for-sale/") &&
            !href.includes("/all-cities/") &&
            !href.includes("/commercial/") &&
            !href.includes("/rent/") &&
            !href.includes("/auctions/") &&
            !href.includes("/repossessions/") &&
            text &&
            text.length > 2 &&
            text.length < 50 &&
            !text.match(/^\d+$/) && // Not just numbers
            !text.toLowerCase().includes("property") &&
            !text.toLowerCase().includes("for sale") &&
            !text.toLowerCase().includes("to rent") &&
            !seenCities.has(text.toLowerCase())
          ) {
            // Verify this is a city link by checking URL structure
            const urlParts = href.split("/").filter(p => p)
            const forSaleIndex = urlParts.indexOf("for-sale")
            
            if (forSaleIndex >= 0 && forSaleIndex + 1 < urlParts.length) {
              const citySlug = urlParts[forSaleIndex + 1]
              // Skip if it's a province slug or other non-city patterns
              // Filter out navigation items and invalid city names
              const isNavigationItem = 
                text.toLowerCase().includes("property for sale") ||
                text.toLowerCase().includes("commercial property") ||
                text.toLowerCase().includes("auctions") ||
                text.toLowerCase().includes("repossessions") ||
                text.toLowerCase().includes("on show") ||
                text.toLowerCase().includes("developments") ||
                text.toLowerCase().includes("retirement") ||
                text.toLowerCase().includes("helpful links") ||
                text.toLowerCase().includes("buyers guide") ||
                text.toLowerCase().includes("seller guide") ||
                citySlug === province.slug ||
                citySlug.includes("all-cities") ||
                citySlug.length <= 2
              
              if (!isNavigationItem) {
                cities.push({
                  name: text,
                  suburbs: [] // Will be populated in next step
                })
                seenCities.add(text.toLowerCase())
              }
            }
          }
        })
        
        // Also look for city names in specific content areas
        // Property24 often lists cities in a main content area
        $("main a, .content a, [class*='listing'] a, [class*='city'] a").each((_, element) => {
          const href = $(element).attr("href") || ""
          let text = $(element).text().trim()
          
          // Remove property count
          text = text.replace(/\s*\(\d+\)\s*$/, "").trim()
          
          if (
            href.includes("/for-sale/") &&
            !href.includes("/all-cities/") &&
            text &&
            text.length > 2 &&
            text.length < 50 &&
            !seenCities.has(text.toLowerCase()) &&
            !text.match(/^\d+$/)
          ) {
            const urlParts = href.split("/").filter(p => p)
            const forSaleIndex = urlParts.indexOf("for-sale")
            
            if (forSaleIndex >= 0 && forSaleIndex + 1 < urlParts.length) {
              const citySlug = urlParts[forSaleIndex + 1]
              if (citySlug !== province.slug && citySlug.length > 2) {
                cities.push({
                  name: text,
                  suburbs: []
                })
                seenCities.add(text.toLowerCase())
              }
            }
          }
        })

        // Remove duplicates and sort
        const uniqueCities = Array.from(
          new Map(cities.map(c => [c.name.toLowerCase(), c])).values()
        ).sort((a, b) => a.name.localeCompare(b.name))

        console.log(`Found ${uniqueCities.length} cities in ${province.name}`)

        // For each city, fetch suburbs
        // Limit to reasonable number to avoid too many requests
        const citiesToProcess = uniqueCities.slice(0, 30)
        console.log(`Processing ${citiesToProcess.length} cities for suburbs...`)
        
        for (const city of citiesToProcess) {
          try {
            await delay(1500) // Rate limiting - be respectful
            
            // Construct city URL - Property24 pattern: /for-sale/{city-slug}/{province-slug}
            const citySlug = city.name.toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "") // Remove special characters
            const cityUrl = `https://www.property24.com/for-sale/${citySlug}/${province.slug}`
            
            const cityResponse = await fetch(cityUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            })

            if (cityResponse.ok) {
              const cityHtml = await cityResponse.text()
              const $city = cheerio.load(cityHtml)
              
              const suburbs: Suburb[] = []
              const seenSuburbs = new Set<string>()
              
              // Look for suburb links - suburbs appear as links on city pages
              // Property24 pattern for suburbs: /for-sale/{city-slug}/{suburb-slug}/{province-slug}
              // Or sometimes: /for-sale/{suburb-slug}/{city-slug}/{province-slug}
              $city("a[href*='/for-sale/']").each((_, element) => {
                const href = $city(element).attr("href") || ""
                let text = $city(element).text().trim()
                
                // Remove property count if present: "SuburbName (123)" -> "SuburbName"
                text = text.replace(/\s*\(\d+\)\s*$/, "").trim()
                
                if (!text || text.length < 2 || text.length > 50 || text.match(/^\d+$/)) {
                  return
                }
                
                // Skip navigation and non-suburb links
                if (
                  text.toLowerCase().includes("property") ||
                  text.toLowerCase().includes("for sale") ||
                  text.toLowerCase().includes("to rent") ||
                  text.toLowerCase().includes("commercial") ||
                  text.toLowerCase().includes("auction") ||
                  href.includes("/all-cities/") ||
                  href.includes("/commercial/") ||
                  href.includes("/rent/") ||
                  href.includes("/auctions/")
                ) {
                  return
                }
                
                // Check URL structure - suburbs typically have 3+ path segments after /for-sale/
                const urlParts = href.split("/").filter(p => p)
                const forSaleIndex = urlParts.indexOf("for-sale")
                
                if (forSaleIndex >= 0 && forSaleIndex + 2 < urlParts.length) {
                  const firstPart = urlParts[forSaleIndex + 1]
                  const secondPart = urlParts[forSaleIndex + 2]
                  
                  // Suburb pattern: /for-sale/{city}/{suburb}/{province} or /for-sale/{suburb}/{city}/{province}
                  // Make sure it's not the city name itself
                  const isSuburb = (
                    (firstPart === citySlug && secondPart !== province.slug && secondPart.length > 2) ||
                    (secondPart === citySlug && firstPart !== province.slug && firstPart.length > 2)
                  ) && !uniqueCities.some(c => 
                    c.name.toLowerCase() === text.toLowerCase() ||
                    c.name.toLowerCase().includes(text.toLowerCase()) ||
                    text.toLowerCase().includes(c.name.toLowerCase())
                  )
                  
                  if (isSuburb && !seenSuburbs.has(text.toLowerCase())) {
                    suburbs.push({ name: text })
                    seenSuburbs.add(text.toLowerCase())
                  }
                }
              })
              
              // Also look for suburbs in specific content sections
              // Property24 often lists suburbs in a grid or list format
              $city("main a, .suburbs a, [class*='suburb'] a, [class*='area'] a").each((_, element) => {
                const href = $city(element).attr("href") || ""
                let text = $city(element).text().trim()
                text = text.replace(/\s*\(\d+\)\s*$/, "").trim()
                
                if (
                  text &&
                  text.length > 2 &&
                  text.length < 50 &&
                  href.includes("/for-sale/") &&
                  !seenSuburbs.has(text.toLowerCase()) &&
                  !uniqueCities.some(c => c.name.toLowerCase() === text.toLowerCase())
                ) {
                  suburbs.push({ name: text })
                  seenSuburbs.add(text.toLowerCase())
                }
              })

              // Remove duplicates and limit
              const uniqueSuburbs = Array.from(
                new Map(suburbs.map(s => [s.name.toLowerCase(), s])).values()
              ).slice(0, 100) // Limit suburbs per city

              city.suburbs = uniqueSuburbs
              if (uniqueSuburbs.length > 0) {
                console.log(`  ✓ ${city.name}: ${uniqueSuburbs.length} suburbs`)
              }
            } else {
              // City page might not exist or have different structure
              // Continue without suburbs
            }
          } catch (error) {
            // Silently continue - some cities might not have suburb pages
          }
        }

        if (uniqueCities.length > 0) {
          data[province.name] = {
            name: province.name,
            cities: uniqueCities
          }
        }

        // Rate limiting between provinces
        await delay(2000)
      } catch (error) {
        console.warn(`Error processing ${province.name}:`, error)
        continue
      }
    }

    return Object.keys(data).length > 0 ? data : null
  } catch (error) {
    console.error("Error fetching from Property24:", error)
    return null
  }
}

/**
 * Fetches data from Wikipedia lists of suburbs
 * Wikipedia has structured lists that are easier to parse
 */
async function fetchFromWikipedia(): Promise<Record<string, ProvinceData> | null> {
  try {
    console.log("Fetching data from Wikipedia...")
    
    const data: Record<string, ProvinceData> = {}
    
    // Wikipedia URLs for major cities
    const wikipediaSources = [
      {
        province: "Western Cape",
        city: "Cape Town",
        url: "https://en.wikipedia.org/wiki/List_of_suburbs_of_Cape_Town"
      },
      {
        province: "Gauteng",
        city: "Johannesburg",
        url: "https://en.wikipedia.org/wiki/List_of_suburbs_of_Johannesburg"
      },
      {
        province: "Gauteng",
        city: "Pretoria",
        url: "https://en.wikipedia.org/wiki/List_of_suburbs_of_Pretoria"
      },
      {
        province: "KwaZulu-Natal",
        city: "Durban",
        url: "https://en.wikipedia.org/wiki/List_of_suburbs_of_Durban"
      }
    ]

    for (const source of wikipediaSources) {
      try {
        console.log(`Fetching ${source.city}, ${source.province}...`)
        
        const response = await fetch(source.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        })

        if (!response.ok) {
          console.warn(`Failed to fetch ${source.city}: ${response.statusText}`)
          continue
        }

        const html = await response.text()
        const $ = cheerio.load(html)
        
        // Parse Wikipedia list structure
        // Wikipedia lists are typically in <ul> or <table> format
        const suburbs: Suburb[] = []
        const seenSuburbs = new Set<string>()
        
        // Extract from list items (<li>)
        $("ul li, ol li").each((_, element) => {
          const text = $(element).text().trim()
          // Filter out non-suburb items
          if (
            text &&
            text.length > 2 &&
            text.length < 50 &&
            !text.toLowerCase().includes("see also") &&
            !text.toLowerCase().includes("references") &&
            !text.toLowerCase().includes("external links") &&
            !text.toLowerCase().includes("categories") &&
            !text.match(/^\d+$/) && // Not just numbers
            !text.includes("(") && // Avoid "See also (disambiguation)" type entries
            !seenSuburbs.has(text.toLowerCase())
          ) {
            // Clean up the text (remove extra whitespace, etc.)
            const cleanText = text.split("\n")[0].trim()
            if (cleanText) {
              suburbs.push({ name: cleanText })
              seenSuburbs.add(cleanText.toLowerCase())
            }
          }
        })

        // Extract from tables
        $("table.wikitable tr, table.sortable tr").each((_, row) => {
          const firstCell = $(row).find("td").first()
          if (firstCell.length > 0) {
            const text = firstCell.text().trim()
            if (
              text &&
              text.length > 2 &&
              text.length < 50 &&
              !text.toLowerCase().includes("suburb") &&
              !text.toLowerCase().includes("area") &&
              !text.toLowerCase().includes("name") &&
              !seenSuburbs.has(text.toLowerCase())
            ) {
              const cleanText = text.split("\n")[0].trim()
              if (cleanText && !cleanText.match(/^[A-Z\s]+$/)) {
                // Not all caps (which are usually headers)
                suburbs.push({ name: cleanText })
                seenSuburbs.add(cleanText.toLowerCase())
              }
            }
          }
        })

        // Remove duplicates
        const uniqueSuburbs = Array.from(
          new Map(suburbs.map(s => [s.name.toLowerCase(), s])).values()
        )

        if (uniqueSuburbs.length > 0) {
          if (!data[source.province]) {
            data[source.province] = {
              name: source.province,
              cities: []
            }
          }

          data[source.province].cities.push({
            name: source.city,
            suburbs: uniqueSuburbs.slice(0, 100) // Limit to first 100 suburbs
          })

          console.log(`Found ${uniqueSuburbs.length} suburbs for ${source.city}`)
        }

        // Rate limiting - be respectful
        await delay(2000)
      } catch (error) {
        console.warn(`Error fetching ${source.city}:`, error)
        continue
      }
    }

    return Object.keys(data).length > 0 ? data : null
  } catch (error) {
    console.error("Error fetching from Wikipedia:", error)
    return null
  }
}

/**
 * Uses OpenStreetMap Overpass API to get geographic data
 * This is a more reliable source for structured geographic data
 */
async function fetchFromOpenStreetMap(): Promise<Record<string, ProvinceData> | null> {
  try {
    console.log("Fetching data from OpenStreetMap...")
    
    // OpenStreetMap Overpass API query for South African suburbs
    // This would require specific queries for each city
    // For now, return null as this requires more complex setup
    console.warn("OpenStreetMap integration requires more complex queries, skipping for now...")
    return null
  } catch (error) {
    console.warn("Error fetching from OpenStreetMap:", error)
    return null
  }
}

/**
 * Main function to source geographic data
 * Tries multiple sources in order of preference
 */
async function sourceGeographicData() {
  console.log("Starting geographic data sourcing...")
  
  let data: Record<string, ProvinceData> | null = null

  // Try Property24 first (most accurate for property market)
  data = await fetchFromProperty24()
  
  // If Property24 didn't get all data, supplement with Wikipedia
  if (data) {
    console.log("\nSupplementing Property24 data with Wikipedia...")
    const wikipediaData = await fetchFromWikipedia()
    if (wikipediaData) {
      // Merge Wikipedia data into existing data
      for (const [provinceName, provinceData] of Object.entries(wikipediaData)) {
        if (!data[provinceName]) {
          data[provinceName] = provinceData
        } else {
          // Merge cities
          for (const city of provinceData.cities) {
            const existingCity = data[provinceName].cities.find(c => c.name.toLowerCase() === city.name.toLowerCase())
            if (!existingCity) {
              data[provinceName].cities.push(city)
            } else if (existingCity.suburbs.length === 0 && city.suburbs.length > 0) {
              // Use Wikipedia suburbs if Property24 didn't get any
              existingCity.suburbs = city.suburbs
            }
          }
        }
      }
    }
  } else {
    // Fall back to Wikipedia if Property24 completely fails
    data = await fetchFromWikipedia()
  }
  
  // Fall back to OpenStreetMap if both fail
  if (!data) {
    data = await fetchFromOpenStreetMap()
  }

  // If all sources fail, provide a minimal structure for manual population
  if (!data || Object.keys(data).length === 0) {
    console.warn("All data sources failed. Creating minimal structure for manual population.")
    console.warn("You may need to:")
    console.warn("1. Install cheerio: bun add cheerio")
    console.warn("2. Improve the parsing logic")
    console.warn("3. Use a different data source")
    
    // Create minimal structure with major cities
    data = {
      "Western Cape": {
        name: "Western Cape",
        cities: [
          {
            name: "Cape Town",
            suburbs: [] // Empty - needs to be populated
          }
        ]
      },
      "Gauteng": {
        name: "Gauteng",
        cities: [
          {
            name: "Johannesburg",
            suburbs: []
          },
          {
            name: "Pretoria",
            suburbs: []
          }
        ]
      },
      "KwaZulu-Natal": {
        name: "KwaZulu-Natal",
        cities: [
          {
            name: "Durban",
            suburbs: []
          }
        ]
      }
    }
  }

  // Generate TypeScript file
  const outputPath = join(process.cwd(), "lib/constants/south-africa-geographic-data.ts")
  
  const fileContent = `/**
 * South African Geographic Data
 * 
 * This file is auto-generated by scripts/source-geographic-data.ts
 * DO NOT EDIT MANUALLY - Run 'bun scripts/source-geographic-data.ts' to regenerate
 * 
 * Last updated: ${new Date().toISOString()}
 */

export interface Suburb {
  name: string
  code?: string
}

export interface City {
  name: string
  suburbs: Suburb[]
}

export interface ProvinceData {
  name: string
  cities: City[]
}

export const SOUTH_AFRICAN_GEOGRAPHIC_DATA: Record<string, ProvinceData> = ${JSON.stringify(data, null, 2)} as const
`

  writeFileSync(outputPath, fileContent, "utf-8")
  console.log(`\n✅ Geographic data written to ${outputPath}`)
  console.log(`\nProvinces: ${Object.keys(data).length}`)
  
  let totalCities = 0
  let totalSuburbs = 0
  for (const province of Object.values(data)) {
    totalCities += province.cities.length
    for (const city of province.cities) {
      totalSuburbs += city.suburbs.length
    }
  }
  
  console.log(`Cities: ${totalCities}`)
  console.log(`Suburbs: ${totalSuburbs}`)
  console.log("\n✨ Done!")
}

// Run the script
sourceGeographicData().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

