# WhatsApp Incident Lifecycle Design

## Overview

A full-lifecycle incident management system that allows tenants to report, track, and resolve incidents via WhatsApp and email without requiring authentication.

## Goals

1. **Image/media uploads** - Tenants can send photos with incident reports
2. **Email-based submission** - Dedicated inbox for email incident reports
3. **Smart conversation flow** - Guide tenants through reporting, prompt for missing fields
4. **Status tracking** - Tenants can check status, add comments, confirm resolution via WhatsApp
5. **Dual-channel notifications** - Agents/landlords notified via both email and WhatsApp

---

## Architecture Overview

### Identification Priority

```
1. PHONE MATCH     → Instant identification (registered phone in tenants.phone)
2. EMAIL OTP       → Unknown phone, verify via email sent to tenant
3. PROPERTY CODE   → Fallback for edge cases (PROP-XXXXXX)
```

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Input Channels                               │
├─────────────────────┬─────────────────────┬─────────────────────┤
│    WhatsApp         │       Email          │        Web          │
│    (Baileys)        │   (Inbound Parse)    │    (Existing)       │
└─────────────────────┴─────────────────────┴─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Conversation State Machine                          │
│  ─────────────────────────────────────────                       │
│  Manages multi-turn flows, tracks partial data                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Incident Creation                                   │
│  ─────────────────────────────────────────                       │
│  createIncidentAction (unified for all channels)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Notification Service                                │
│  ─────────────────────────────────────────                       │
│  Email + WhatsApp to agents/landlords                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Conversation Flow & State Machine

### State Transitions

```
┌──────────────────────────────────────────────────────────────────┐
│                           IDLE                                    │
└──────────────────────────────────────────────────────────────────┘
         │ Incident message received
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Phone number known?                            │
│                     /            \                                │
│                   YES             NO                              │
│                    │               │                              │
│                    │               ▼                              │
│                    │      AWAITING_EMAIL                          │
│                    │      "What's your email?"                    │
│                    │               │                              │
│                    │         Email received                       │
│                    │               │                              │
│                    │         Email matches tenant?                │
│                    │          /          \                        │
│                    │        YES           NO                      │
│                    │         │             │                      │
│                    │         ▼             ▼                      │
│                    │   AWAITING_OTP    "Email not found.          │
│                    │   Send 6-digit     Try property code         │
│                    │   code to email    PROP-XXXXXX"              │
│                    │         │               │                    │
│                    │    OTP verified    AWAITING_PROPERTY         │
│                    │         │               │                    │
│                    ├─────────┴───────────────┘                    │
│                    ▼                                              │
│            IDENTIFIED ──► Save phone to tenant record             │
│                    │                                              │
│                    ▼                                              │
│         Has description in message?                               │
│              /           \                                        │
│            YES            NO                                      │
│             │              │                                      │
│             │        AWAITING_DESCRIPTION                         │
│             │              │                                      │
│             └──────────────┤                                      │
│                            ▼                                      │
│                    CREATE INCIDENT                                │
│                            │                                      │
│                            ▼                                      │
│                    INCIDENT_ACTIVE                                │
└──────────────────────────────────────────────────────────────────┘
```

### State Timeout

- State expires after 30 minutes of inactivity
- On expiry, returns to `idle`
- Partial data is discarded with a polite message if user returns

---

## Media Handling

### Flow

```
WhatsApp Image Received
         │
         ▼
┌─────────────────────────────────────────┐
│ Baileys Server                          │
│ ─────────────────                       │
│ 1. Detect image/video/document message  │
│ 2. Download media via downloadMedia()   │
│ 3. POST to Next.js /api/whatsapp/media  │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Next.js API                             │
│ ─────────────────                       │
│ 1. Receive binary + metadata            │
│ 2. Upload to Supabase Storage           │
│ 3. Return public URL                    │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Incident Linking                        │
│ ─────────────────                       │
│ If incident exists:                     │
│   → Insert into incident_attachments    │
│ If awaiting incident creation:          │
│   → Store URL in conversation context   │
│   → Link when incident is created       │
└─────────────────────────────────────────┘
```

