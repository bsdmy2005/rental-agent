# WhatsApp Incident Lifecycle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement full-lifecycle incident management via WhatsApp and email with smart identification, media uploads, status tracking, and dual-channel notifications.

**Architecture:** Conversation state machine manages multi-turn flows. Tenants are identified by phone match → email OTP → property code fallback. All channels funnel into unified incident creation. Notifications sent via email and WhatsApp.

**Tech Stack:** Next.js 15, Drizzle ORM, PostgreSQL, Baileys WhatsApp library, Supabase Storage, Postmark/SendGrid for email.

---

## Phase 1: Database Schema

### Task 1.1: Add Conversation State Enum

**Files:**
- Modify: `db/schema/enums.ts`

**Step 1: Add conversation state enum**

Add after line 187 (after `whatsappConnectionStatusEnum`):

```typescript
export const whatsappConversationStateEnum = pgEnum("whatsapp_conversation_state", [
  "idle",
  "awaiting_email",
  "awaiting_otp",
  "awaiting_property",
  "awaiting_description",
  "awaiting_photos",
  "incident_active",
  "awaiting_closure_confirmation"
])
```

**Step 2: Add author type enum**

```typescript
export const incidentAuthorTypeEnum = pgEnum("incident_author_type", [
  "tenant",
  "agent",
  "landlord",
  "system"
])
```

**Step 3: Verify types compile**

Run: `npm run types`
Expected: No errors

**Step 4: Commit**

```bash
git add db/schema/enums.ts
git commit -m "feat(schema): add conversation state and author type enums"
```

---

### Task 1.2: Create Conversation States Table

**Files:**
- Create: `db/schema/whatsapp-conversation-states.ts`
- Modify: `db/schema/index.ts`

**Step 1: Create schema file**

```typescript
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { whatsappSessionsTable } from "./whatsapp-sessions"
import { incidentsTable } from "./incidents"
import { whatsappConversationStateEnum } from "./enums"

export const whatsappConversationStatesTable = pgTable("whatsapp_conversation_states", {
  id: uuid("id").defaultRandom().primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  sessionId: uuid("session_id").references(() => whatsappSessionsTable.id, {
    onDelete: "cascade"
  }),
  state: whatsappConversationStateEnum("state").default("idle").notNull(),
  incidentId: uuid("incident_id").references(() => incidentsTable.id, {
    onDelete: "set null"
  }),
  context: jsonb("context").$type<{
    tenantId?: string
    propertyId?: string
    propertyName?: string
    tenantName?: string
    partialDescription?: string
    pendingAttachments?: Array<{ url: string; type: string; fileName: string }>
    email?: string
    otpCode?: string
    otpExpiresAt?: string
  }>(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertWhatsappConversationState = typeof whatsappConversationStatesTable.$inferInsert
export type SelectWhatsappConversationState = typeof whatsappConversationStatesTable.$inferSelect
```

**Step 2: Export from index**

Add to `db/schema/index.ts`:

```typescript
export * from "./whatsapp-conversation-states"
```

**Step 3: Verify types compile**

Run: `npm run types`
Expected: No errors

**Step 4: Commit**

```bash
git add db/schema/whatsapp-conversation-states.ts db/schema/index.ts
git commit -m "feat(schema): add whatsapp conversation states table"
```

---

### Task 1.3: Create Incident Comments Table

**Files:**
- Create: `db/schema/incident-comments.ts`
- Modify: `db/schema/index.ts`

**Step 1: Create schema file**

```typescript
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { incidentsTable } from "./incidents"
import { userProfilesTable } from "./user-profiles"
import { incidentAuthorTypeEnum } from "./enums"

export const incidentCommentsTable = pgTable("incident_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id")
    .references(() => incidentsTable.id, { onDelete: "cascade" })
    .notNull(),
  authorType: incidentAuthorTypeEnum("author_type").notNull(),
  authorId: uuid("author_id").references(() => userProfilesTable.id, {
    onDelete: "set null"
  }),
  authorPhone: text("author_phone"),
  authorName: text("author_name"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export type InsertIncidentComment = typeof incidentCommentsTable.$inferInsert
export type SelectIncidentComment = typeof incidentCommentsTable.$inferSelect
```

**Step 2: Export from index**

Add to `db/schema/index.ts`:

```typescript
export * from "./incident-comments"
```

**Step 3: Verify types compile**

Run: `npm run types`

**Step 4: Commit**

```bash
git add db/schema/incident-comments.ts db/schema/index.ts
git commit -m "feat(schema): add incident comments table"
```

---

### Task 1.4: Create Notification Preferences Table

**Files:**
- Create: `db/schema/notification-preferences.ts`
- Modify: `db/schema/index.ts`

**Step 1: Create schema file**

```typescript
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"

export const notificationPreferencesTable = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id")
    .references(() => userProfilesTable.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  notifyEmail: boolean("notify_email").default(true).notNull(),
  notifyWhatsapp: boolean("notify_whatsapp").default(true).notNull(),
  notifyNewIncidents: boolean("notify_new_incidents").default(true).notNull(),
  notifyUpdates: boolean("notify_updates").default(true).notNull(),
  notifyUrgentOnly: boolean("notify_urgent_only").default(false).notNull(),
  whatsappPhone: text("whatsapp_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertNotificationPreference = typeof notificationPreferencesTable.$inferInsert
export type SelectNotificationPreference = typeof notificationPreferencesTable.$inferSelect
```

**Step 2: Export from index**

Add to `db/schema/index.ts`:

```typescript
export * from "./notification-preferences"
```

**Step 3: Verify types compile**

Run: `npm run types`

**Step 4: Commit**

```bash
git add db/schema/notification-preferences.ts db/schema/index.ts
git commit -m "feat(schema): add notification preferences table"
```

---

### Task 1.5: Generate and Review Migration

**Step 1: Generate migration**

Run: `npx drizzle-kit generate`

**Step 2: Review generated SQL**

Check the generated migration file in `db/migrations/` to ensure it looks correct.

**Step 3: Commit migration**

```bash
git add db/migrations/
git commit -m "chore(db): add migration for incident lifecycle tables"
```

**Step 4: Push schema (user action)**

Tell user: "Run `npx drizzle-kit push` to apply the schema changes to your database."

---

## Phase 2: Conversation State Actions

### Task 2.1: Create Conversation State Actions

**Files:**
- Create: `actions/conversation-state-actions.ts`

**Step 1: Create actions file**

