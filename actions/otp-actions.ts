"use server"

import { ServerClient } from "postmark"
import { ActionState } from "@/types"
import {
  generateOtp,
  getOtpExpiry,
  verifyOtp,
  formatOtpEmail
} from "@/lib/whatsapp/otp-service"
import {
  updateConversationStateAction,
  getOrCreateConversationStateAction
} from "./conversation-state-actions"
import { getTenantByEmailAction, updateTenantPhoneAction } from "./tenants-actions"

/**
 * Get Postmark client instance
 */
function getPostmarkClient(): ServerClient {
  const apiKey = process.env.POSTMARK_API_KEY || process.env.POSTMARK_SERVER_API_TOKEN
  if (!apiKey) {
    throw new Error("POSTMARK_API_KEY or POSTMARK_SERVER_API_TOKEN not found in environment")
  }
  return new ServerClient(apiKey)
}

/**
 * Send an email using Postmark.
 *
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param text - Plain text version of the email
 * @param html - HTML version of the email
 * @returns true if email was sent successfully, false otherwise
 */
async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<boolean> {
  try {
    const fromEmail = process.env.POSTMARK_FROM_EMAIL || "noreply@yourdomain.com"
    const postmarkClient = getPostmarkClient()

    await postmarkClient.sendEmail({
      From: fromEmail,
      To: to,
      Subject: subject,
      TextBody: text,
      HtmlBody: html,
      TrackOpens: true
    })

    console.log(`[OTP Email] Sent to ${to}: ${subject}`)
    return true
  } catch (error) {
    console.error("Error sending OTP email:", error)
    return false
  }
}

/**
 * Send OTP to email for phone verification.
 * Looks up the tenant by email, generates an OTP, stores it in conversation state,
 * and sends the verification email.
 *
 * @param phoneNumber - The WhatsApp phone number being verified
 * @param email - The email address to send the OTP to
 * @returns ActionState with tenant ID and name on success
 */
export async function sendOtpAction(
  phoneNumber: string,
  email: string
): Promise<ActionState<{ tenantId: string; tenantName?: string }>> {
  try {
    // Find tenant by email
    const tenantResult = await getTenantByEmailAction(email)
    if (!tenantResult.isSuccess || !tenantResult.data) {
      return {
        isSuccess: false,
        message:
          "We couldn't find an account with that email address. Please check your email or contact your property manager."
      }
    }

    const tenant = tenantResult.data

    // Generate OTP
    const otpCode = generateOtp()
    const otpExpiry = getOtpExpiry()

    // Update conversation state with OTP
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_otp",
      context: {
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        propertyName: tenant.propertyName,
        tenantName: tenant.name,
        email: email,
        otpCode: otpCode,
        otpExpiresAt: otpExpiry.toISOString()
      }
    })

    // Send OTP email
    const emailContent = formatOtpEmail(otpCode, tenant.name)
    const sent = await sendEmail(
      email,
      emailContent.subject,
      emailContent.text,
      emailContent.html
    )

    if (!sent) {
      return {
        isSuccess: false,
        message: "Failed to send verification email. Please try again."
      }
    }

    return {
      isSuccess: true,
      message: "Verification code sent",
      data: {
        tenantId: tenant.id,
        tenantName: tenant.name
      }
    }
  } catch (error) {
    console.error("Error sending OTP:", error)
    return {
      isSuccess: false,
      message: "Failed to send verification code"
    }
  }
}

/**
 * Verify OTP and link phone to tenant.
 * Validates the OTP code against the stored code in conversation state,
 * links the phone number to the tenant for future auto-identification,
 * and updates the conversation state to proceed with incident reporting.
 *
 * @param phoneNumber - The WhatsApp phone number being verified
 * @param inputCode - The OTP code entered by the user
 * @returns ActionState with tenant and property info on success
 */
export async function verifyOtpAction(
  phoneNumber: string,
  inputCode: string
): Promise<
  ActionState<{
    tenantId: string
    propertyId: string
    propertyName?: string
    tenantName?: string
  }>
> {
  try {
    // Get current conversation state
    const stateResult = await getOrCreateConversationStateAction(phoneNumber)
    if (!stateResult.isSuccess || !stateResult.data) {
      return {
        isSuccess: false,
        message: "Session expired. Please start again."
      }
    }

    const state = stateResult.data
    const context = state.context as {
      tenantId?: string
      propertyId?: string
      propertyName?: string
      tenantName?: string
      otpCode?: string
      otpExpiresAt?: string
    } | null

    if (!context?.otpCode || !context?.otpExpiresAt) {
      return {
        isSuccess: false,
        message: "No verification in progress. Please start again."
      }
    }

    // Verify OTP
    const verification = verifyOtp(inputCode, context.otpCode, context.otpExpiresAt)
    if (!verification.valid) {
      return {
        isSuccess: false,
        message: verification.reason || "Invalid verification code"
      }
    }

    // Link phone to tenant for future auto-identification
    if (context.tenantId) {
      await updateTenantPhoneAction(context.tenantId, phoneNumber)
    }

    // Update state - verified and ready for incident
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_description",
      context: {
        tenantId: context.tenantId,
        propertyId: context.propertyId,
        propertyName: context.propertyName,
        tenantName: context.tenantName
      }
    })

    return {
      isSuccess: true,
      message: "Phone verified successfully",
      data: {
        tenantId: context.tenantId!,
        propertyId: context.propertyId!,
        propertyName: context.propertyName,
        tenantName: context.tenantName
      }
    }
  } catch (error) {
    console.error("Error verifying OTP:", error)
    return {
      isSuccess: false,
      message: "Failed to verify code"
    }
  }
}