### Supported Media Types

- Images: jpg, png, webp (compressed by WhatsApp)
- Videos: mp4 (up to 16MB via WhatsApp)
- Documents: pdf, docx

### User Experience

- Tenant can send photo with caption: photo becomes attachment, caption becomes description
- Tenant can send multiple photos in sequence before incident is created - all get attached
- System responds: "Photo received. Send more or type 'done' to submit."

---

## Email-Based Incident Submission

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Inbound Email (incidents@yourdomain.com)                        │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼ (Webhook from email provider: SendGrid, Postmark, etc.)
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/webhooks/email/incidents                              │
│ ────────────────────────────────                                │
│ 1. Parse sender email address                                   │
│ 2. Parse subject → incident title                               │
│ 3. Parse body → incident description                            │
│ 4. Extract attachments → upload to storage                      │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Identification (same logic as WhatsApp)                         │
│ ─────────────────────────────────────────                       │
│ 1. Match sender email to tenant record                          │
│ 2. If no match → check for PROP-XXXXXX in subject/body          │
│ 3. If still no match → reply asking for property code           │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Create Incident                                                  │
│ ─────────────────                                                │
│ submissionMethod: 'email'                                       │
│ Link attachments                                                │
│ Send confirmation email with reference number                   │
└─────────────────────────────────────────────────────────────────┘
```

### Email Parsing Rules

| Email Part | Maps To |
|------------|---------|
| From address | Tenant lookup |
| Subject | incident.title |
| Body (plain text preferred) | incident.description |
| Attachments | incident_attachments |
| Reply-To threading | Link follow-up emails to existing incident |

### Response Emails

1. **Success:** "Your incident has been logged. Reference: INC-A1B2C3D4. We'll update you shortly."
2. **Unknown sender:** "We couldn't find your property. Please reply with your property code (PROP-XXXXXX) or the address."
3. **Follow-up detected:** "Your message has been added to incident INC-A1B2C3D4."

---

## Status Tracking & Full Interaction

### Trigger Detection

| User Message | Action |
|--------------|--------|
| `status` or `INC-XXXXXXXX` | Return current status |
| `my incidents` | List all open incidents for this tenant |
| Photo/text while in `INCIDENT_ACTIVE` state | Add as comment/attachment |
| `resolved` or `fixed` or `done` | Prompt to confirm closure |
| `yes` (after closure prompt) | Close incident |

### Status Check Response

```
Incident INC-A1B2C3D4
━━━━━━━━━━━━━━━━━━━━━
Property: 12 Main Road, Unit 5
Issue: Water leak in bathroom ceiling
Status: In Progress
Assigned to: ABC Plumbing
Reported: 2 days ago
Last update: "Plumber scheduled for tomorrow 9am"

Reply with a message to add a comment, or send photos to add to this incident.
```

### Closure Flow

```
Tenant: "It's fixed now"
Bot: "Great! Can you confirm incident INC-A1B2C3D4 is resolved? Reply YES to close."
Tenant: "yes"
Bot: "Incident closed. Thank you for confirming. Rate your experience? (1-5)"
```

---

## Notifications

### Notification Triggers

| Event | Notify |
|-------|--------|
| New incident created | Property owner + assigned agent |
| Tenant adds comment/photo | Assigned handler |
| Incident priority changed to urgent | All stakeholders |
| Tenant confirms resolution | Assigned handler |

### Notification Recipients

```
Property
   │
   ├── Landlord (owner) ──► Always notified
   │
   └── Property Management
           │
           └── Rental Agent ──► Notified if assigned
```

### Email Notification Example

```
Subject: New Incident: Water leak - 12 Main Road, Unit 5

New incident reported via WhatsApp:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reference: INC-A1B2C3D4
Property: 12 Main Road, Unit 5
Tenant: John Doe (0821234567)
Priority: High
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Description:
Water leaking from bathroom ceiling, getting worse.