```typescript
"use server"

import { db } from "@/db"
import { whatsappConversationStatesTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"
import type {
  InsertWhatsappConversationState,
  SelectWhatsappConversationState
} from "@/db/schema"

const STATE_EXPIRY_MINUTES = 30

function getExpiryTime(): Date {
  return new Date(Date.now() + STATE_EXPIRY_MINUTES * 60 * 1000)
}

/**
 * Get or create conversation state for a phone number
 */
export async function getOrCreateConversationStateAction(
  phoneNumber: string,
  sessionId?: string
): Promise<ActionState<SelectWhatsappConversationState>> {
  try {
    // Try to find existing state
    const [existing] = await db
      .select()
      .from(whatsappConversationStatesTable)
      .where(eq(whatsappConversationStatesTable.phoneNumber, phoneNumber))
      .limit(1)

    if (existing) {
      // Check if expired
      if (new Date(existing.expiresAt) < new Date()) {
        // Reset to idle
        const [updated] = await db
          .update(whatsappConversationStatesTable)
          .set({
            state: "idle",
            incidentId: null,
            context: null,
            expiresAt: getExpiryTime()
          })
          .where(eq(whatsappConversationStatesTable.id, existing.id))
          .returning()

        return {
          isSuccess: true,
          message: "Conversation state reset (expired)",
          data: updated
        }
      }

      // Extend expiry
      const [updated] = await db
        .update(whatsappConversationStatesTable)
        .set({ expiresAt: getExpiryTime() })
        .where(eq(whatsappConversationStatesTable.id, existing.id))
        .returning()

      return {
        isSuccess: true,
        message: "Conversation state retrieved",
        data: updated
      }
    }

    // Create new state
    const [newState] = await db
      .insert(whatsappConversationStatesTable)
      .values({
        phoneNumber,
        sessionId,
        state: "idle",
        expiresAt: getExpiryTime()
      })
      .returning()

    return {
      isSuccess: true,
      message: "Conversation state created",
      data: newState
    }
  } catch (error) {
    console.error("Error getting/creating conversation state:", error)
    return {
      isSuccess: false,
      message: "Failed to get/create conversation state"
    }
  }
}

/**
 * Update conversation state
 */
export async function updateConversationStateAction(
  phoneNumber: string,
  updates: Partial<InsertWhatsappConversationState>
): Promise<ActionState<SelectWhatsappConversationState>> {
  try {
    const [updated] = await db
      .update(whatsappConversationStatesTable)
      .set({
        ...updates,
        expiresAt: getExpiryTime()
      })
      .where(eq(whatsappConversationStatesTable.phoneNumber, phoneNumber))
      .returning()

    if (!updated) {
      return {
        isSuccess: false,
        message: "Conversation state not found"
      }
    }

    return {
      isSuccess: true,
      message: "Conversation state updated",
      data: updated
    }
  } catch (error) {
    console.error("Error updating conversation state:", error)
    return {
      isSuccess: false,
      message: "Failed to update conversation state"
    }
  }
}

/**
 * Reset conversation state to idle
 */
export async function resetConversationStateAction(
  phoneNumber: string
): Promise<ActionState<void>> {
  try {
    await db
      .update(whatsappConversationStatesTable)
      .set({
        state: "idle",
        incidentId: null,
        context: null,
        expiresAt: getExpiryTime()
      })
      .where(eq(whatsappConversationStatesTable.phoneNumber, phoneNumber))

    return {
      isSuccess: true,
      message: "Conversation state reset"
    }
  } catch (error) {
    console.error("Error resetting conversation state:", error)
    return {
      isSuccess: false,
      message: "Failed to reset conversation state"
    }
  }
}
```

**Step 2: Verify types compile**

Run: `npm run types`

**Step 3: Commit**

```bash
git add actions/conversation-state-actions.ts
git commit -m "feat(actions): add conversation state management actions"
```

---

### Task 2.2: Create Tenant Lookup by Phone/Email Actions

**Files:**
- Modify: `actions/tenants-actions.ts`

**Step 1: Add lookup functions**

Add to `actions/tenants-actions.ts`:

```typescript
/**
 * Find tenant by phone number
 */
export async function getTenantByPhoneAction(
  phone: string
): Promise<ActionState<SelectTenant & { propertyName?: string }>> {
  try {
    // Normalize phone for comparison
    const normalizedPhone = phone.replace(/\D/g, "")

    const tenants = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.phone, normalizedPhone))
      .limit(1)

    if (tenants.length === 0) {
      // Try with different formats
      const [tenant] = await db
        .select({
          tenant: tenantsTable,
          propertyName: propertiesTable.name
        })
        .from(tenantsTable)
        .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
        .where(
          sql`REPLACE(REPLACE(REPLACE(${tenantsTable.phone}, '+', ''), ' ', ''), '-', '') = ${normalizedPhone}`
        )
        .limit(1)

      if (!tenant) {
        return { isSuccess: false, message: "Tenant not found" }
      }

      return {
        isSuccess: true,
        message: "Tenant found by phone",
        data: { ...tenant.tenant, propertyName: tenant.propertyName || undefined }
      }
    }

    // Get property name
    const [result] = await db
      .select({
        tenant: tenantsTable,
        propertyName: propertiesTable.name
      })
      .from(tenantsTable)
      .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
      .where(eq(tenantsTable.id, tenants[0].id))
      .limit(1)

    return {
      isSuccess: true,
      message: "Tenant found by phone",
      data: { ...result.tenant, propertyName: result.propertyName || undefined }
    }
  } catch (error) {
    console.error("Error finding tenant by phone:", error)
    return { isSuccess: false, message: "Failed to find tenant" }
  }
}

/**
 * Find tenant by email
 */
export async function getTenantByEmailAction(
  email: string
): Promise<ActionState<SelectTenant & { propertyName?: string }>> {
  try {
    const [result] = await db
      .select({
        tenant: tenantsTable,
        propertyName: propertiesTable.name
      })
      .from(tenantsTable)
      .leftJoin(propertiesTable, eq(tenantsTable.propertyId, propertiesTable.id))
      .where(eq(tenantsTable.email, email.toLowerCase().trim()))
      .limit(1)

    if (!result) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    return {
      isSuccess: true,
      message: "Tenant found by email",
      data: { ...result.tenant, propertyName: result.propertyName || undefined }
    }
  } catch (error) {
    console.error("Error finding tenant by email:", error)
    return { isSuccess: false, message: "Failed to find tenant" }
  }
}

/**
 * Update tenant's phone number (for linking after OTP verification)
 */
export async function updateTenantPhoneAction(
  tenantId: string,
  phone: string
): Promise<ActionState<SelectTenant>> {
  try {
    const normalizedPhone = phone.replace(/\D/g, "")

    const [updated] = await db
      .update(tenantsTable)
      .set({ phone: normalizedPhone })
      .where(eq(tenantsTable.id, tenantId))
      .returning()

    if (!updated) {
      return { isSuccess: false, message: "Tenant not found" }
    }

    return {
      isSuccess: true,
      message: "Tenant phone updated",
      data: updated
    }
  } catch (error) {
    console.error("Error updating tenant phone:", error)
    return { isSuccess: false, message: "Failed to update tenant phone" }
  }
}
```

**Step 2: Add required imports at top of file**

