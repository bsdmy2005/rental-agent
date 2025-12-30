# WhatsApp Message-Incident Linking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace time-based message grouping with explicit user-confirmed message-to-incident linking

**Architecture:** Add `incidentId` to messages table, update conversation state machine to always ask which incident, remove time-window inference logic

**Tech Stack:** Drizzle ORM, PostgreSQL, Next.js Server Actions, TypeScript

---

## Phase 1: Schema Changes

### Task 1.1: Add new fields to whatsappExplorerMessagesTable

**Files:**
- Modify: `db/schema/whatsapp-sessions.ts:36-57`

**Step 1: Add imports for incidents table**

Add import at top of file:

```typescript
import { incidentsTable } from "./incidents"
```

**Step 2: Add new fields to the table**

Update `whatsappExplorerMessagesTable` to add after `createdAt`:

```typescript
export const whatsappExplorerMessagesTable = pgTable("whatsapp_explorer_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => whatsappSessionsTable.id, { onDelete: "cascade" })
    .notNull(),

  // Message details
  messageId: text("message_id").notNull(),
  remoteJid: text("remote_jid").notNull(),
  fromMe: boolean("from_me").notNull(),
  messageType: text("message_type").notNull(),
  content: text("content"),
  mediaUrl: text("media_url"),

  // Status tracking
  status: text("status"),
  statusUpdatedAt: timestamp("status_updated_at"),

  // Timestamps
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),

  // NEW: Explicit incident linking
  incidentId: uuid("incident_id").references(() => incidentsTable.id, {
    onDelete: "set null"
  }),

  // NEW: Message classification for audit/display
  messageClassification: text("message_classification"),
  // Values: "incident_report", "follow_up", "closure_confirmation", "general", null

  // NEW: When classification was set
  classifiedAt: timestamp("classified_at")
})
```

**Step 3: Verify types export correctly**

Run: `npm run types`
Expected: No new errors related to whatsapp-sessions.ts

**Step 4: Commit**

```bash
git add db/schema/whatsapp-sessions.ts
git commit -m "feat(schema): add incidentId and classification fields to messages table"
```

---

### Task 1.2: Generate and apply database migration

**Files:**
- Create: `db/migrations/XXXX_add_message_incident_linking.sql` (auto-generated)

**Step 1: Generate migration**

Run: `npx drizzle-kit generate`
Expected: New migration file created

**Step 2: Review migration file**

The generated migration should include:
```sql
ALTER TABLE "whatsapp_explorer_messages" ADD COLUMN "incident_id" uuid;
ALTER TABLE "whatsapp_explorer_messages" ADD COLUMN "message_classification" text;
ALTER TABLE "whatsapp_explorer_messages" ADD COLUMN "classified_at" timestamp;
ALTER TABLE "whatsapp_explorer_messages" ADD CONSTRAINT "whatsapp_explorer_messages_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE set null ON UPDATE no action;
```

**Step 3: User applies migration**

Tell user: "Please run `npx drizzle-kit push` to apply the migration"

**Step 4: Commit migration**

```bash
git add db/migrations/
git commit -m "chore(db): add migration for message incident linking"
```

---

## Phase 2: New Actions

### Task 2.1: Create action to link message to incident

**Files:**
- Create: `actions/whatsapp-messages-actions.ts`

**Step 1: Create the new actions file**

```typescript
"use server"

import { db } from "@/db"
import { whatsappExplorerMessagesTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"

/**
 * Valid message classifications
 */
export type MessageClassification =
  | "incident_report"
  | "follow_up"
  | "closure_confirmation"
  | "general"

/**
 * Link a WhatsApp message to an incident
 * Called when user confirms which incident a message belongs to
 */
export async function linkMessageToIncidentAction(
  messageId: string,
  incidentId: string,
  classification: MessageClassification
): Promise<ActionState<void>> {
  try {
    await db
      .update(whatsappExplorerMessagesTable)
      .set({
        incidentId,
        messageClassification: classification,
        classifiedAt: new Date()
      })
      .where(eq(whatsappExplorerMessagesTable.id, messageId))

    return {
      isSuccess: true,
      message: "Message linked to incident"
    }
  } catch (error) {
    console.error("Error linking message to incident:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to link message"
    }
  }
}

/**
 * Mark a message as general (not linked to any incident)
 */
export async function markMessageAsGeneralAction(
  messageId: string
): Promise<ActionState<void>> {
  try {
    await db
      .update(whatsappExplorerMessagesTable)
      .set({
        incidentId: null,
        messageClassification: "general",
        classifiedAt: new Date()
      })
      .where(eq(whatsappExplorerMessagesTable.id, messageId))

    return {
      isSuccess: true,
      message: "Message marked as general"
    }
  } catch (error) {
    console.error("Error marking message as general:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to mark message"
    }
  }
}

/**
 * Get the database ID of a message by its WhatsApp message ID
 */
export async function getMessageDbIdAction(
  whatsappMessageId: string,
  sessionId: string
): Promise<ActionState<string>> {
  try {
    const [message] = await db
      .select({ id: whatsappExplorerMessagesTable.id })
      .from(whatsappExplorerMessagesTable)
      .where(
        eq(whatsappExplorerMessagesTable.messageId, whatsappMessageId)
      )
      .limit(1)

    if (!message) {
      return {
        isSuccess: false,
        message: "Message not found"
      }
    }

    return {
      isSuccess: true,
      message: "Message found",
      data: message.id
    }
  } catch (error) {
    console.error("Error getting message DB ID:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to get message"
    }
  }
}
```

