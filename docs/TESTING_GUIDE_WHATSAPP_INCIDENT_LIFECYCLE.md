# WhatsApp Incident Lifecycle Testing Guide

This guide walks through testing the WhatsApp incident lifecycle feature, which allows tenants to report, track, and resolve incidents via WhatsApp.

---

## Prerequisites

### 1. Environment Variables

Ensure these are set in your `.env.local`:

```env
# Database
DATABASE_URL=postgresql://...

# Postmark (for OTP and notification emails)
POSTMARK_API_KEY=your-postmark-api-key
POSTMARK_FROM_EMAIL=incidents@yourdomain.com

# Supabase (for media uploads)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Baileys Server
BAILEYS_SERVER_URL=http://localhost:3001
WHATSAPP_CONVERSATION_API_KEY=your-secure-api-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Apply Database Migration

```bash
npx drizzle-kit push
```

This creates:
- `whatsapp_conversation_states` table
- `incident_comments` table
- `notification_preferences` table
- `whatsapp_conversation_state` enum
- `incident_author_type` enum

### 3. Start Services

```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2: Baileys WhatsApp server
cd whatsapp-server
npm run dev
```

### 4. Test Data Requirements

You need:
- A **property** with a property code (PROP-XXXXXX)
- A **tenant** linked to that property with email and optionally phone
- A **landlord** or **rental agent** assigned to the property (for notifications)

---

## Test Scenarios

### Scenario 1: Known Phone Number (Instant Identification)

**Setup:** Tenant has their phone number saved in the `tenants.phone` field.

**Test Steps:**

1. Send a WhatsApp message from the tenant's registered phone:
   ```
   There's a water leak in my bathroom ceiling
   ```

2. **Expected Response:**
   ```
   Your incident has been logged successfully.

   Reference: INC-A1B2C3D4
   Property: [Property Name]

   We'll update you shortly. Reply with your reference number anytime to check status.
   ```

3. **Verify in Database:**
   ```sql
   SELECT * FROM incidents ORDER BY created_at DESC LIMIT 1;
   -- Should show new incident with submission_method = 'whatsapp'
   -- is_verified = true (because phone matched)
   ```

4. **Verify Notifications:**
   - Check Postmark activity for email sent to landlord/agent
   - Check Baileys server logs for WhatsApp notification attempt

---

### Scenario 2: Unknown Phone with Email OTP Verification

**Setup:** Tenant exists in database with email but phone is not saved.

**Test Steps:**

1. Send a WhatsApp message from an unregistered phone:
   ```
   My kitchen tap is broken
   ```

2. **Expected Response:**
   ```
   Hi! To report an incident, I need to verify your identity.

   Please reply with your email address associated with your tenancy.
   ```

3. Reply with tenant's email:
   ```
   john.doe@email.com
   ```

4. **Expected Response:**
   ```
   Thanks! I've sent a 6-digit verification code to john.doe@email.com.

   Please reply with the code to continue.
   ```

5. **Check Email:** Tenant receives OTP email via Postmark.

6. Reply with OTP code:
   ```
   123456
   ```

7. **Expected Response:**
   ```
   Phone verified! Your phone is now linked to your account for future reports.

   Please describe the issue you'd like to report.
   ```

8. Describe the incident:
   ```
   Kitchen tap is leaking badly, water everywhere
   ```

9. **Expected Response:**
   ```
   Your incident has been logged successfully.

   Reference: INC-XXXXXXXX
   Property: [Property Name]
   ...
   ```

10. **Verify in Database:**
    ```sql
    -- Check tenant phone was linked
    SELECT phone FROM tenants WHERE email = 'john.doe@email.com';
    -- Should now have the WhatsApp phone number

    -- Check incident created
    SELECT * FROM incidents ORDER BY created_at DESC LIMIT 1;
    ```

---

### Scenario 3: Unknown Phone with Property Code Fallback

**Setup:** Phone and email don't match any tenant.

**Test Steps:**

1. Send message from unknown phone:
   ```
   There's a broken window
   ```

2. **Expected Response:**
   ```
   Hi! To report an incident, I need to verify your identity.

   Please reply with your email address associated with your tenancy.
   ```

3. Reply with unknown email:
   ```
   unknown@email.com
   ```

4. **Expected Response:**
   ```
   I couldn't find an account with that email address.

   Please reply with your property code (format: PROP-XXXXXX). You can find this on your lease agreement or ask your property manager.
   ```

5. Reply with property code:
   ```
   PROP-ABC123
   ```

6. **Expected Response:**
   ```
   Property found: [Property Name]

   Please describe the issue you'd like to report.
   ```

7. Continue with incident description...

---

### Scenario 4: Photo Uploads with Incident

**Test Steps:**

1. Start an incident report (use any identification method above)

2. When prompted for description, send a photo with caption:
   ```
   [Photo of broken window]
   Caption: Window cracked in bedroom
   ```

3. **Expected Response:**
   ```
   Photo received. You can send more photos or type 'done' to submit your report.
   ```

4. Send another photo or type:
   ```
   done
   ```

5. **Expected Response:**
   ```
   Your incident has been logged successfully.

   Reference: INC-XXXXXXXX
   Property: [Property Name]
   Attachments: 1 photo(s)
   ...
   ```

6. **Verify in Database:**
   ```sql
   SELECT * FROM incident_attachments
   WHERE incident_id = '[incident-id]';
   -- Should show uploaded photos with Supabase URLs
   ```

---

### Scenario 5: Status Check

**Setup:** Tenant has an existing incident.

**Test Steps:**

1. Send message with reference number:
   ```
   INC-A1B2C3D4
   ```

2. **Expected Response:**
   ```
   Incident INC-A1B2C3D4
   ━━━━━━━━━━━━━━━━━━━━━
   Property: [Property Name]
   Issue: [Description]
   Status: [Current Status]
   Reported: [Time ago]

   Reply with a message to add a comment.
   ```

**Alternative:** Send "status" or "my incidents":
```
status
```
or
```
my incidents
```

---

### Scenario 6: Adding Comments to Active Incident

**Setup:** Tenant is in `incident_active` state with an open incident.

**Test Steps:**

1. Send a follow-up message:
   ```
   Update: the leak is getting worse
   ```

2. **Expected Response:**
   ```
   Your comment has been added to incident INC-XXXXXXXX.
   ```

3. **Verify in Database:**
   ```sql
   SELECT * FROM incident_comments
   WHERE incident_id = '[incident-id]'
   ORDER BY created_at DESC;
   -- Should show the new comment with author_type = 'tenant'
   ```

---

### Scenario 7: Confirming Resolution

**Test Steps:**

1. Send resolution message:
   ```
   It's fixed now
   ```
   or
   ```
   resolved
   ```

2. **Expected Response:**
   ```
   Great! Can you confirm incident INC-XXXXXXXX is resolved?

   Reply YES to close the incident.
   ```

3. Confirm:
   ```
   yes
   ```

4. **Expected Response:**
   ```
   Incident INC-XXXXXXXX has been closed. Thank you for confirming!

   If you have any other issues, just send a message to start a new report.
   ```

5. **Verify in Database:**
   ```sql
   SELECT status FROM incidents WHERE id = '[incident-id]';
   -- Should be 'resolved'

   SELECT * FROM incident_status_history
   WHERE incident_id = '[incident-id]'
   ORDER BY created_at DESC;
   -- Should show status change to 'resolved'
   ```

---

## API Testing

### Test Conversation API Directly

```bash
curl -X POST http://localhost:3000/api/whatsapp/conversation \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secure-api-key" \
  -d '{
    "phoneNumber": "27821234567",
    "messageText": "There is a water leak in my apartment",
    "sessionId": "test-session-id"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "responseMessage": "Hi! To report an incident...",
  "incidentCreated": false
}
```

### Test Media Upload API

```bash
curl -X POST http://localhost:3000/api/whatsapp/media \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secure-api-key" \
  -d '{
    "phoneNumber": "27821234567",
    "sessionId": "test-session-id",
    "mediaData": "base64-encoded-image-data",
    "mimeType": "image/jpeg",
    "fileName": "photo.jpg"
  }'