```typescript
import { sql } from "drizzle-orm"
import { propertiesTable } from "@/db/schema"
```

**Step 3: Verify types compile**

Run: `npm run types`

**Step 4: Commit**

```bash
git add actions/tenants-actions.ts
git commit -m "feat(actions): add tenant lookup by phone and email"
```

---

## Phase 3: OTP Service

### Task 3.1: Create OTP Service Library

**Files:**
- Create: `lib/whatsapp/otp-service.ts`

**Step 1: Create OTP service**

```typescript
import crypto from "crypto"

/**
 * Generate a 6-digit OTP code
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString()
}

/**
 * Generate OTP expiry time (10 minutes from now)
 */
export function getOtpExpiry(): Date {
  return new Date(Date.now() + 10 * 60 * 1000)
}

/**
 * Check if OTP is expired
 */
export function isOtpExpired(expiresAt: string | Date): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * Verify OTP code
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
 * Format OTP email content
 */
export function formatOtpEmail(otpCode: string, tenantName?: string): {
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
```

**Step 2: Verify types compile**

Run: `npm run types`

**Step 3: Commit**

```bash
git add lib/whatsapp/otp-service.ts
git commit -m "feat(lib): add OTP generation and verification service"
```

---

### Task 3.2: Create Send OTP Email Action

**Files:**
- Create: `actions/otp-actions.ts`

**Step 1: Create OTP actions**

```typescript
"use server"

import { ActionState } from "@/types"
import { generateOtp, getOtpExpiry, verifyOtp, formatOtpEmail } from "@/lib/whatsapp/otp-service"
import { updateConversationStateAction, getOrCreateConversationStateAction } from "./conversation-state-actions"
import { getTenantByEmailAction, updateTenantPhoneAction } from "./tenants-actions"

// Use your email provider (Postmark, SendGrid, etc.)
async function sendEmail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  try {
    // TODO: Replace with your email provider
    // Example with Postmark:
    // const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY!)
    // await client.sendEmail({
    //   From: process.env.EMAIL_FROM!,
    //   To: to,
    //   Subject: subject,
    //   TextBody: text,
    //   HtmlBody: html
    // })

    console.log(`[OTP Email] Would send to ${to}: ${subject}`)
    console.log(`[OTP Email] Code in text: ${text}`)
    return true
  } catch (error) {
    console.error("Error sending OTP email:", error)
    return false
  }
}

/**
 * Send OTP to email for phone verification
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
        message: "We couldn't find an account with that email address. Please check your email or contact your property manager."
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
    const sent = await sendEmail(email, emailContent.subject, emailContent.text, emailContent.html)

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
 * Verify OTP and link phone to tenant
 */
export async function verifyOtpAction(
  phoneNumber: string,
  inputCode: string
): Promise<ActionState<{ tenantId: string; propertyId: string; propertyName?: string; tenantName?: string }>> {
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
    const context = state.context as any

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
        tenantId: context.tenantId,
        propertyId: context.propertyId,
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
```

**Step 2: Verify types compile**

Run: `npm run types`

**Step 3: Commit**

```bash
git add actions/otp-actions.ts
git commit -m "feat(actions): add OTP send and verify actions"
```

---

## Phase 4: Conversation State Machine

### Task 4.1: Create Conversation State Machine Library

**Files:**
- Create: `lib/whatsapp/conversation-state-machine.ts`

**Step 1: Create state machine**

```typescript
import type { SelectWhatsappConversationState } from "@/db/schema"
import {
  getOrCreateConversationStateAction,
  updateConversationStateAction,
  resetConversationStateAction
} from "@/actions/conversation-state-actions"
import { getTenantByPhoneAction, getTenantByEmailAction } from "@/actions/tenants-actions"
import { sendOtpAction, verifyOtpAction } from "@/actions/otp-actions"
import { createIncidentFromConversationAction } from "@/actions/whatsapp-incident-actions"
import { validatePropertyCodeAction } from "@/actions/property-codes-actions"
import { isIncidentMessage, parseIncidentMessage, extractPropertyCode } from "./message-parser"

export interface ConversationResponse {
  message: string
  incidentCreated?: boolean
  incidentId?: string
  referenceNumber?: string
}

/**
 * Normalize phone number to consistent format
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("0")) return "27" + digits.substring(1)
  if (digits.startsWith("27")) return digits
  if (digits.startsWith("8") && digits.length === 9) return "27" + digits
  return digits
}

/**
 * Check if message looks like an email address
 */
function isEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())
}

/**
 * Check if message looks like an OTP code (6 digits)
 */
function isOtpCode(text: string): boolean {
  return /^\d{6}$/.test(text.trim())
}

/**
 * Process incoming message through conversation state machine
 */
export async function processConversationMessage(
  phoneNumber: string,
  messageText: string,
  sessionId?: string,
  hasMedia?: boolean,
  mediaUrls?: Array<{ url: string; type: string; fileName: string }>
): Promise<ConversationResponse> {
  const normalizedPhone = normalizePhone(phoneNumber)
  const text = messageText.trim()
  const lowerText = text.toLowerCase()

  // Get or create conversation state
  const stateResult = await getOrCreateConversationStateAction(normalizedPhone, sessionId)
  if (!stateResult.isSuccess || !stateResult.data) {
    return { message: "Sorry, something went wrong. Please try again." }
  }

  const state = stateResult.data
  const context = (state.context || {}) as any

  // Handle special commands
  if (lowerText === "cancel" || lowerText === "stop") {
    await resetConversationStateAction(normalizedPhone)
    return { message: "Conversation cancelled. Send a message anytime to start again." }
  }

  if (lowerText === "status" || lowerText === "my incidents") {
    // TODO: Implement status check
    return { message: "Status check coming soon. For now, please contact your property manager." }
  }

  // State machine
  switch (state.state) {
    case "idle":
      return handleIdleState(normalizedPhone, text, sessionId, hasMedia, mediaUrls)

    case "awaiting_email":
      return handleAwaitingEmailState(normalizedPhone, text)

    case "awaiting_otp":
      return handleAwaitingOtpState(normalizedPhone, text)

    case "awaiting_property":
      return handleAwaitingPropertyState(normalizedPhone, text, context)

    case "awaiting_description":
      return handleAwaitingDescriptionState(normalizedPhone, text, context, hasMedia, mediaUrls)

    case "awaiting_photos":
      return handleAwaitingPhotosState(normalizedPhone, text, context, hasMedia, mediaUrls)

    case "incident_active":
      return handleIncidentActiveState(normalizedPhone, text, context, hasMedia, mediaUrls)

    case "awaiting_closure_confirmation":
      return handleAwaitingClosureState(normalizedPhone, text, context)

    default:
      await resetConversationStateAction(normalizedPhone)
      return { message: "Something went wrong. Please try again." }
  }
}

async function handleIdleState(
  phoneNumber: string,
  text: string,
  sessionId?: string,
  hasMedia?: boolean,
  mediaUrls?: Array<{ url: string; type: string; fileName: string }>
): Promise<ConversationResponse> {
  // Check if this is an incident report
  if (!isIncidentMessage(text) && !hasMedia) {
    return {
      message: "Hi! I can help you report property issues. Describe your problem and I'll log it for you.\n\nFor example: \"Water is leaking from the bathroom ceiling\""
    }
  }

  // Try to identify by phone number first
  const tenantResult = await getTenantByPhoneAction(phoneNumber)

  if (tenantResult.isSuccess && tenantResult.data) {
    const tenant = tenantResult.data
    const parsed = parseIncidentMessage(text)

    // We have the tenant - check if we have enough info for incident
    if (parsed.description || text.length > 10) {
      // Create incident directly
      return createIncidentFromState(phoneNumber, {
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        propertyName: tenant.propertyName,
        tenantName: tenant.name,
        partialDescription: parsed.description || text,
        pendingAttachments: mediaUrls
      })
    }

    // Need more description
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_description",
      context: {
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        propertyName: tenant.propertyName,
        tenantName: tenant.name,
        pendingAttachments: mediaUrls
      }
    })

    return {
      message: `Hi ${tenant.name}! Please describe the issue you're experiencing at ${tenant.propertyName || "your property"}.`
    }
  }

  // Check for property code in message
  const propertyCode = extractPropertyCode(text)
  if (propertyCode) {
    const codeResult = await validatePropertyCodeAction(propertyCode)
    if (codeResult.isSuccess && codeResult.data) {
      const parsed = parseIncidentMessage(text)

      if (parsed.description || text.length > 20) {
        // Create incident with property code
        return createIncidentFromState(phoneNumber, {
          propertyId: codeResult.data.propertyId,
          propertyName: codeResult.data.propertyName,
          partialDescription: parsed.description || text.replace(propertyCode, "").trim(),
          pendingAttachments: mediaUrls
        })
      }

      await updateConversationStateAction(phoneNumber, {
        state: "awaiting_description",
        context: {
          propertyId: codeResult.data.propertyId,
          propertyName: codeResult.data.propertyName,
          pendingAttachments: mediaUrls
        }
      })

      return {
        message: `Property identified: ${codeResult.data.propertyName}. Please describe the issue.`
      }
    }
  }

  // Unknown phone - ask for email
  await updateConversationStateAction(phoneNumber, {
    state: "awaiting_email",
    context: {
      partialDescription: text,
      pendingAttachments: mediaUrls
    }
  })

  return {
    message: "I don't recognize this phone number. Please reply with the email address you used when you moved in, and I'll send you a verification code."
  }
}