**Step 2: Verify types**

Run: `npm run types`
Expected: No errors

**Step 3: Commit**

```bash
git add actions/whatsapp-messages-actions.ts
git commit -m "feat(actions): add message-to-incident linking actions"
```

---

### Task 2.2: Add simple query for incident messages

**Files:**
- Modify: `queries/whatsapp-messages-queries.ts`

**Step 1: Add new query function at end of file**

```typescript
/**
 * Get all messages explicitly linked to an incident
 * This is the new approach - no time-window inference
 */
export async function getMessagesForIncidentQuery(
  incidentId: string
): Promise<SelectWhatsappExplorerMessage[]> {
  return db
    .select()
    .from(whatsappExplorerMessagesTable)
    .where(eq(whatsappExplorerMessagesTable.incidentId, incidentId))
    .orderBy(sql`${whatsappExplorerMessagesTable.timestamp} ASC`)
}
```

**Step 2: Add import for sql if not present**

Ensure imports include:
```typescript
import { eq, desc, and, sql, or, ilike, ne, asc } from "drizzle-orm"
```

**Step 3: Verify types**

Run: `npm run types`
Expected: No errors

**Step 4: Commit**

```bash
git add queries/whatsapp-messages-queries.ts
git commit -m "feat(queries): add simple incident message query"
```

---

## Phase 3: Update Conversation State Machine

### Task 3.1: Add new state for update vs closure

**Files:**
- Modify: `db/schema/enums.ts:188-200`

**Step 1: Add new state to enum**

Update `whatsappConversationStateEnum` to include `awaiting_update_or_closure`:

```typescript
export const whatsappConversationStateEnum = pgEnum("whatsapp_conversation_state", [
  "idle",
  "awaiting_email",
  "awaiting_otp",
  "awaiting_property",
  "awaiting_description",
  "awaiting_photos",
  "incident_active",
  "awaiting_closure_confirmation",
  "awaiting_incident_selection",
  "awaiting_new_incident_confirmation",
  "awaiting_follow_up_confirmation",
  "awaiting_update_or_closure"  // NEW
])
```

**Step 2: Generate migration for enum change**

Run: `npx drizzle-kit generate`

**Step 3: Commit**

```bash
git add db/schema/enums.ts db/migrations/
git commit -m "feat(schema): add awaiting_update_or_closure state"
```

---

### Task 3.2: Update conversation context type

**Files:**
- Modify: `db/schema/whatsapp-conversation-states.ts:33-46`

**Step 1: Add new context fields**

Update the context type to include pending message info:

```typescript
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
  pendingMessageForNewIncident?: string
  pendingMessageForFollowUp?: string
  lastMessageAt?: string
  // NEW: For incident selection flow
  pendingMessageId?: string
  pendingMessageText?: string
  availableIncidents?: Array<{
    id: string
    reference: string
    title: string
    reportedAt: string
  }>
  selectedIncidentId?: string
}>(),
```

**Step 2: Verify types**

Run: `npm run types`
Expected: No errors

**Step 3: Commit**

```bash
git add db/schema/whatsapp-conversation-states.ts
git commit -m "feat(schema): add pending message fields to conversation context"
```

---

### Task 3.3: Update ConversationState type in state machine

**Files:**
- Modify: `lib/whatsapp/conversation-state-machine.ts:43-54`

**Step 1: Add new state to type**

