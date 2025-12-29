# WhatsApp Message-Incident Linking Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace time-based message grouping with explicit user-confirmed message-to-incident linking

**Architecture:** Always ask users which incident a message belongs to (or if it's new). Store explicit `incidentId` on messages. No guessing, no time-window inference.

**Tech Stack:** Drizzle ORM, PostgreSQL, Next.js Server Actions, WhatsApp Baileys

---

## Problem Statement

### Current Issues

1. **False positive keyword matching**: `isClosureRequest()` triggers on "window doesn't close" because it contains "close"
2. **Time-based grouping is fragile**: Messages grouped by 2-minute-before to 1-hour-after window causes cross-contamination between incidents
3. **System assumes instead of asks**: When user has active incident, system assumes follow-up messages belong to it

### Design Principles

1. **Never assume - always confirm** with user
2. **Link explicitly** at the moment of user confirmation
3. **Store the link** so we don't re-compute
4. **No time-based guessing** - remove entirely

---

## Schema Changes

### Add fields to `whatsappExplorerMessagesTable`

```typescript
// db/schema/whatsapp-sessions.ts

export const whatsappExplorerMessagesTable = pgTable("whatsapp_explorer_messages", {
  // ... existing fields ...

  // NEW: Explicit incident linking
  incidentId: uuid("incident_id")
    .references(() => incidentsTable.id, { onDelete: "set null" }),

  // NEW: Message classification (for audit/display)
  messageClassification: text("message_classification"),
  // Values: "incident_report", "follow_up", "closure_confirmation", "general", null

  // NEW: When classification was set
  classifiedAt: timestamp("classified_at")
})
```

### Migration

```sql
ALTER TABLE whatsapp_explorer_messages
ADD COLUMN incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL;

ALTER TABLE whatsapp_explorer_messages
ADD COLUMN message_classification TEXT;

ALTER TABLE whatsapp_explorer_messages
ADD COLUMN classified_at TIMESTAMP;

CREATE INDEX idx_messages_incident_id ON whatsapp_explorer_messages(incident_id);
```

---

## Conversation Flow

### Flow Diagram

```
User sends any message
        │
        ▼
┌─────────────────────────────────────┐
│ Save message (incidentId = null)    │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ Does user have open incidents?      │
├─────────────────────────────────────┤
│ No  → Start new incident flow       │
│ Yes → Ask: which one or new?        │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ User selects incident (or new)      │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ Link message to selected incident   │
│ Update: incidentId, classification  │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ Ask: Is this an update or resolved? │
│ • Update → Confirm added            │
│ • Resolved → Confirm closure        │
└─────────────────────────────────────┘
```

### Example Conversations

**User with 1 open incident:**
```
User: "The tap is still leaking"

Bot: "You have 1 open incident:
      1. INC-A1B2 - Leaking pipe (reported yesterday)

      Is this about that incident, or a new issue?
      Reply '1' or 'new'."

User: "1"

Bot: "Is INC-A1B2 now resolved, or is this an update?
      Reply 'resolved' or 'update'."

User: "update"

Bot: "Added to INC-A1B2. Our team will see your message."
```

**User with multiple open incidents:**
```
User: "There's water on the floor"

Bot: "You have 2 open incidents:
      1. INC-A1B2 - Broken window (reported 2 days ago)
      2. INC-C3D4 - Leaking pipe (reported yesterday)

      Which incident is this about, or is it a new issue?
      Reply with a number, or 'new'."

User: "2"

Bot: "Is INC-C3D4 now resolved, or is this an update?
      Reply 'resolved' or 'update'."

User: "update"

Bot: "Added to INC-C3D4."
```

**User with no open incidents:**
```
User: "My kitchen tap is broken"

Bot: "I'll help you report this issue.
      Please describe the problem in detail."

[Normal incident creation flow continues]
```

---

## New Conversation States

Add new state to handle incident selection:

```typescript
export type ConversationState =
  | "idle"
  | "awaiting_incident_selection"  // NEW: Asking which incident
  | "awaiting_update_or_closure"   // NEW: Asking if update or resolved
  | "awaiting_email"
  | "awaiting_otp"
  | "awaiting_property"
  | "awaiting_description"
  | "awaiting_photos"
  | "incident_active"
  | "awaiting_closure_confirmation"
```

### Context Updates

```typescript
interface ConversationContext {
  // ... existing fields ...

  // NEW: Store the pending message until user confirms which incident
  pendingMessageId?: string
  pendingMessageText?: string

  // NEW: Available incidents for selection
  availableIncidents?: Array<{ id: string; reference: string; title: string }>
}
```

---

## Code Changes Required

### 1. Remove (no longer needed)

- `isClosureRequest()` function in conversation-state-machine.ts
- `classifyMessageIntent()` in ai-intent-classifier.ts (or keep for other uses)
- `getIncidentRelatedMessagesQuery()` time-window logic in whatsapp-messages-queries.ts

### 2. Add New Functions

**Link message to incident:**
```typescript
// actions/whatsapp-messages-actions.ts

export async function linkMessageToIncidentAction(
  messageId: string,
  incidentId: string,
  classification: "incident_report" | "follow_up" | "closure_confirmation"
): Promise<ActionState<void>> {
  await db
    .update(whatsappExplorerMessagesTable)
    .set({
      incidentId,
      messageClassification: classification,
      classifiedAt: new Date()
    })
    .where(eq(whatsappExplorerMessagesTable.id, messageId))

  return { isSuccess: true, message: "Message linked" }
}
```

**Get messages for incident (simple!):**
```typescript
// queries/whatsapp-messages-queries.ts

export async function getMessagesForIncidentQuery(
  incidentId: string
): Promise<SelectWhatsappExplorerMessage[]> {
  return db
    .select()
    .from(whatsappExplorerMessagesTable)
    .where(eq(whatsappExplorerMessagesTable.incidentId, incidentId))
    .orderBy(asc(whatsappExplorerMessagesTable.timestamp))
}
```

### 3. Update Conversation State Machine

- When message received and user has open incidents → transition to `awaiting_incident_selection`
- Store pending message in context
- On incident selection → link message, transition to `awaiting_update_or_closure`
- On "update" → confirm and stay in `incident_active`
- On "resolved" → close incident, reset state

---

## Message History Display

### Before (complex time-window query)

```typescript
const messages = await getIncidentRelatedMessagesQuery(
  incidentId,
  phoneNumber,
  sessionId,
  incidentReportedAt,
  incidentUpdatedAt
)
// Complex logic with 2-min before, 1-hour after, proximity checks...
```

### After (simple direct query)

```typescript
const messages = await getMessagesForIncidentQuery(incidentId)
// That's it. Clean. No overlap possible.
```

---

## Migration Strategy for Existing Messages

Existing messages without `incidentId` will remain unlinked. Options:

1. **Leave as-is**: Old messages stay unlinked, new messages get linked
2. **Backfill**: Run one-time migration using time-window logic to link historical messages (best effort)
3. **Hybrid**: Leave unlinked but show in UI with "(historical)" label

**Recommendation:** Option 1 - start fresh. Old time-window logic stays for historical display only.

---

## Implementation Tasks

### Phase 1: Schema & Foundation
- [ ] Add migration for new message fields
- [ ] Update schema types
- [ ] Add `linkMessageToIncidentAction`
- [ ] Add `getMessagesForIncidentQuery`

### Phase 2: Conversation Flow
- [ ] Add `awaiting_incident_selection` state handler
- [ ] Add `awaiting_update_or_closure` state handler
- [ ] Update message received flow to check for open incidents
- [ ] Store pending message in context

### Phase 3: Cleanup
- [ ] Remove `isClosureRequest()` keyword matching
- [ ] Remove or deprecate time-window query logic
- [ ] Update incident detail page to use new query

### Phase 4: Testing
- [ ] Test: User with 0 incidents → new incident flow
- [ ] Test: User with 1 incident → selection prompt
- [ ] Test: User with 2+ incidents → selection prompt
- [ ] Test: Update flow
- [ ] Test: Closure flow
- [ ] Test: Message history display (no cross-contamination)

---

## Success Criteria

1. "Window doesn't close" is never misinterpreted as closure request
2. Messages from Incident A never appear in Incident B's history
3. User is always asked to confirm which incident (when they have open ones)
4. Message history query is a simple `WHERE incidentId = ?`