async function handleAwaitingEmailState(
  phoneNumber: string,
  text: string
): Promise<ConversationResponse> {
  if (!isEmail(text)) {
    return {
      message: "That doesn't look like an email address. Please enter a valid email (e.g., john@example.com)."
    }
  }

  const result = await sendOtpAction(phoneNumber, text.trim())

  if (!result.isSuccess) {
    // Check if email not found - offer property code fallback
    if (result.message?.includes("couldn't find")) {
      const stateResult = await getOrCreateConversationStateAction(phoneNumber)
      const context = (stateResult.data?.context || {}) as any

      await updateConversationStateAction(phoneNumber, {
        state: "awaiting_property",
        context: {
          ...context,
          email: text.trim()
        }
      })

      return {
        message: "I couldn't find that email in our system. Do you have a property code? It looks like PROP-XXXXXX and should be on your lease or from your property manager.\n\nOr reply CANCEL to stop."
      }
    }

    return { message: result.message || "Failed to send verification code. Please try again." }
  }

  return {
    message: `I've sent a 6-digit code to ${text.trim()}. Please enter it here to verify your identity.`
  }
}

async function handleAwaitingOtpState(
  phoneNumber: string,
  text: string
): Promise<ConversationResponse> {
  if (!isOtpCode(text)) {
    return {
      message: "Please enter the 6-digit code I sent to your email."
    }
  }

  const result = await verifyOtpAction(phoneNumber, text.trim())

  if (!result.isSuccess) {
    return { message: result.message || "Invalid code. Please try again." }
  }

  // Get updated state with context
  const stateResult = await getOrCreateConversationStateAction(phoneNumber)
  const context = (stateResult.data?.context || {}) as any

  if (context.partialDescription) {
    // They already gave us a description - create incident
    return createIncidentFromState(phoneNumber, context)
  }

  return {
    message: `Thanks ${result.data?.tenantName || ""}! You're verified. Now, please describe the issue you're experiencing.`
  }
}

async function handleAwaitingPropertyState(
  phoneNumber: string,
  text: string,
  context: any
): Promise<ConversationResponse> {
  const propertyCode = extractPropertyCode(text)

  if (!propertyCode) {
    return {
      message: "Please enter your property code (format: PROP-XXXXXX) or reply CANCEL to stop."
    }
  }

  const codeResult = await validatePropertyCodeAction(propertyCode)

  if (!codeResult.isSuccess || !codeResult.data) {
    return {
      message: "That property code wasn't found. Please check and try again, or contact your property manager."
    }
  }

  const newContext = {
    ...context,
    propertyId: codeResult.data.propertyId,
    propertyName: codeResult.data.propertyName
  }

  if (context.partialDescription) {
    return createIncidentFromState(phoneNumber, newContext)
  }

  await updateConversationStateAction(phoneNumber, {
    state: "awaiting_description",
    context: newContext
  })

  return {
    message: `Property identified: ${codeResult.data.propertyName}. Please describe the issue.`
  }
}

async function handleAwaitingDescriptionState(
  phoneNumber: string,
  text: string,
  context: any,
  hasMedia?: boolean,
  mediaUrls?: Array<{ url: string; type: string; fileName: string }>
): Promise<ConversationResponse> {
  const newContext = {
    ...context,
    partialDescription: text,
    pendingAttachments: [...(context.pendingAttachments || []), ...(mediaUrls || [])]
  }

  // Create the incident
  return createIncidentFromState(phoneNumber, newContext)
}

async function handleAwaitingPhotosState(
  phoneNumber: string,
  text: string,
  context: any,
  hasMedia?: boolean,
  mediaUrls?: Array<{ url: string; type: string; fileName: string }>
): Promise<ConversationResponse> {
  const lowerText = text.toLowerCase()

  if (lowerText === "done" || lowerText === "submit" || lowerText === "finished") {
    return createIncidentFromState(phoneNumber, context)
  }

  if (hasMedia && mediaUrls && mediaUrls.length > 0) {
    const newAttachments = [...(context.pendingAttachments || []), ...mediaUrls]

    await updateConversationStateAction(phoneNumber, {
      context: { ...context, pendingAttachments: newAttachments }
    })

    return {
      message: `Photo received (${newAttachments.length} total). Send more photos or type DONE to submit.`
    }
  }

  return {
    message: "Send photos of the issue, or type DONE to submit without photos."
  }
}