```typescript
export type ConversationState =
  | "idle"
  | "awaiting_email"
  | "awaiting_otp"
  | "awaiting_property"
  | "awaiting_description"
  | "awaiting_photos"
  | "incident_active"
  | "awaiting_closure_confirmation"
  | "awaiting_incident_selection"
  | "awaiting_new_incident_confirmation"
  | "awaiting_follow_up_confirmation"
  | "awaiting_update_or_closure"  // NEW
```

**Step 2: Commit**

```bash
git add lib/whatsapp/conversation-state-machine.ts
git commit -m "feat(state-machine): add awaiting_update_or_closure state type"
```

---

### Task 3.4: Add imports for new actions

**Files:**
- Modify: `lib/whatsapp/conversation-state-machine.ts:19-38`

**Step 1: Add import for message linking actions**

```typescript
import {
  linkMessageToIncidentAction,
  getMessageDbIdAction
} from "@/actions/whatsapp-messages-actions"
```

**Step 2: Commit**

```bash
git add lib/whatsapp/conversation-state-machine.ts
git commit -m "feat(state-machine): import message linking actions"
```

---

### Task 3.5: Create handler for awaiting_incident_selection state

**Files:**
- Modify: `lib/whatsapp/conversation-state-machine.ts`

**Step 1: Add new handler function (add before the main processMessage function)**

```typescript
/**
 * Handle messages in the awaiting_incident_selection state.
 * User is choosing which incident their message belongs to, or creating new.
 */
async function handleAwaitingIncidentSelectionState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext
): Promise<ConversationResponse> {
  const lowerText = messageText.toLowerCase().trim()
  const availableIncidents = context.availableIncidents || []

  // Check for "new" keyword
  if (lowerText === "new" || lowerText === "new issue" || lowerText === "new incident") {
    // User wants to create new incident - store pending message and go to description
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_description",
      context: {
        ...context,
        pendingMessageForNewIncident: context.pendingMessageText,
        availableIncidents: undefined,
        selectedIncidentId: undefined
      }
    })

    return {
      message:
        "Got it, let's report a new issue.\n\n" +
        "Please describe the problem in detail.",
      incidentCreated: false
    }
  }

  // Check for number selection
  const selectedNumber = parseInt(lowerText, 10)
  if (!isNaN(selectedNumber) && selectedNumber >= 1 && selectedNumber <= availableIncidents.length) {
    const selectedIncident = availableIncidents[selectedNumber - 1]

    // Link the pending message to this incident
    if (context.pendingMessageId) {
      await linkMessageToIncidentAction(
        context.pendingMessageId,
        selectedIncident.id,
        "follow_up"
      )
    }

    // Transition to asking if this is an update or closure
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_update_or_closure",
      incidentId: selectedIncident.id,
      context: {
        ...context,
        selectedIncidentId: selectedIncident.id,
        availableIncidents: undefined
      }
    })

    return {
      message:
        `Got it, this is about ${selectedIncident.reference} (${selectedIncident.title}).\n\n` +
        `Is this issue now resolved, or is this an update?\n` +
        `Reply 'resolved' or 'update'.`,
      incidentCreated: false,
      incidentId: selectedIncident.id
    }
  }

  // Invalid selection - ask again
  const incidentsList = availableIncidents
    .map((inc, idx) => `${idx + 1}. ${inc.reference} - ${inc.title}`)
    .join("\n")

  return {
    message:
      `Please reply with a number (1-${availableIncidents.length}) to select an incident, or 'new' for a new issue.\n\n` +
      incidentsList,
    incidentCreated: false
  }
}
```

**Step 2: Commit**

```bash
git add lib/whatsapp/conversation-state-machine.ts
git commit -m "feat(state-machine): add awaiting_incident_selection handler"
```

---

### Task 3.6: Create handler for awaiting_update_or_closure state

**Files:**
- Modify: `lib/whatsapp/conversation-state-machine.ts`

**Step 1: Add new handler function**

