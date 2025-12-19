# Implementation Summary: Sample PDF Upload & Rule Testing UI

## What Was Implemented

### 1. Database Schema
- **`rule_samples` table**: Stores sample PDFs linked to extraction rules
  - Fields: `id`, `extractionRuleId`, `fileName`, `fileUrl`, `uploadedAt`, `createdAt`
  - Cascade delete when rule is deleted

### 2. Backend Components

#### Actions (`actions/rule-samples-actions.ts`)
- `createRuleSampleAction`: Upload and store sample PDF
- `deleteRuleSampleAction`: Delete a sample PDF
- `testRuleAgainstSampleAction`: Test extraction rule against a sample PDF

#### Queries (`queries/rule-samples-queries.ts`)
- `getRuleSampleByIdQuery`: Get single sample by ID
- `getRuleSamplesByRuleIdQuery`: Get all samples for a rule

#### API Routes
- `POST /api/rules/[ruleId]/samples/upload`: Upload sample PDFs
- `POST /api/rules/[ruleId]/test`: Test rule against a sample

### 3. Frontend Components

#### Sample Upload Component (`app/(authenticated)/dashboard/rules/_components/sample-upload.tsx`)
- File input with PDF validation
- Multiple file selection
- File preview before upload
- Upload progress indication
- Success/error notifications

#### Rule Tester Component (`app/(authenticated)/dashboard/rules/_components/rule-tester.tsx`)
- List of uploaded samples
- Test button for each sample
- Display extraction results:
  - Invoice extraction data (if invoice_generation rule)
  - Payment extraction data (if payment_processing rule)
  - Error messages if extraction fails
- Visual indicators (success/error badges)

#### Rule Detail Page (`app/(authenticated)/dashboard/rules/[ruleId]/page.tsx`)
- Rule information display
- Sample upload section
- Rule testing section
- Rule configuration display
- Navigation back to rules list

### 4. Updated Components
- **Extraction Rules List**: Added "Test Rule" link to each rule
- **Rule Builder**: Already includes purpose selection (from previous implementation)

## How to Use

### Testing Rules with Sample PDFs

1. **Navigate to Rules Page**: `/dashboard/rules`

2. **Create or Select a Rule**: 
   - Create a new rule or click "Test Rule" on an existing rule

3. **Upload Sample PDFs**:
   - On the rule detail page, use the "Upload Sample PDFs" section
   - Select one or more PDF files
   - Click "Upload Sample(s)"
   - Wait for upload confirmation

4. **Test the Rule**:
   - In the "Test Rule Against Samples" section
   - Click "Test" next to any uploaded sample
   - Review the extracted data:
     - **Invoice Generation rules**: Shows `tenantChargeableItems` array
     - **Payment Processing rules**: Shows `landlordPayableItems` array
   - Check for errors if extraction fails

5. **Refine Rule**:
   - If extraction doesn't match expectations, update the extraction config
   - Re-test against samples
   - Iterate until results are accurate

## Testing Document Processing

### Manual PDF Upload Test

1. **Prerequisites**:
   - At least one property created
   - At least one extraction rule created (matching property and bill type)

2. **Upload a Bill**:
   - Go to `/dashboard/bills`
   - Select property and bill type
   - Choose a PDF file
   - Click "Upload Bill"

3. **Monitor Processing**:
   - Bill status: `pending` → `processing` → `processed` (or `error`)
   - Check server logs for detailed processing information
   - View bill in the list to see status

4. **Verify Extraction**:
   - Check database or logs for `invoiceExtractionData` and `paymentExtractionData`
   - Verify data matches expected structure

### Email Processing Test

#### Option 1: Test Endpoint (Development)

1. **Set up test user** with email address

2. **Create email extraction rule** with email filters

3. **Convert PDF to base64**:
   ```bash
   base64 -i your-bill.pdf > bill-base64.txt
   ```

4. **Send test request**:
   ```bash
   curl -X POST http://localhost:3000/api/test/email-webhook \
     -H "Content-Type: application/json" \
     -d @test-email-payload.json
   ```

   Where `test-email-payload.json` contains:
   ```json
   {
     "MessageID": "test-123",
     "From": "bills@test.com",
     "To": "your-user-email@example.com",
     "Subject": "Test Bill",
     "ReceivedAt": "2024-01-01T00:00:00Z",
     "Attachments": [
       {
         "Name": "bill.pdf",
         "Content": "<paste-base64-here>",
         "ContentType": "application/pdf",
         "ContentLength": 12345
       }
     ]
   }
   ```

5. **Verify**: Check `/dashboard/bills` for the new bill

#### Option 2: Postmark Webhook (Production)

1. **Configure Postmark webhook**:
   - URL: `https://your-domain.com/api/webhooks/postmark`
   - Event: Inbound emails
   - Secret: Set in `.env.local` as `POSTMARK_WEBHOOK_SECRET`

2. **Forward email** with PDF attachment to Postmark inbound address

3. **Verify**: Check `/dashboard/bills` for processed bills

## File Structure

```
app/(authenticated)/dashboard/rules/
├── page.tsx                          # Rules list page
├── [ruleId]/
│   └── page.tsx                      # Rule detail & testing page
└── _components/
    ├── rule-builder.tsx              # Rule creation form
    ├── extraction-rules-list.tsx    # Rules list display
    ├── sample-upload.tsx            # Sample PDF upload component
    └── rule-tester.tsx              # Rule testing component

app/api/rules/
└── [ruleId]/
    ├── samples/upload/route.ts      # Sample upload endpoint
    └── test/route.ts                # Rule test endpoint

actions/
└── rule-samples-actions.ts          # Sample & testing actions

queries/
└── rule-samples-queries.ts          # Sample queries

db/schema/
└── rule-samples.ts                  # Rule samples schema
```

## Environment Variables Required

Make sure these are set in `.env.local`:

```env
# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# OpenAI
OPENAI_API_KEY=xxx

# Postmark (optional, for email processing)
POSTMARK_WEBHOOK_SECRET=xxx
```

## Database Migration

The user has already run the migration. The `rule_samples` table should exist with:
- `id` (uuid, primary key)
- `extraction_rule_id` (uuid, foreign key to extraction_rules)
- `file_name` (text)
- `file_url` (text)
- `uploaded_at` (timestamp)
- `created_at` (timestamp)

## Next Steps

1. **Test the implementation**:
   - Create a rule
   - Upload sample PDFs
   - Test extraction
   - Upload a real bill
   - Test email processing (if Postmark is configured)

2. **Monitor**:
   - Check admin dashboard for processing statistics
   - Review extraction accuracy
   - Refine rules based on results

3. **Enhancements** (optional):
   - Add sample PDF preview/download
   - Add batch testing (test all samples at once)
   - Add extraction result comparison/validation
   - Add rule versioning UI