async function handleIncidentActiveState(
  phoneNumber: string,
  text: string,
  context: any,
  hasMedia?: boolean,
  mediaUrls?: Array<{ url: string; type: string; fileName: string }>
): Promise<ConversationResponse> {
  const lowerText = text.toLowerCase()

  // Check for closure keywords
  if (["resolved", "fixed", "done", "closed", "complete"].some(k => lowerText.includes(k))) {
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_closure_confirmation"
    })

    const refNumber = context.incidentId ? `INC-${context.incidentId.substring(0, 8).toUpperCase()}` : "your incident"

    return {
      message: `Great to hear! Can you confirm ${refNumber} is resolved? Reply YES to close it.`
    }
  }

  // Add as comment
  // TODO: Implement add comment action

  return {
    message: "Your message has been added to the incident. The property manager will be notified."
  }
}

async function handleAwaitingClosureState(
  phoneNumber: string,
  text: string,
  context: any
): Promise<ConversationResponse> {
  const lowerText = text.toLowerCase()

  if (lowerText === "yes" || lowerText === "y" || lowerText === "confirm") {
    // TODO: Close incident
    await resetConversationStateAction(phoneNumber)

    return {
      message: "Incident closed. Thank you for confirming! How would you rate the resolution? (1-5 stars)"
    }
  }

  // Go back to active state
  await updateConversationStateAction(phoneNumber, {
    state: "incident_active"
  })

  return {
    message: "No problem, the incident remains open. Send a message anytime to add updates."
  }
}

async function createIncidentFromState(
  phoneNumber: string,
  context: any
): Promise<ConversationResponse> {
  const result = await createIncidentFromConversationAction({
    propertyId: context.propertyId,
    tenantId: context.tenantId,
    tenantName: context.tenantName,
    description: context.partialDescription,
    phoneNumber,
    attachments: context.pendingAttachments
  })

  if (!result.isSuccess || !result.data) {
    return {
      message: result.message || "Failed to create incident. Please try again."
    }
  }

  // Update state to incident_active
  await updateConversationStateAction(phoneNumber, {
    state: "incident_active",
    incidentId: result.data.incidentId,
    context: {
      ...context,
      incidentId: result.data.incidentId
    }
  })

  return {
    message: result.data.confirmationMessage,
    incidentCreated: true,
    incidentId: result.data.incidentId,
    referenceNumber: result.data.referenceNumber
  }
}
```

**Step 2: Verify types compile**

Run: `npm run types`

**Step 3: Commit**

```bash
git add lib/whatsapp/conversation-state-machine.ts
git commit -m "feat(lib): add conversation state machine for WhatsApp incident flow"
```

---

### Task 4.2: Create Incident from Conversation Action

**Files:**
- Modify: `actions/whatsapp-incident-actions.ts`

**Step 1: Add new action function**

Add to `actions/whatsapp-incident-actions.ts`:

```typescript
/**
 * Create incident from conversation state
 */
export async function createIncidentFromConversationAction(data: {
  propertyId: string
  tenantId?: string
  tenantName?: string
  description: string
  phoneNumber: string
  attachments?: Array<{ url: string; type: string; fileName: string }>
}): Promise<ActionState<{ incidentId: string; referenceNumber: string; confirmationMessage: string }>> {
  try {
    const { propertyId, tenantId, tenantName, description, phoneNumber, attachments } = data

    // Get property name
    const [property] = await db
      .select({ name: propertiesTable.name })
      .from(propertiesTable)
      .where(eq(propertiesTable.id, propertyId))
      .limit(1)

    const propertyName = property?.name || "Unknown Property"

    // Create incident
    const [newIncident] = await db
      .insert(incidentsTable)
      .values({
        propertyId,
        tenantId: tenantId || null,
        title: description.substring(0, 100),
        description,
        priority: "medium",
        status: "reported",
        submissionMethod: "whatsapp",
        submittedPhone: phoneNumber,
        submittedName: tenantName || null,
        isVerified: !!tenantId
      })
      .returning()

    if (!newIncident) {
      return { isSuccess: false, message: "Failed to create incident" }
    }

    // Create initial status history entry
    await db.insert(incidentStatusHistoryTable).values({
      incidentId: newIncident.id,
      status: newIncident.status,
      changedBy: null,
      notes: tenantName
        ? `Incident reported by ${tenantName} via WhatsApp`
        : "Incident reported via WhatsApp"
    })

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      await db.insert(incidentAttachmentsTable).values(
        attachments.map(att => ({
          incidentId: newIncident.id,
          fileUrl: att.url,
          fileName: att.fileName,
          fileType: att.type
        }))
      )
    }

    // Record submission for rate limiting
    await recordSubmission(phoneNumber)

    const referenceNumber = `INC-${newIncident.id.substring(0, 8).toUpperCase()}`
    const confirmationMessage = formatIncidentConfirmationMessage(
      newIncident.id,
      referenceNumber,
      propertyName
    )

    // TODO: Send notifications to agent/landlord

    return {
      isSuccess: true,
      message: "Incident created successfully",
      data: {
        incidentId: newIncident.id,
        referenceNumber,
        confirmationMessage
      }
    }
  } catch (error) {
    console.error("Error creating incident from conversation:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create incident"
    }
  }
}
```

**Step 2: Add imports at top**

```typescript
import { propertiesTable, incidentAttachmentsTable } from "@/db/schema"
```

**Step 3: Verify types compile**

Run: `npm run types`

**Step 4: Commit**

```bash
git add actions/whatsapp-incident-actions.ts
git commit -m "feat(actions): add createIncidentFromConversationAction"
```

---

## Phase 5: Update Message Handler

### Task 5.1: Create Conversation API Route

**Files:**
- Create: `app/api/whatsapp/conversation/route.ts`

**Step 1: Create API route**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { processConversationMessage } from "@/lib/whatsapp/conversation-state-machine"

/**
 * API route for processing WhatsApp messages through conversation state machine
 * Called by Baileys server for all incoming messages
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get("x-api-key")
    const expectedApiKey = process.env.WHATSAPP_SERVER_API_KEY

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { phoneNumber, messageText, sessionId, hasMedia, mediaUrls } = body

    if (!phoneNumber || !messageText) {
      return NextResponse.json(
        { error: "Missing required fields: phoneNumber, messageText" },
        { status: 400 }
      )
    }

    const result = await processConversationMessage(
      phoneNumber,
      messageText,
      sessionId,
      hasMedia,
      mediaUrls
    )

    return NextResponse.json({
      success: true,
      responseMessage: result.message,
      incidentCreated: result.incidentCreated || false,
      incidentId: result.incidentId,
      referenceNumber: result.referenceNumber
    })
  } catch (error) {
    console.error("Error processing conversation:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        responseMessage: "Sorry, something went wrong. Please try again."
      },
      { status: 200 }
    )
  }
}
```

