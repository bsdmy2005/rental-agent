/**
 * Generates a human-readable property name from address components
 * Format: "{streetAddress}, {suburb}, {province}, {postalCode}"
 */
export function generatePropertyName(
  streetAddress: string,
  suburb: string,
  province: string,
  postalCode?: string | null
): string {
  const parts: string[] = []

  // Add street address if provided
  if (streetAddress?.trim()) {
    parts.push(streetAddress.trim())
  }

  // Add suburb if provided
  if (suburb?.trim()) {
    parts.push(suburb.trim())
  }

  // Add province if provided
  if (province?.trim()) {
    parts.push(province.trim())
  }

  // Add postal code if provided
  if (postalCode?.trim()) {
    parts.push(postalCode.trim())
  }

  // Join with commas and spaces
  return parts.join(", ")
}

