# Testing Guide: Document Processing & Email Processing

This guide will help you test the document processing functionality, including email processing via Postmark webhooks and manual PDF uploads.

## Prerequisites

1. **Environment Variables Setup**
   - Ensure `.env.local` has all required variables:
     ```env
     # Supabase Storage
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

     # OpenAI
     OPENAI_API_KEY=your_openai_api_key

     # Postmark (for email processing)
     POSTMARK_WEBHOOK_SECRET=your_webhook_secret
     ```

2. **Supabase Storage Bucket**
   - Create a storage bucket named `bills` in your Supabase project
   - Set appropriate permissions (public read, authenticated write)

3. **Database Migration**
   - Run `npx drizzle-kit push` to apply schema changes
   - Ensure all tables are created: `extraction_rules`, `bills`, `rule_samples`, etc.

## Testing Manual PDF Upload

### Step 1: Create a Property
1. Navigate to `/dashboard/properties/add`
2. Fill in property details (name, address, type)
3. Save the property

### Step 2: Create an Extraction Rule
1. Navigate to `/dashboard/rules`
2. Fill in the rule form:
   - **Rule Name**: e.g., "Municipality Bill Extraction"
   - **Extraction Purpose**: Choose "Invoice Generation" or "Payment Processing"
   - **Bill Type**: Select appropriate type (municipality, levy, utility, other)
   - **Channel**: Select "Manual Upload"
   - **Extraction Config**: Enter JSON configuration, for example:
     ```json
     {
       "fieldMappings": {
         "water": {
           "label": "Water Charges",
           "patterns": ["water", "water charges"],
           "extractUsage": true
         },
         "electricity": {
           "label": "Electricity",
           "patterns": ["electricity", "power"],
           "extractUsage": true
         }
       }
     }
     ```
3. Click "Create Rule"

### Step 3: Upload a Sample PDF (Optional - for Testing)
1. Navigate to `/dashboard/rules/[ruleId]` (click "Test Rule" on a rule)
2. In the "Upload Sample PDFs" section, select a PDF file
3. Click "Upload Sample(s)"
4. Wait for upload to complete

### Step 4: Test the Rule Against Sample
1. In the "Test Rule Against Samples" section, click "Test" next to a sample
2. Review the extracted data:
   - **Invoice Generation**: Should show `tenantChargeableItems` array
   - **Payment Processing**: Should show `landlordPayableItems` array
3. Verify the extracted data matches expected values

### Step 5: Upload a Bill Manually
1. Navigate to `/dashboard/bills`
2. Select a property from the dropdown
3. Select bill type
4. Choose a PDF file
5. Click "Upload Bill"
6. The bill should appear in the list with status "pending" → "processing" → "processed"
7. Click on the bill to view extracted data

## Testing Email Processing (Postmark Webhook)

### Option 1: Test Endpoint (Development Only)

For local testing without Postmark setup:

1. **Create a test user** with an email address (e.g., `test@example.com`)
2. **Create an Email Extraction Rule**:
   - Navigate to `/dashboard/rules`
   - Create a new rule with:
     - **Channel**: "Email Forward"
     - **Email From**: e.g., `bills@test.com` (optional)
     - **Email Subject Contains**: e.g., `Test Bill` (optional)
     - **Extraction Purpose**: Choose based on what you want to extract
     - **Extraction Config**: Configure field mappings

3. **Convert a PDF to Base64**:
   ```bash
   # On Mac/Linux:
   base64 -i your-bill.pdf
   
   # Or use an online tool to convert PDF to base64
   ```

4. **Send a test request**:
   ```bash
   curl -X POST http://localhost:3000/api/test/email-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "MessageID": "test-123",
       "From": "bills@test.com",
       "To": "test@example.com",
       "Subject": "Test Bill",
       "ReceivedAt": "2024-01-01T00:00:00Z",
       "Attachments": [
         {
           "Name": "bill.pdf",
           "Content": "<paste-base64-encoded-pdf-here>",
           "ContentType": "application/pdf",
           "ContentLength": 12345
         }
       ]
     }'
   ```

5. **Verify Processing**:
   - Check `/dashboard/bills` for the new bill
   - Check server logs for processing status