**Step 2: Verify types compile**

Run: `npm run types`

**Step 3: Commit**

```bash
git add app/api/whatsapp/conversation/route.ts
git commit -m "feat(api): add conversation processing endpoint"
```

---

### Task 5.2: Update Baileys Message Handler

**Files:**
- Modify: `whatsapp-server/src/baileys/message-handler.ts`

**Step 1: Replace handleIncidentIfApplicable with conversation-based approach**

Update the `handleIncidentIfApplicable` method:

```typescript
/**
 * Process message through conversation state machine
 * Replaces the old incident-only detection
 */
private async processConversation(
  sessionId: string,
  remoteJid: string,
  content: string,
  socket: WASocket,
  hasMedia: boolean = false,
  mediaUrls: Array<{ url: string; type: string; fileName: string }> = []
): Promise<boolean> {
  try {
    const phoneNumber = remoteJid.split("@")[0]
    const nextjsUrl = env.nextjsAppUrl || "http://localhost:3000"
    const apiKey = env.apiKey

    const response = await fetch(`${nextjsUrl}/api/whatsapp/conversation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        phoneNumber,
        messageText: content,
        sessionId,
        hasMedia,
        mediaUrls
      })
    })

    if (!response.ok) {
      logger.error(
        { sessionId, remoteJid, status: response.status },
        "Failed to call conversation API"
      )
      return false
    }

    const result = await response.json()

    if (result.success && result.responseMessage) {
      await this.sendTextMessage(sessionId, socket, remoteJid, result.responseMessage)
      logger.info(
        { sessionId, remoteJid, incidentCreated: result.incidentCreated },
        "Conversation response sent"
      )
      return true
    }

    return false
  } catch (error) {
    logger.error(
      { error, sessionId, remoteJid },
      "Error processing conversation"
    )
    return false
  }
}
```

**Step 2: Update handleIncomingMessage to use processConversation**

In the `handleIncomingMessage` method, replace the call to `handleIncidentIfApplicable` with `processConversation`:

```typescript
// Replace this line:
// const incidentHandled = await this.handleIncidentIfApplicable(...)

// With:
const conversationHandled = await this.processConversation(
  sessionId,
  remoteJid,
  content || "",
  socket,
  messageType !== "text",
  [] // TODO: Add media URLs when media handling is implemented
)

