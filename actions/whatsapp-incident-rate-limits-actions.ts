"use server"

import { db } from "@/db"
import { whatsappIncidentRateLimitsTable } from "@/db/schema"
import { eq } from "drizzle-orm"
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
 * Check if phone number has exceeded rate limit
 * Max 3 incidents per hour per phone number
 */
export async function checkRateLimitAction(
  phoneNumber: string
): Promise<ActionState<{ allowed: boolean; remaining: number; resetAt: Date }>> {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber)
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago

    // Get or create rate limit record
    const [rateLimit] = await db
      .select()
      .from(whatsappIncidentRateLimitsTable)
      .where(eq(whatsappIncidentRateLimitsTable.phoneNumber, normalizedPhone))
      .limit(1)

    if (!rateLimit) {
      // No previous submissions, allow
      return {
        isSuccess: true,
        message: "Rate limit check passed",
        data: {
          allowed: true,
          remaining: 3,
          resetAt: new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
        }
      }
    }

    // Check if window has expired (more than 1 hour since windowStart)
    const windowAge = now.getTime() - rateLimit.windowStart.getTime()
    const windowExpired = windowAge > 60 * 60 * 1000 // 1 hour in milliseconds

    if (windowExpired) {
      // Reset window
      await db
        .update(whatsappIncidentRateLimitsTable)
        .set({
          submissionCount: 0,
          windowStart: now,
          updatedAt: now
        })
        .where(eq(whatsappIncidentRateLimitsTable.phoneNumber, normalizedPhone))

      return {
        isSuccess: true,
        message: "Rate limit check passed (window reset)",
        data: {
          allowed: true,
          remaining: 3,
          resetAt: new Date(now.getTime() + 60 * 60 * 1000)
        }
      }
    }

    // Check if limit exceeded
    const maxSubmissions = 3
    const allowed = rateLimit.submissionCount < maxSubmissions
    const remaining = Math.max(0, maxSubmissions - rateLimit.submissionCount)
    const resetAt = new Date(rateLimit.windowStart.getTime() + 60 * 60 * 1000)

    return {
      isSuccess: true,
      message: allowed ? "Rate limit check passed" : "Rate limit exceeded",
      data: {
        allowed,
        remaining,
        resetAt
      }
    }
  } catch (error) {
    console.error("Error checking rate limit:", error)
    // On error, allow submission (fail open)
    return {
      isSuccess: true,
      message: "Rate limit check failed, allowing submission",
      data: {
        allowed: true,
        remaining: 3,
        resetAt: new Date(Date.now() + 60 * 60 * 1000)
      }
    }
  }
}

/**
 * Record a submission for rate limiting
 */
export async function recordSubmissionAction(
  phoneNumber: string
): Promise<ActionState<void>> {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber)
    const now = new Date()

    // Get existing record
    const [existing] = await db
      .select()
      .from(whatsappIncidentRateLimitsTable)
      .where(eq(whatsappIncidentRateLimitsTable.phoneNumber, normalizedPhone))
      .limit(1)

    if (existing) {
      // Check if window expired
      const windowAge = now.getTime() - existing.windowStart.getTime()
      const windowExpired = windowAge > 60 * 60 * 1000

      if (windowExpired) {
        // Reset window
        await db
          .update(whatsappIncidentRateLimitsTable)
          .set({
            submissionCount: 1,
            windowStart: now,
            lastSubmissionAt: now,
            updatedAt: now
          })
          .where(eq(whatsappIncidentRateLimitsTable.phoneNumber, normalizedPhone))
      } else {
        // Increment count
        await db
          .update(whatsappIncidentRateLimitsTable)
          .set({
            submissionCount: existing.submissionCount + 1,
            lastSubmissionAt: now,
            updatedAt: now
          })
          .where(eq(whatsappIncidentRateLimitsTable.phoneNumber, normalizedPhone))
      }
    } else {
      // Create new record
      await db.insert(whatsappIncidentRateLimitsTable).values({
        phoneNumber: normalizedPhone,
        submissionCount: 1,
        windowStart: now,
        lastSubmissionAt: now
      })
    }

    return {
      isSuccess: true,
      message: "Submission recorded",
      data: undefined
    }
  } catch (error) {
    console.error("Error recording submission:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to record submission"
    }
  }
}

