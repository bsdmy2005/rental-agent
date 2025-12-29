"use server"

import { parseIncidentMessage, extractPropertyCode, isIncidentMessage } from "./message-parser"
import { checkRateLimitAction, recordSubmissionAction } from "@/actions/whatsapp-incident-rate-limits-actions"
import { validatePropertyCodeAction } from "@/actions/property-codes-actions"
import { identifyPropertyByPhoneAction } from "@/actions/property-identification-actions"
import { ActionState } from "@/types"

/**
 * Normalize phone number to 27... format (without +)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "")
  
  // Handle South African numbers
  if (digits.startsWith("0")) {
    // 0821234567 -> 27821234567
    return "27" + digits.substring(1)
  } else if (digits.startsWith("27")) {
    // Already in correct format
    return digits
  } else if (digits.startsWith("8")) {
    // 821234567 -> 27821234567
    return "27" + digits
  }
  
  // Return as-is if no pattern matches
  return digits
}

/**
 * Identify property from WhatsApp message
 * Tries property code first, then phone number matching
 */
export async function identifyPropertyFromMessage(
  messageText: string,
  fromPhoneNumber: string
): Promise<ActionState<{ propertyId: string; propertyName: string; tenantId?: string; tenantName?: string }>> {
  try {
    // Try property code first
    const propertyCode = extractPropertyCode(messageText)
    
    if (propertyCode) {
      const codeResult = await validatePropertyCodeAction(propertyCode)
      if (codeResult.isSuccess && codeResult.data) {
        return {
          isSuccess: true,
          message: "Property identified by code",
          data: {
            propertyId: codeResult.data.propertyId,
            propertyName: codeResult.data.propertyName
          }
        }
      }
    }

    // Fallback to phone number matching
    const normalizedPhone = normalizePhoneNumber(fromPhoneNumber)
    const phoneResult = await identifyPropertyByPhoneAction(normalizedPhone)
    
    if (phoneResult.isSuccess && phoneResult.data) {
      return {
        isSuccess: true,
        message: "Property identified by phone number",
        data: {
          propertyId: phoneResult.data.propertyId,
          propertyName: phoneResult.data.propertyName,
          tenantId: phoneResult.data.tenantId,
          tenantName: phoneResult.data.tenantName
        }
      }
    }

    return {
      isSuccess: false,
      message: propertyCode 
        ? `Invalid property code: ${propertyCode}. Please check your code and try again.`
        : "Could not identify property. Please include your property code (PROP-XXXXXX) in your message."
    }
  } catch (error) {
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to identify property"
    }
  }
}

/**
 * Check rate limit for phone number
 */
export async function checkRateLimit(
  phoneNumber: string
): Promise<ActionState<{ allowed: boolean; remaining: number; resetAt: Date }>> {
  return checkRateLimitAction(phoneNumber)
}

/**
 * Record submission for rate limiting
 */
export async function recordSubmission(
  phoneNumber: string
): Promise<ActionState<void>> {
  return recordSubmissionAction(phoneNumber)
}

/**
 * Parse incident details from WhatsApp message
 */
export function parseIncidentFromWhatsApp(messageText: string): ParsedIncidentMessage {
  return parseIncidentMessage(messageText)
}

/**
 * Check if message is an incident report
 */
export function isIncidentReport(messageText: string): boolean {
  return isIncidentMessage(messageText)
}

// Re-export types
export type { ParsedIncidentMessage } from "./message-parser"