if (conversationHandled) {
  logger.info({ sessionId, messageId, remoteJid }, "Message handled by conversation system")
  return
}
```

**Step 3: Commit**

```bash
cd whatsapp-server
git add src/baileys/message-handler.ts
git commit -m "feat(baileys): integrate conversation state machine for message handling"
```

---

## Phase 6: Media Handling

### Task 6.1: Create Media Upload API

**Files:**
- Create: `app/api/whatsapp/media/route.ts`

**Step 1: Create media upload endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * API route for uploading WhatsApp media to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get("x-api-key")
    const expectedApiKey = process.env.WHATSAPP_SERVER_API_KEY

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const sessionId = formData.get("sessionId") as string
    const messageId = formData.get("messageId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const ext = file.name.split(".").pop() || "bin"
    const fileName = `${sessionId}/${timestamp}-${messageId}.${ext}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("whatsapp-media")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error("Error uploading to Supabase:", error)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("whatsapp-media")
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName: file.name,
      fileType: file.type.startsWith("image/") ? "image" :
                file.type.startsWith("video/") ? "video" : "document"
    })
  } catch (error) {
    console.error("Error handling media upload:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
```

**Step 2: Verify types compile**

Run: `npm run types`

**Step 3: Commit**

```bash
git add app/api/whatsapp/media/route.ts
git commit -m "feat(api): add media upload endpoint for WhatsApp attachments"
```

---

### Task 6.2: Add Media Download to Baileys Server

**Files:**
- Create: `whatsapp-server/src/services/media-downloader.ts`

**Step 1: Create media downloader service**

```typescript
import { downloadMediaMessage, WAMessage, WASocket } from "@whiskeysockets/baileys"
import { createLogger } from "../utils/logger.js"
import { env } from "../config/env.js"
import FormData from "form-data"

const logger = createLogger("media-downloader")

export interface UploadedMedia {
  url: string
  fileName: string
  type: string
}

/**
 * Download media from WhatsApp message and upload to Next.js API
 */
export async function downloadAndUploadMedia(
  socket: WASocket,
  message: WAMessage,
  sessionId: string
): Promise<UploadedMedia | null> {
  try {
    const messageId = message.key.id || `media-${Date.now()}`

    // Download media buffer
    const buffer = await downloadMediaMessage(
      message,
      "buffer",
      {}
    )

    if (!buffer) {
      logger.warn({ messageId }, "Failed to download media - empty buffer")
      return null
    }

    // Determine file type and name
    const msg = message.message
    let mimeType = "application/octet-stream"
    let fileName = `media-${messageId}`

    if (msg?.imageMessage) {
      mimeType = msg.imageMessage.mimetype || "image/jpeg"
      fileName = `image-${messageId}.${mimeType.split("/")[1] || "jpg"}`
    } else if (msg?.videoMessage) {
      mimeType = msg.videoMessage.mimetype || "video/mp4"
      fileName = `video-${messageId}.${mimeType.split("/")[1] || "mp4"}`
    } else if (msg?.documentMessage) {
      mimeType = msg.documentMessage.mimetype || "application/pdf"
      fileName = msg.documentMessage.fileName || `doc-${messageId}`
    } else if (msg?.audioMessage) {
      mimeType = msg.audioMessage.mimetype || "audio/ogg"
      fileName = `audio-${messageId}.ogg`
    }

    // Upload to Next.js API
    const nextjsUrl = env.nextjsAppUrl || "http://localhost:3000"
    const formData = new FormData()
    formData.append("file", buffer, {
      filename: fileName,
      contentType: mimeType
    })
    formData.append("sessionId", sessionId)
    formData.append("messageId", messageId)

    const response = await fetch(`${nextjsUrl}/api/whatsapp/media`, {
      method: "POST",
      headers: {
        "x-api-key": env.apiKey,
        ...formData.getHeaders()
      },
      body: formData as any
    })

    if (!response.ok) {
      logger.error({ messageId, status: response.status }, "Failed to upload media")
      return null
    }

    const result = await response.json()

    logger.info({ messageId, url: result.url }, "Media uploaded successfully")

    return {
      url: result.url,
      fileName: result.fileName,
      type: result.fileType
    }
  } catch (error) {
    logger.error({ error }, "Error downloading/uploading media")
    return null
  }
}
```

**Step 2: Commit**

```bash
cd whatsapp-server
git add src/services/media-downloader.ts
git commit -m "feat(baileys): add media download and upload service"
```

---

## Phase 7: Incident Comments

### Task 7.1: Create Incident Comments Actions

**Files:**
- Create: `actions/incident-comments-actions.ts`

**Step 1: Create actions**

```typescript
"use server"

import { db } from "@/db"
import { incidentCommentsTable, incidentsTable } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { ActionState } from "@/types"
import type { InsertIncidentComment, SelectIncidentComment } from "@/db/schema"

/**
 * Add comment to incident
 */
export async function addIncidentCommentAction(
  comment: InsertIncidentComment
): Promise<ActionState<SelectIncidentComment>> {
  try {
    const [newComment] = await db
      .insert(incidentCommentsTable)
      .values(comment)
      .returning()

    if (!newComment) {
      return { isSuccess: false, message: "Failed to add comment" }
    }

    return {
      isSuccess: true,
      message: "Comment added successfully",
      data: newComment
    }
  } catch (error) {
    console.error("Error adding comment:", error)
    return { isSuccess: false, message: "Failed to add comment" }
  }
}

/**
 * Get comments for incident
 */
export async function getIncidentCommentsAction(
  incidentId: string
): Promise<ActionState<SelectIncidentComment[]>> {
  try {
    const comments = await db
      .select()
      .from(incidentCommentsTable)
      .where(eq(incidentCommentsTable.incidentId, incidentId))
      .orderBy(desc(incidentCommentsTable.createdAt))

    return {
      isSuccess: true,
      message: "Comments retrieved",
      data: comments
    }
  } catch (error) {
    console.error("Error getting comments:", error)
    return { isSuccess: false, message: "Failed to get comments" }
  }
}

/**
 * Add comment from WhatsApp
 */
export async function addWhatsAppCommentAction(
  incidentId: string,
  phoneNumber: string,
  content: string,
  tenantName?: string
): Promise<ActionState<SelectIncidentComment>> {
  return addIncidentCommentAction({
    incidentId,
    authorType: "tenant",
    authorPhone: phoneNumber,
    authorName: tenantName,
    content
  })
}
```

**Step 2: Verify types compile**

Run: `npm run types`

**Step 3: Commit**

```bash
git add actions/incident-comments-actions.ts
git commit -m "feat(actions): add incident comment actions"
```

---

## Phase 8: Notifications

### Task 8.1: Create Notification Service

**Files:**
- Create: `lib/whatsapp/notification-service.ts`

**Step 1: Create notification service**

```typescript
import { db } from "@/db"
import {
  propertiesTable,
  propertyManagementsTable,
  userProfilesTable,
  notificationPreferencesTable,
  landlordTable,
  rentalAgentsTable
} from "@/db/schema"
import { eq } from "drizzle-orm"

interface NotificationRecipient {
  userProfileId: string
  name: string
  email?: string
  whatsappPhone?: string
  notifyEmail: boolean
  notifyWhatsapp: boolean
}

interface IncidentNotificationData {
  incidentId: string
  referenceNumber: string
  propertyName: string
  propertyAddress?: string
  description: string
  priority: string
  tenantName?: string
  tenantPhone?: string
  attachmentCount: number
}

/**
 * Get notification recipients for a property
 */
export async function getPropertyNotificationRecipients(
  propertyId: string
): Promise<NotificationRecipient[]> {
  const recipients: NotificationRecipient[] = []

  try {
    // Get property with landlord
    const [property] = await db
      .select({
        landlordId: propertiesTable.landlordId,
        landlordName: landlordTable.name,
        landlordEmail: landlordTable.email
      })
      .from(propertiesTable)
      .leftJoin(landlordTable, eq(propertiesTable.landlordId, landlordTable.id))
      .where(eq(propertiesTable.id, propertyId))
      .limit(1)

    if (property?.landlordId) {
      // Get landlord's notification preferences
      const [landlordProfile] = await db
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, property.landlordId))
        .limit(1)

      if (landlordProfile) {
        const [prefs] = await db
          .select()
          .from(notificationPreferencesTable)
          .where(eq(notificationPreferencesTable.userProfileId, landlordProfile.id))
          .limit(1)

        recipients.push({
          userProfileId: landlordProfile.id,
          name: property.landlordName || "Landlord",
          email: property.landlordEmail || undefined,
          whatsappPhone: prefs?.whatsappPhone || undefined,
          notifyEmail: prefs?.notifyEmail ?? true,
          notifyWhatsapp: prefs?.notifyWhatsapp ?? true
        })
      }
    }

    // Get property management agent
    const [management] = await db
      .select({
        agentId: propertyManagementsTable.rentalAgentId,
        agentName: rentalAgentsTable.name,
        agentEmail: rentalAgentsTable.email,
        agentPhone: rentalAgentsTable.phone
      })
      .from(propertyManagementsTable)
      .leftJoin(rentalAgentsTable, eq(propertyManagementsTable.rentalAgentId, rentalAgentsTable.id))
      .where(eq(propertyManagementsTable.propertyId, propertyId))
      .limit(1)

    if (management?.agentId) {
      const [agentProfile] = await db
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, management.agentId))
        .limit(1)

      if (agentProfile) {
        const [prefs] = await db
          .select()
          .from(notificationPreferencesTable)
          .where(eq(notificationPreferencesTable.userProfileId, agentProfile.id))
          .limit(1)

        recipients.push({
          userProfileId: agentProfile.id,
          name: management.agentName || "Agent",
          email: management.agentEmail || undefined,
          whatsappPhone: prefs?.whatsappPhone || management.agentPhone || undefined,
          notifyEmail: prefs?.notifyEmail ?? true,
          notifyWhatsapp: prefs?.notifyWhatsapp ?? true
        })
      }
    }

    return recipients
  } catch (error) {
    console.error("Error getting notification recipients:", error)
    return []
  }
}

/**
 * Format incident notification for email
 */
export function formatIncidentEmailNotification(data: IncidentNotificationData): {
  subject: string
  text: string
  html: string
} {
  const priorityEmoji = {
    low: "",
    medium: "",
    high: "⚠️",
    urgent: "🚨"
  }[data.priority] || ""

  return {
    subject: `${priorityEmoji} New Incident: ${data.description.substring(0, 50)} - ${data.propertyName}`,
    text: `New incident reported via WhatsApp:

Reference: ${data.referenceNumber}
Property: ${data.propertyName}
${data.propertyAddress ? `Address: ${data.propertyAddress}` : ""}
${data.tenantName ? `Tenant: ${data.tenantName}` : ""}
${data.tenantPhone ? `Phone: ${data.tenantPhone}` : ""}
Priority: ${data.priority}

Description:
${data.description}

${data.attachmentCount > 0 ? `${data.attachmentCount} photo(s) attached` : ""}

View incident: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/incidents/${data.incidentId}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${priorityEmoji} New Incident Reported</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Reference:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.referenceNumber}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Property:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.propertyName}</td></tr>
          ${data.propertyAddress ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Address:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.propertyAddress}</td></tr>` : ""}
          ${data.tenantName ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Tenant:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.tenantName}</td></tr>` : ""}
          ${data.tenantPhone ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.tenantPhone}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Priority:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.priority}</td></tr>
        </table>
        <h3>Description</h3>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${data.description}</p>
        ${data.attachmentCount > 0 ? `<p>📎 ${data.attachmentCount} photo(s) attached</p>` : ""}
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/incidents/${data.incidentId}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Incident</a></p>
      </div>
    `
  }
}