```typescript
/**
 * Handle messages in the awaiting_update_or_closure state.
 * User is confirming if their message is an update or indicates resolution.
 */
async function handleAwaitingUpdateOrClosureState(
  phoneNumber: string,
  messageText: string,
  context: ConversationContext,
  incidentId?: string
): Promise<ConversationResponse> {
  const lowerText = messageText.toLowerCase().trim()

  // Check for resolution confirmation
  const resolutionKeywords = ["resolved", "fixed", "done", "yes", "close", "closed"]
  if (resolutionKeywords.includes(lowerText)) {
    // Close the incident
    if (incidentId) {
      const closeResult = await closeIncidentFromWhatsAppAction(incidentId, phoneNumber)
      if (!closeResult.isSuccess) {
        return {
          message: "Sorry, there was a problem closing the incident. Please try again.",
          incidentCreated: false,
          incidentId
        }
      }
    }

    await resetConversationStateAction(phoneNumber)

    const referenceNumber = incidentId ? generateReferenceNumber(incidentId) : "Your incident"

    return {
      message:
        `${referenceNumber} has been marked as resolved.\n\n` +
        `Thank you for letting us know! You can report a new issue anytime.`,
      incidentCreated: false,
      incidentId
    }
  }

  // Check for update confirmation
  const updateKeywords = ["update", "no", "not resolved", "still", "more"]
  if (updateKeywords.some(kw => lowerText.includes(kw))) {
    // Keep incident active
    await updateConversationStateAction(phoneNumber, {
      state: "incident_active",
      incidentId,
      context: {
        ...context,
        selectedIncidentId: undefined
      }
    })

    const referenceNumber = incidentId ? generateReferenceNumber(incidentId) : "the incident"

    return {
      message:
        `Your message has been added to ${referenceNumber}.\n\n` +
        `Our team will review it. You can send more updates or photos anytime.`,
      incidentCreated: false,
      incidentId
    }
  }

  // Unclear response - ask again
  return {
    message:
      `Is this issue now resolved, or is this an update?\n\n` +
      `Reply 'resolved' if the issue is fixed, or 'update' if you're adding more information.`,
    incidentCreated: false,
    incidentId
  }
}
```

**Step 2: Commit**

```bash
git add lib/whatsapp/conversation-state-machine.ts
git commit -m "feat(state-machine): add awaiting_update_or_closure handler"
```

---

### Task 3.7: Update processMessage to check for open incidents

**Files:**
- Modify: `lib/whatsapp/conversation-state-machine.ts`

**Step 1: Find the processMessage function and update the idle state handling**

In the `processMessage` function, find where it handles the `idle` state (or when no state exists). Update to check for open incidents first:

```typescript
// At the start of processMessage, after getting conversation state:

// If user has open incidents, always ask which one (or new)
if (currentState === "idle" || !currentState) {
  const incidentsResult = await getOpenIncidentsByPhoneAction(phoneNumber)

  if (incidentsResult.isSuccess && incidentsResult.data && incidentsResult.data.length > 0) {
    const openIncidents = incidentsResult.data

    // Store message for later linking
    // Note: We need the DB message ID - this assumes message was already saved
    const messageDbId = await getMessageDbIdFromCurrentMessage(messageId, sessionId)

    const availableIncidents = openIncidents.map(inc => ({
      id: inc.id,
      reference: `INC-${inc.id.substring(0, 8).toUpperCase()}`,
      title: inc.title,
      reportedAt: inc.reportedAt.toISOString()
    }))

    // Transition to incident selection state
    await updateConversationStateAction(phoneNumber, {
      state: "awaiting_incident_selection",
      context: {
        ...context,
        pendingMessageId: messageDbId,
        pendingMessageText: messageText,
        availableIncidents
      }
    })

    const incidentsList = availableIncidents
      .map((inc, idx) => `${idx + 1}. ${inc.reference} - ${inc.title}`)
      .join("\n")

    return {
      message:
        `You have ${openIncidents.length} open incident${openIncidents.length > 1 ? "s" : ""}:\n\n` +
        `${incidentsList}\n\n` +
        `Is your message about one of these, or a new issue?\n` +
        `Reply with a number, or 'new'.`,
      incidentCreated: false
    }
  }

  // No open incidents - proceed with new incident flow
  // (existing logic for handling new incidents)
}
```

**Step 2: Add helper function to get message DB ID**

```typescript
/**
 * Helper to get the database ID of the current message
 * Called after message is saved to DB
 */
async function getMessageDbIdFromCurrentMessage(
  whatsappMessageId: string,
  sessionId: string
): Promise<string | undefined> {
  const result = await getMessageDbIdAction(whatsappMessageId, sessionId)
  return result.isSuccess ? result.data : undefined
}
```

**Step 3: Commit**

```bash
git add lib/whatsapp/conversation-state-machine.ts
git commit -m "feat(state-machine): check for open incidents before processing"
```

---

### Task 3.8: Add case handlers in main switch statement

**Files:**
- Modify: `lib/whatsapp/conversation-state-machine.ts`

**Step 1: Add cases to the state switch**

Find the main switch statement that handles different states and add:

```typescript
case "awaiting_incident_selection":
  return handleAwaitingIncidentSelectionState(
    phoneNumber,
    messageText,
    context
  )

