/**
 * Normalizes phone numbers to WhatsApp-compatible format
 *
 * Handles various input formats:
 * - "+27814338423" -> "27814338423" (removes +)
 * - "0812345678" -> "27812345678" (converts local format to international)
 * - "27814338423" -> "27814338423" (already in correct format)
 * - "0812 345 6789" -> "278123456789" (removes spaces)
 *
 * @param phoneNumber - The phone number to normalize
 * @param countryCode - The country code to use when converting local numbers (default: "27" for South Africa)
 * @returns Normalized phone number without + prefix, ready for WhatsApp
 */
export function normalizePhoneNumber(phoneNumber, countryCode = "27") {
    if (!phoneNumber || typeof phoneNumber !== "string") {
        throw new Error("Phone number must be a non-empty string");
    }
    // Remove all whitespace, dashes, parentheses, and other formatting
    let normalized = phoneNumber.trim().replace(/[\s\-\(\)]/g, "");
    // Remove + prefix if present
    if (normalized.startsWith("+")) {
        normalized = normalized.substring(1);
    }
    // Handle numbers starting with 0 (local format) - convert to international
    // e.g., "0812345678" -> "27812345678"
    if (normalized.startsWith("0")) {
        normalized = countryCode + normalized.substring(1);
    }
    // Remove any remaining non-digit characters (shouldn't be any, but just in case)
    normalized = normalized.replace(/\D/g, "");
    // Validate that we have a reasonable phone number
    if (normalized.length < 8 || normalized.length > 15) {
        throw new Error(`Invalid phone number format: ${phoneNumber} (normalized: ${normalized})`);
    }
    return normalized;
}
//# sourceMappingURL=phone-number.js.map