```

---

## Notification Testing

### Verify Email Notifications

1. Create an incident via WhatsApp
2. Check Postmark activity dashboard:
   - Email should be sent to landlord/agent
   - Subject: "New Incident: [Description] - [Property Name]"

### Verify WhatsApp Notifications

1. Check Baileys server logs for outgoing message attempts
2. Landlord/agent should receive WhatsApp if:
   - They have `notify_whatsapp = true` in notification_preferences
   - They have a `whatsapp_phone` saved

---

## Debugging

### Check Conversation State

```sql
SELECT * FROM whatsapp_conversation_states
WHERE phone_number = '27821234567';
```

### View State Transitions

Monitor the Next.js console for state machine logs:
```
[ConversationStateMachine] Processing message for 27821234567
[ConversationStateMachine] Current state: idle
[ConversationStateMachine] Transitioning to: awaiting_email
```

### Reset Conversation State

If testing gets stuck, reset the state:

```sql
UPDATE whatsapp_conversation_states
SET state = 'idle', context = NULL, expires_at = NOW() + INTERVAL '30 minutes'
WHERE phone_number = '27821234567';
```

Or delete it entirely:
```sql
DELETE FROM whatsapp_conversation_states
WHERE phone_number = '27821234567';
```

---

## Phone Number Formats

The system handles South African phone numbers in multiple formats. WhatsApp sends numbers in `27XXXXXXXXX` format, but your database might store them differently.

### Supported Formats

| Database Storage | WhatsApp Format | Match? |
|------------------|-----------------|--------|
| `0821234567` | `27821234567` | ✅ Yes |
| `27821234567` | `27821234567` | ✅ Yes |
| `+27821234567` | `27821234567` | ✅ Yes |
| `+27 82 123 4567` | `27821234567` | ✅ Yes |
| `082-123-4567` | `27821234567` | ✅ Yes |

### How It Works

1. WhatsApp sends: `27821234567@s.whatsapp.net`
2. We extract: `27821234567`
3. We generate variations: `27821234567`, `0821234567`, `+27821234567`
4. We try exact match against each variation
5. If no match, we use SQL to normalize stored values and compare

### Debugging Phone Matching

```sql
-- Check what format is stored for a tenant
SELECT phone FROM tenants WHERE email = 'tenant@email.com';