case "awaiting_update_or_closure":
  return handleAwaitingUpdateOrClosureState(
    phoneNumber,
    messageText,
    context,
    incidentId
  )
```

**Step 2: Verify types**

Run: `npm run types`
Expected: No errors

**Step 3: Commit**

```bash
git add lib/whatsapp/conversation-state-machine.ts
git commit -m "feat(state-machine): add case handlers for new states"
```

---

## Phase 4: Update Incident Detail Page

### Task 4.1: Update incident message history component

**Files:**
- Modify: `app/(authenticated)/dashboard/properties/[propertyId]/incidents/[id]/_components/incident-timeline.tsx`

**Step 1: Update to use new query**

Replace the time-window based query with the simple direct query:

```typescript
import { getMessagesForIncidentQuery } from "@/queries/whatsapp-messages-queries"

// In the component or data fetching:
const messages = await getMessagesForIncidentQuery(incidentId)
```

**Step 2: Commit**

```bash
git add app/(authenticated)/dashboard/properties/[propertyId]/incidents/[id]/_components/incident-timeline.tsx
git commit -m "feat(ui): use direct incident message query"
```

---

## Phase 5: Cleanup

### Task 5.1: Remove isClosureRequest function

**Files:**
- Modify: `lib/whatsapp/conversation-state-machine.ts`

**Step 1: Find and remove the isClosureRequest function**

Remove the function (around line 154-175):
```typescript
// REMOVE THIS FUNCTION
function isClosureRequest(text: string): boolean {
  const closureKeywords = [
    "close",
    "closed",
    "resolved",
    // ...
  ]
  // ...
}
```

**Step 2: Remove any calls to isClosureRequest**

Search for usages and remove them.

**Step 3: Verify types**

Run: `npm run types`
Expected: No errors

**Step 4: Commit**

```bash
git add lib/whatsapp/conversation-state-machine.ts
git commit -m "refactor(state-machine): remove isClosureRequest keyword matching"
```

---

### Task 5.2: Deprecate time-window query (optional - keep for historical data)

**Files:**
- Modify: `queries/whatsapp-messages-queries.ts`

**Step 1: Add deprecation notice to old function**

```typescript
/**
 * @deprecated Use getMessagesForIncidentQuery instead.
 * This function uses time-window inference which is unreliable.
 * Kept for historical message display only.
 *
 * Get messages related to a specific incident
 * Filters messages by phone number and timestamp within incident timeframe
 */
export async function getIncidentRelatedMessagesQuery(
  // ... existing code
)
```

**Step 2: Commit**

```bash
git add queries/whatsapp-messages-queries.ts
git commit -m "refactor(queries): deprecate time-window message query"
```

---

## Phase 6: Testing

### Task 6.1: Manual testing checklist

Test the following scenarios:

1. **User with 0 open incidents sends message**
   - Expected: Normal new incident flow starts
   - No "which incident?" prompt

2. **User with 1 open incident sends message**
   - Expected: "You have 1 open incident: ... Is this about that, or new?"
   - User replies "1" → Asked "resolved or update?"
   - User replies "new" → New incident flow

3. **User with 2+ open incidents sends message**
   - Expected: List of incidents shown
   - User picks number → Asked "resolved or update?"

4. **User confirms update**
   - Expected: Message linked to incident, confirmation shown

5. **User confirms resolved**
   - Expected: Incident closed, message linked with "closure_confirmation"

6. **Message history on incident detail page**
   - Expected: Only messages with matching incidentId shown
   - No messages from other incidents

---

## Summary

| Task | Description |
|------|-------------|
| 1.1 | Add incidentId, classification fields to messages schema |
| 1.2 | Generate and apply migration |
| 2.1 | Create message linking actions |
| 2.2 | Add simple incident message query |
| 3.1 | Add awaiting_update_or_closure state to enum |
| 3.2 | Update conversation context type |
| 3.3 | Update ConversationState type |
| 3.4 | Add imports for new actions |
| 3.5 | Create awaiting_incident_selection handler |
| 3.6 | Create awaiting_update_or_closure handler |
| 3.7 | Update processMessage to check for open incidents |
| 3.8 | Add case handlers in switch statement |
| 4.1 | Update incident timeline to use new query |
| 5.1 | Remove isClosureRequest function |
| 5.2 | Deprecate time-window query |
| 6.1 | Manual testing |

Total: 16 tasks across 6 phases
