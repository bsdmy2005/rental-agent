# WhatsApp Integration Architecture - End-to-End System

## Overview

This document outlines the complete architecture for WhatsApp integration covering:
1. **Tenant Incident Submission** via WhatsApp
2. **RFQ/Job Card Distribution** to service providers via WhatsApp
3. **Quote Submission** by service providers via WhatsApp using RFQ codes

## Current State

- ✅ Twilio WhatsApp API client implemented (`lib/whatsapp/twilio-client.ts`)
- ✅ RFQ code generation system (`lib/whatsapp/rfq-code-generator.ts`)
- ✅ Quote submission handler (`lib/whatsapp/quote-submission-handler.ts`)
- ✅ Webhook route structure (`app/api/webhooks/whatsapp/route.ts`)
- ✅ Database schema supports WhatsApp codes and message IDs

## Architecture Flow

### Flow 1: Tenant Submits Incident via WhatsApp

```
Tenant → WhatsApp Message → Webhook → Parse Message → Identify Property → Create Incident → Send Confirmation
```

**Details:**
1. Tenant sends WhatsApp message to business number
2. Message contains property code (PROP-XXXXXX) or phone number
3. Webhook receives message and routes to incident handler
4. System identifies property using property identification logic
5. Creates incident with `submissionMethod="whatsapp"`
6. Sends confirmation message with incident reference number

**Message Format Options:**
- **Option A**: Natural language with AI parsing
  ```
  "Hi, I have a leak in my kitchen at PROP-ABC123"
  ```
- **Option B**: Structured format
  ```
  PROP-ABC123
  Leaking pipe in kitchen
  Urgent
  [photo attached]
  ```
- **Option C**: Interactive buttons (WhatsApp Business API)
  - Button 1: "Report Issue"
  - Button 2: "Check Status"

**Implementation:**
- Use existing `submitPublicIncidentAction` with `submissionMethod="whatsapp"`
- Parse message using AI (OpenAI) or pattern matching
- Extract property identifier, description, priority, photos
- Auto-link to tenant if phone matches

### Flow 2: Send RFQ/Job Card to Service Provider

```
Landlord/Agent → Create Quote Request → Generate RFQ Code → Send WhatsApp → Service Provider Receives
```

**Details:**
1. Landlord/agent creates quote request from incident
2. System generates unique RFQ code (RFQ-XXXXXX)
3. WhatsApp message sent with:
   - Incident details
   - Property information
   - Photos (if available)
   - RFQ code for reply
   - Due date (optional)
4. Message ID stored for tracking

**Message Format:**
```
🔧 Quote Request: [Incident Title]

Property: [Property Name]
Address: [Full Address]

📋 Details:
[Incident Description]

Priority: [Priority Level]
Tenant: [Name] (if available)
Notes: [Additional notes]
Quote Due Date: [Date]

📎 [X] photo(s) attached

💬 To submit your quote, reply with:
RFQ-XXXXXX
Amount: R [amount]
Description: [your description]
Completion Date: [date] (optional)

Reply with the code above to link your quote.
```

**Implementation:**
- Already implemented in `sendQuoteRequestWhatsAppAction`
- Uses `sendQuoteRequestWhatsApp` from `lib/whatsapp/response-sender.ts`
- Supports multiple media attachments
- Stores `whatsappCode`, `whatsappMessageId`, `whatsappSentAt` in database

### Flow 3: Service Provider Submits Quote via WhatsApp

```
Service Provider → WhatsApp Reply → Webhook → Parse RFQ Code → Extract Quote Details → Create Quote → Send Confirmation
```

**Details:**
1. Service provider replies to WhatsApp message
2. Reply contains RFQ code (RFQ-XXXXXX) and quote details
3. Webhook routes to quote submission handler
4. System validates RFQ code and checks expiration
5. Extracts amount, description, completion date
6. Creates quote record
7. Sends confirmation message

**Message Format:**
```
RFQ-XXXXXX
Amount: R 1500
Description: Replace kitchen pipe and fix leak
Completion Date: 2024-01-15
```