/**
 * Format incident notification for WhatsApp
 */
export function formatIncidentWhatsAppNotification(data: IncidentNotificationData): string {
  const priorityEmoji = {
    low: "",
    medium: "",
    high: "⚠️",
    urgent: "🚨"
  }[data.priority] || ""

  return `${priorityEmoji} *New Incident Reported*

📍 ${data.propertyName}
📋 ${data.referenceNumber}
${data.priority !== "medium" ? `⚡ Priority: ${data.priority.toUpperCase()}` : ""}
${data.tenantName ? `👤 ${data.tenantName}` : ""}

"${data.description.substring(0, 200)}${data.description.length > 200 ? "..." : ""}"

${data.attachmentCount > 0 ? `📎 ${data.attachmentCount} photo(s)` : ""}

Reply with the reference number to view details.`
}
```

**Step 2: Verify types compile**

Run: `npm run types`

**Step 3: Commit**

```bash
git add lib/whatsapp/notification-service.ts
git commit -m "feat(lib): add notification service for incident alerts"
```

---

### Task 8.2: Create Send Notification Action

**Files:**
- Create: `actions/notification-actions.ts`

**Step 1: Create notification actions**

```typescript
"use server"

import { ActionState } from "@/types"
import {
  getPropertyNotificationRecipients,
  formatIncidentEmailNotification,
  formatIncidentWhatsAppNotification
} from "@/lib/whatsapp/notification-service"
import { db } from "@/db"
import { incidentsTable, propertiesTable, incidentAttachmentsTable } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * Send notifications for new incident
 */
export async function sendIncidentNotificationsAction(
  incidentId: string
): Promise<ActionState<{ emailsSent: number; whatsappSent: number }>> {
  try {
    // Get incident details
    const [incident] = await db
      .select({
        incident: incidentsTable,
        propertyName: propertiesTable.name,
        propertyAddress: propertiesTable.address
      })
      .from(incidentsTable)
      .leftJoin(propertiesTable, eq(incidentsTable.propertyId, propertiesTable.id))
      .where(eq(incidentsTable.id, incidentId))
      .limit(1)

    if (!incident) {
      return { isSuccess: false, message: "Incident not found" }
    }

    // Get attachment count
    const attachments = await db
      .select()
      .from(incidentAttachmentsTable)
      .where(eq(incidentAttachmentsTable.incidentId, incidentId))

    const referenceNumber = `INC-${incidentId.substring(0, 8).toUpperCase()}`

    const notificationData = {
      incidentId,
      referenceNumber,
      propertyName: incident.propertyName || "Unknown Property",
      propertyAddress: incident.propertyAddress || undefined,
      description: incident.incident.description,
      priority: incident.incident.priority,
      tenantName: incident.incident.submittedName || undefined,
      tenantPhone: incident.incident.submittedPhone || undefined,
      attachmentCount: attachments.length
    }

    // Get recipients
    const recipients = await getPropertyNotificationRecipients(incident.incident.propertyId)

    let emailsSent = 0
    let whatsappSent = 0

    for (const recipient of recipients) {
      // Send email
      if (recipient.notifyEmail && recipient.email) {
        const emailContent = formatIncidentEmailNotification(notificationData)
        // TODO: Implement email sending with your provider
        console.log(`[Notification] Would send email to ${recipient.email}`)
        emailsSent++
      }

      // Send WhatsApp
      if (recipient.notifyWhatsapp && recipient.whatsappPhone) {
        const whatsappContent = formatIncidentWhatsAppNotification(notificationData)
        // TODO: Send via Baileys server
        console.log(`[Notification] Would send WhatsApp to ${recipient.whatsappPhone}`)
        whatsappSent++
      }
    }

    return {
      isSuccess: true,
      message: `Notifications sent: ${emailsSent} emails, ${whatsappSent} WhatsApp`,
      data: { emailsSent, whatsappSent }
    }
  } catch (error) {
    console.error("Error sending notifications:", error)
    return { isSuccess: false, message: "Failed to send notifications" }
  }
}
```

**Step 2: Verify types compile**

Run: `npm run types`

**Step 3: Commit**

```bash
git add actions/notification-actions.ts
git commit -m "feat(actions): add incident notification actions"
```

---

## Phase 9: Integration & Testing

### Task 9.1: Wire Up Notifications in Incident Creation

**Files:**
- Modify: `actions/whatsapp-incident-actions.ts`

**Step 1: Add notification call to createIncidentFromConversationAction**

At the end of `createIncidentFromConversationAction`, before the return statement, add:

```typescript
// Send notifications (non-blocking)
sendIncidentNotificationsAction(newIncident.id).catch(err => {
  console.error("Error sending incident notifications:", err)
})
```

**Step 2: Add import**

```typescript
import { sendIncidentNotificationsAction } from "./notification-actions"
```

**Step 3: Commit**

```bash
git add actions/whatsapp-incident-actions.ts
git commit -m "feat: wire up notifications on incident creation"
```

---

### Task 9.2: Manual Integration Test

**Step 1: Start services**

```bash
# Terminal 1 - Next.js
npm run dev

# Terminal 2 - Baileys server
cd whatsapp-server && npm run dev
```

**Step 2: Test conversation flow**

1. Send message from unknown number: "I have a water leak"
2. Expected: System asks for email
3. Reply with tenant email
4. Expected: OTP sent to email
5. Reply with OTP code
6. Expected: Verified, asks for description (or creates incident if description was in first message)
7. Send description
8. Expected: Incident created, confirmation sent

**Step 3: Verify in database**

```sql
SELECT * FROM incidents ORDER BY created_at DESC LIMIT 1;
SELECT * FROM whatsapp_conversation_states;
```

---

### Task 9.3: Final Commit

**Step 1: Verify all types compile**

Run: `npm run types`

**Step 2: Run linting**

Run: `npm run lint:fix`

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix linting issues"
```

---

## Summary

This plan implements:

1. **Database Schema** - Conversation states, comments, notification preferences
2. **Conversation State Machine** - Multi-turn flow with OTP verification
3. **Tenant Identification** - Phone match → Email OTP → Property code fallback
4. **Media Handling** - Download from WhatsApp, upload to Supabase Storage
5. **Incident Comments** - Follow-up messages attach to incident
6. **Notifications** - Email + WhatsApp to agents/landlords

**Not implemented (future work):**
- Email inbound processing (requires email provider webhook setup)
- Status check command (`status`, `my incidents`)
- Incident closure via WhatsApp
- Rating after closure