-- Test if a phone would match (replace with your phone)
SELECT *
FROM tenants
WHERE phone IN ('27821234567', '0821234567', '+27821234567')
   OR REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = '27821234567';
```

### Updating Tenant Phone to Correct Format

If you need to normalize stored phone numbers:

```sql
-- Preview changes (don't run UPDATE yet)
SELECT phone,
       CASE
         WHEN phone LIKE '0%' THEN '27' || SUBSTRING(phone, 2)
         WHEN phone LIKE '+%' THEN SUBSTRING(phone, 2)
         ELSE phone
       END as normalized
FROM tenants
WHERE phone IS NOT NULL;

-- Apply normalization (be careful!)
UPDATE tenants
SET phone = CASE
              WHEN phone LIKE '0%' THEN '27' || SUBSTRING(REPLACE(REPLACE(phone, ' ', ''), '-', ''), 2)
              WHEN phone LIKE '+%' THEN SUBSTRING(REPLACE(REPLACE(phone, ' ', ''), '-', ''), 2)
              ELSE REPLACE(REPLACE(phone, ' ', ''), '-', '')
            END
WHERE phone IS NOT NULL;
```

---

## Common Issues

### Issue: OTP Email Not Received
- Check Postmark API key is correct
- Verify `POSTMARK_FROM_EMAIL` is a verified sender
- Check Postmark activity logs for bounces/errors

### Issue: Photos Not Uploading
- Verify Supabase credentials
- Check storage bucket exists and has correct permissions
- Verify Baileys media download is working

### Issue: Notifications Not Sending
- Check landlord/agent has notification preferences set
- Verify email addresses are correct
- Check Baileys server is running for WhatsApp notifications

### Issue: "Session expired" Messages
- Conversation states expire after 30 minutes of inactivity
- User needs to start a new conversation

---

## State Machine Reference

| State | Description | Next States |
|-------|-------------|-------------|
| `idle` | No active conversation | `awaiting_email`, `awaiting_description` |
| `awaiting_email` | Waiting for email input | `awaiting_otp`, `awaiting_property` |
| `awaiting_otp` | Waiting for OTP verification | `awaiting_description` |
| `awaiting_property` | Waiting for property code | `awaiting_description` |
| `awaiting_description` | Waiting for incident description | `awaiting_photos`, `incident_active` |
| `awaiting_photos` | Collecting photos | `incident_active` |
| `incident_active` | Incident created, accepting updates | `awaiting_closure_confirmation`, `idle` |
| `awaiting_closure_confirmation` | Confirming resolution | `idle` |

---

## Checklist

- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Baileys server connected to WhatsApp
- [ ] Test tenant with phone (Scenario 1)
- [ ] Test tenant with email only (Scenario 2)
- [ ] Test unknown user with property code (Scenario 3)
- [ ] Test photo uploads (Scenario 4)
- [ ] Test status check (Scenario 5)
- [ ] Test adding comments (Scenario 6)
- [ ] Test resolution confirmation (Scenario 7)
- [ ] Verify email notifications via Postmark
- [ ] Verify WhatsApp notifications to landlord/agent