2 photos attached

[View Incident]
```

### WhatsApp Notification Example

```
New Incident Reported

12 Main Road, Unit 5
INC-A1B2C3D4
Priority: High

"Water leaking from bathroom ceiling"

Reply with the reference number to view details or assign.
```

---

## Database Schema

### New Tables

```sql
-- 1. Conversation state for multi-turn WhatsApp flows
CREATE TABLE whatsapp_conversation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  session_id UUID REFERENCES whatsapp_sessions(id),
  state TEXT NOT NULL DEFAULT 'idle',
  incident_id UUID REFERENCES incidents(id),
  context JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. OTP verification for unknown phone numbers
CREATE TABLE whatsapp_otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Comments/follow-ups on incidents
CREATE TABLE incident_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL,
  author_id UUID REFERENCES user_profiles(id),
  author_phone TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID REFERENCES user_profiles(id) UNIQUE,
  notify_email BOOLEAN DEFAULT true,
  notify_whatsapp BOOLEAN DEFAULT true,
  notify_new_incidents BOOLEAN DEFAULT true,
  notify_updates BOOLEAN DEFAULT true,
  notify_urgent_only BOOLEAN DEFAULT false,
  whatsapp_phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Existing Tables Used (no changes)

- `tenants` - has `phone` and `email` for matching
- `incidents` - has `submissionMethod` enum
- `incident_attachments` - for photos/documents
- `incident_status_history` - audit trail
- `whatsapp_sessions` - Baileys connections
- `property_codes` - fallback identification

---

## Implementation Overview

### Baileys Server (whatsapp-server/)

| File | Action | Purpose |
|------|--------|---------|
| `src/baileys/message-handler.ts` | Modify | Add media download, call conversation state API |
| `src/services/media-downloader.ts` | Create | Download media via Baileys `downloadMediaMessage()` |
| `src/services/conversation-client.ts` | Create | Call Next.js conversation state API |

### Next.js API Routes

| File | Action | Purpose |
|------|--------|---------|
| `app/api/whatsapp/conversation/route.ts` | Create | Manage conversation state machine |
| `app/api/whatsapp/media/route.ts` | Create | Receive media, upload to Supabase Storage |
| `app/api/whatsapp/otp/route.ts` | Create | Generate & verify email OTPs |
| `app/api/webhooks/email/incidents/route.ts` | Create | Inbound email processing |
| `app/api/whatsapp/incidents/route.ts` | Modify | Handle conversation flow responses |

### Libraries

| File | Action | Purpose |
|------|--------|---------|
| `lib/whatsapp/conversation-state.ts` | Create | State machine logic |
| `lib/whatsapp/otp-service.ts` | Create | OTP generation, email sending |
| `lib/whatsapp/notification-service.ts` | Create | Send notifications to agents/landlords |
| `lib/whatsapp/incident-handler.ts` | Modify | Integrate with conversation flow |

### Database Schema

| File | Action | Purpose |
|------|--------|---------|
| `db/schema/whatsapp-conversation-states.ts` | Create | Conversation state table |
| `db/schema/whatsapp-otp-verifications.ts` | Create | OTP verification table |
| `db/schema/incident-comments.ts` | Create | Comments table |
| `db/schema/notification-preferences.ts` | Create | Notification prefs table |
| `db/schema/index.ts` | Modify | Export new schemas |

### Actions

| File | Action | Purpose |
|------|--------|---------|
| `actions/conversation-state-actions.ts` | Create | State CRUD operations |
| `actions/incident-comments-actions.ts` | Create | Comment CRUD |
| `actions/notification-actions.ts` | Create | Send notifications |

---

## Next Steps

1. Set up git worktree for isolated development
2. Create detailed implementation plan
3. Implement in phases:
   - Phase 1: Database schema + conversation state machine
   - Phase 2: Media handling
   - Phase 3: Email inbound processing
   - Phase 4: Status tracking & comments
   - Phase 5: Notifications
