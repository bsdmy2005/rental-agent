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
export declare function normalizePhoneNumber(phoneNumber: string, countryCode?: string): string;
//# sourceMappingURL=phone-number.d.ts.map