### Option 2: Postmark Webhook (Production)

1. **Set Up Postmark Webhook**:
   - Log into your Postmark account
   - Go to your server settings
   - Add a webhook URL: `https://3d3709493bd9.ngrok.app/api/webhooks/postmark`
   - Configure webhook to send on "Inbound" events
   - Save the webhook secret to `.env.local` as `POSTMARK_WEBHOOK_SECRET`

2. **Create an Email Extraction Rule**:
   - Navigate to `/dashboard/rules`
   - Create a new rule with:
     - **Channel**: "Email Forward"
     - **Email From**: e.g., `bills@cityofjhb.gov.za` (optional)
     - **Email Subject Contains**: e.g., `Municipality Bill` (optional)
     - **Extraction Purpose**: Choose based on what you want to extract
     - **Extraction Config**: Configure field mappings

3. **Forward an Email with PDF Attachment**:
   - Send an email to your Postmark inbound address with:
     - PDF attachment(s)
     - Subject/From matching your rule filters (if configured)
   - Postmark will forward the email to your webhook endpoint
   - Check the application logs for processing status

4. **Verify Email Processing**:
   - Navigate to `/dashboard/bills`
   - Look for bills created from the email
   - Check bill status (should be "processed" if successful)
   - View extracted data in the bill details

## Testing Dual-Purpose Extraction

### Scenario: Body Corporate Statement with Both Types of Data

1. **Create Two Rules for the Same Property**:
   - Rule 1: Purpose = "Invoice Generation", Bill Type = "levy"
   - Rule 2: Purpose = "Payment Processing", Bill Type = "levy"

2. **Upload a Body Corporate Statement PDF**:
   - The system should process it with both rules
   - Check `invoiceExtractionData` for tenant-chargeable items (water, electricity)
   - Check `paymentExtractionData` for landlord-payable items (levies, fees)

3. **Verify Results**:
   - Navigate to `/dashboard/bills/[billId]` (if detail page exists)
   - Or check the database directly:
     ```sql
     SELECT invoice_extraction_data, payment_extraction_data 
     FROM bills 
     WHERE id = 'your-bill-id';
     ```

## Troubleshooting

### Bills Stuck in "Processing" Status
- Check server logs for OpenAI API errors
- Verify `OPENAI_API_KEY` is set correctly
- Check if PDF file is accessible from Supabase storage

### Email Webhook Not Working
- Verify webhook URL is accessible (use ngrok for local testing)
- Check Postmark webhook logs
- Verify `POSTMARK_WEBHOOK_SECRET` matches Postmark configuration
- Check server logs for webhook processing errors

### Extraction Returns Empty Data
- Verify extraction config JSON is valid
- Check if field mappings match PDF content
- Review OpenAI API response in logs
- Try testing with a simpler extraction config

### Supabase Storage Errors
- Verify bucket exists and is named `bills`
- Check bucket permissions
- Verify `SUPABASE_SERVICE_ROLE_KEY` has write access
- Check file size limits (max 10MB)

## Local Testing with ngrok (for Email Webhooks)

1. Install ngrok: `brew install ngrok` (Mac) or download from ngrok.com
2. Start your Next.js dev server: `npm run dev`
3. In another terminal, run: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Set Postmark webhook URL to: `https://3d3709493bd9.ngrok.app/api/webhooks/postmark`
6. Forward test emails to your Postmark inbound address

## Expected Behavior

### Successful Bill Processing
1. Bill created with status "pending"
2. Status changes to "processing"
3. PDF uploaded to OpenAI Files API
4. Extraction performed using Responses API
5. Data stored in `invoiceExtractionData` and/or `paymentExtractionData`
6. Status changes to "processed"

### Successful Rule Testing
1. Sample PDF uploaded to Supabase
2. Test button triggers extraction
3. Results displayed showing:
   - Extracted invoice data (if invoice_generation rule)
   - Extracted payment data (if payment_processing rule)
   - Any errors encountered

## Next Steps After Testing

Once testing is complete:
1. Review extracted data accuracy
2. Refine extraction rules based on results
3. Add more sample PDFs for comprehensive testing
4. Set up production Postmark webhook
5. Monitor processing success rate in admin dashboard