**Variations Supported:**
- Natural language: "RFQ-XXXXXX R1500 for pipe replacement, done by Jan 15"
- Structured: Multiple lines with labels
- Minimal: "RFQ-XXXXXX R1500"

**Implementation:**
- Already implemented in `processQuoteSubmissionFromWhatsApp`
- Uses `parseQuoteSubmission` from `lib/whatsapp/quote-parser.ts`
- Validates RFQ code, checks expiration, prevents duplicates
- Sends error messages for invalid submissions

## Technical Architecture

### 1. WhatsApp Provider: Twilio

**Why Twilio:**
- ✅ Already integrated
- ✅ WhatsApp Business API access
- ✅ Webhook support
- ✅ Media message support
- ✅ Reliable delivery

**Configuration:**
- Environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_WHATSAPP_NUMBER` (format: `whatsapp:+14155238886`)

**Limitations:**
- Requires Twilio WhatsApp sandbox or approved business number
- Media URLs must be publicly accessible
- Rate limits apply

### 2. Webhook Processing

**Route:** `/api/webhooks/whatsapp`

**Current Implementation:**
- GET: Webhook verification (Twilio requirement)
- POST: Message processing

**Message Routing Logic:**
```typescript
1. Parse incoming message
2. Check if message contains RFQ code (RFQ-XXXXXX)
   - YES → Route to quote submission handler
   - NO → Check if message contains property code (PROP-XXXXXX)
     - YES → Route to incident submission handler
     - NO → Check if sender phone matches existing tenant
       - YES → Route to incident submission handler
       - NO → Send help message
