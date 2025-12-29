import crypto from "crypto"

/**
 * Generate a 6-digit OTP code
 * Uses cryptographically secure random number generation
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString()
}

/**
 * Generate OTP expiry time (10 minutes from now)
 * @returns Date object representing when the OTP expires
 */
export function getOtpExpiry(): Date {
  return new Date(Date.now() + 10 * 60 * 1000)
}

/**
 * Check if OTP is expired
 * @param expiresAt - The expiry timestamp to check
 * @returns true if the OTP has expired, false otherwise
 */
export function isOtpExpired(expiresAt: string | Date): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * Verify OTP code against stored code and expiry
 * @param inputCode - The OTP code provided by the user
 * @param storedCode - The OTP code stored in the database
 * @param expiresAt - The expiry timestamp of the stored OTP
 * @returns Object indicating validity and reason if invalid
 */
export function verifyOtp(
  inputCode: string,
  storedCode: string,
  expiresAt: string | Date
): { valid: boolean; reason?: string } {
  if (isOtpExpired(expiresAt)) {
    return { valid: false, reason: "OTP has expired" }
  }

  if (inputCode.trim() !== storedCode) {
    return { valid: false, reason: "Invalid OTP code" }
  }

  return { valid: true }
}

/**
 * Format OTP email content for sending verification emails
 * @param otpCode - The 6-digit OTP code to include in the email
 * @param tenantName - Optional tenant name for personalized greeting
 * @returns Object containing subject, text, and html versions of the email
 */
export function formatOtpEmail(
  otpCode: string,
  tenantName?: string
): {
  subject: string
  text: string
  html: string
} {
  const greeting = tenantName ? `Hi ${tenantName}` : "Hi"

  return {
    subject: "Your RentPilot Verification Code",
    text: `${greeting},

Your verification code is: ${otpCode}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Thanks,
RentPilot`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verification Code</h2>
        <p>${greeting},</p>
        <p>Your verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">
          ${otpCode}
        </p>
        <p>This code will expire in 10 minutes.</p>
        <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
        <p>Thanks,<br>RentPilot</p>
      </div>
    `
  }
}