```

### 3. Message Parsing Strategy

**For Incident Submission:**
- **Option 1**: AI-powered parsing (OpenAI)
  - Use GPT-4 with structured output
  - Extract: property identifier, description, priority, location
  - Handles natural language well
  
- **Option 2**: Pattern matching
  - Look for property codes (PROP-XXXXXX)
  - Extract first line as title
  - Rest as description
  - Keywords for priority detection

**For Quote Submission:**
- **Current**: Pattern matching (already implemented)
  - Extract RFQ code
  - Extract amount (R, ZAR, numbers)
  - Extract description
  - Extract date (various formats)

### 4. Database Schema

**Quote Requests Table:**
- `whatsappCode`: Unique code (RFQ-XXXXXX)
- `whatsappMessageId`: Twilio message SID
- `whatsappSentAt`: Timestamp

**Incidents Table:**
- `submissionMethod`: Enum (web, whatsapp, sms, email)
- `submittedPhone`: Phone number used
- `submittedName`: Name provided

**Quotes Table:**
- `whatsappReplyId`: Phone number that submitted quote

## Implementation Status

### ✅ Completed
- [x] Twilio WhatsApp client setup
- [x] RFQ code generation
- [x] Quote submission handler
- [x] Webhook route structure
- [x] Database schema for WhatsApp tracking
- [x] Quote request sending functionality

### 🚧 Partially Implemented
- [ ] Incident submission via WhatsApp (webhook routing needs completion)
- [ ] Message parsing for incident submission (needs AI integration)
- [ ] Webhook message routing logic (needs completion)

### ❌ Not Started
- [ ] Interactive buttons/menus (WhatsApp Business API)
- [ ] Status updates via WhatsApp
- [ ] Two-way conversation handling
- [ ] Message templates
- [ ] Error handling and retry logic
- [ ] Rate limiting and spam prevention

## Key Design Decisions

### 1. Code-Based System

**Why RFQ codes?**
- ✅ Simple for low-skilled service providers
- ✅ No account creation needed
- ✅ Works via WhatsApp, email, or SMS
- ✅ Easy to track and validate
- ✅ Prevents spam and unauthorized submissions

**Format:**
- Property codes: `PROP-XXXXXX` (6 alphanumeric)
- RFQ codes: `RFQ-XXXXXX` (6 alphanumeric)
- Both exclude ambiguous characters (I, O, 0, 1)

### 2. Multi-Channel Support

**Design:**
- Same RFQ can be sent via email AND WhatsApp
- Service provider can reply via either channel
- System tracks which channel was used
- Unified quote record regardless of channel

**Benefits:**
- Flexibility for service providers
- Redundancy if one channel fails
- Better response rates

### 3. Message Format Flexibility

**Design:**
- Support multiple message formats
- Natural language parsing
- Structured format fallback
- Progressive enhancement (add buttons later)

**Why:**
- Different user skill levels
- Different device capabilities
- Future-proof for new features

## Security Considerations

### 1. Webhook Verification
- ✅ Twilio signature validation (implemented)
- ✅ Verify token for GET requests
- ✅ Rate limiting needed

### 2. Code Validation
- ✅ RFQ codes expire with due date
- ✅ One quote per RFQ code
- ✅ Phone number verification (optional)

### 3. Spam Prevention
- Rate limiting per phone number
- Code generation uniqueness checks
- Message content validation

## User Experience Flows

### Tenant Flow: Submit Incident

1. Tenant opens WhatsApp
2. Messages business number: "PROP-ABC123 Leak in kitchen"
3. Optionally attaches photo
4. Receives confirmation: "✅ Incident reported! Reference: INC-12345678"
5. Can check status later via WhatsApp

### Service Provider Flow: Receive & Submit Quote

1. Receives WhatsApp message with RFQ
2. Reviews incident details and photos
3. Replies: "RFQ-XXXXXX R1500 Pipe replacement, done by Jan 15"
4. Receives confirmation: "✅ Quote received! RFQ: RFQ-XXXXXX Amount: R1500"
5. Can ask questions by replying to same thread

### Landlord/Agent Flow: Send RFQ

1. Views incident in dashboard
2. Clicks "Request Quote" → Selects service provider
3. System generates RFQ code
4. WhatsApp message sent automatically
5. Can track status in dashboard
6. Receives notification when quote submitted

## Future Enhancements

### 1. Interactive Buttons
- "Accept Quote" button
- "Request More Info" button
- "View Photos" button
- Requires WhatsApp Business API upgrade

### 2. Status Updates
- Automatic status updates to tenants
- "Your incident is now assigned"
- "Quote received from [Provider]"
- "Work completed"

### 3. Two-Way Conversations
- Tenant can ask questions
- Service provider can request clarification
- Context-aware responses

### 4. Message Templates
- Pre-defined templates for common scenarios
- Localization support
- Brand consistency

### 5. Analytics
- Response rates by channel
- Average response time
- Quote acceptance rates
- Provider performance metrics

## Testing Strategy

### Unit Tests
- RFQ code generation uniqueness
- Message parsing accuracy
- Code validation logic

### Integration Tests
- Webhook processing end-to-end
- Quote submission flow
- Incident submission flow

### Manual Testing
- Send test WhatsApp messages
- Verify webhook receives messages
- Test various message formats
- Test error scenarios

## Deployment Checklist

- [ ] Twilio WhatsApp Business number approved
- [ ] Webhook URL configured in Twilio
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Webhook route deployed and accessible
- [ ] Test messages sent and verified
- [ ] Error monitoring set up
- [ ] Rate limiting configured

## Cost Considerations

**Twilio Pricing (WhatsApp):**
- $0.005 per message (outbound)
- $0.005 per message (inbound)
- Media messages: Additional cost
- Monthly fees for business number

**Estimated Monthly Cost:**
- 100 incidents/month: ~$1
- 200 RFQs/month: ~$2
- 100 quote submissions/month: ~$0.50
- **Total: ~$3.50/month** (excluding media)

## Conclusion

The WhatsApp integration architecture is well-designed and mostly implemented. The code-based system provides a low-touch experience for both tenants and service providers while maintaining security and tracking capabilities. The multi-channel approach ensures flexibility and redundancy.

**Next Steps:**
1. Complete incident submission webhook routing
2. Implement AI-powered message parsing for incidents
3. Add interactive buttons (optional)
4. Set up monitoring and analytics
5. Deploy and test with real users

