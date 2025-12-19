# Quick Testing Checklist

## ✅ Pre-Testing Setup

- [ ] Environment variables set in `.env.local`:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `OPENAI_API_KEY`
  - [ ] `POSTMARK_WEBHOOK_SECRET` (optional for email testing)

- [ ] Supabase storage bucket `bills` created and configured
- [ ] Database migration applied (`npx drizzle-kit push`)
- [ ] At least one property created
- [ ] User profile exists with email address

## 🧪 Test 1: Manual PDF Upload

1. [ ] Navigate to `/dashboard/bills`
2. [ ] Select a property from dropdown
3. [ ] Select bill type (municipality, levy, utility, or other)
4. [ ] Choose a PDF file
5. [ ] Click "Upload Bill"
6. [ ] Verify bill appears in list with status "pending"
7. [ ] Wait for status to change to "processing" then "processed"
8. [ ] Check server logs for any errors
9. [ ] Verify extraction data in database (if accessible)

**Expected Result**: Bill uploaded, processed, and extracted data stored

## 🧪 Test 2: Create Extraction Rule

1. [ ] Navigate to `/dashboard/rules`
2. [ ] Fill in rule form:
   - [ ] Rule Name: e.g., "Test Municipality Bill"
   - [ ] Extraction Purpose: Select "Invoice Generation" or "Payment Processing"
   - [ ] Bill Type: Select matching type
   - [ ] Channel: Select "Manual Upload"
   - [ ] Extraction Config: Enter valid JSON
3. [ ] Click "Create Rule"
4. [ ] Verify rule appears in list

**Expected Result**: Rule created and visible in list

## 🧪 Test 3: Upload Sample PDFs & Test Rule

1. [ ] Navigate to `/dashboard/rules/[ruleId]` (click "Test Rule" on a rule)
2. [ ] In "Upload Sample PDFs" section:
   - [ ] Select a PDF file
   - [ ] Click "Upload Sample(s)"
   - [ ] Verify success message
3. [ ] In "Test Rule Against Samples" section:
   - [ ] Click "Test" button next to uploaded sample
   - [ ] Wait for processing
   - [ ] Review extracted data:
     - [ ] Invoice rules: Should show `tenantChargeableItems` array
     - [ ] Payment rules: Should show `landlordPayableItems` array
   - [ ] Verify data structure matches expectations

**Expected Result**: Sample uploaded, rule tested, extraction results displayed

## 🧪 Test 4: Email Processing (Development)

1. [ ] Create an email extraction rule:
   - [ ] Channel: "Email Forward"
   - [ ] Email From: e.g., `test@example.com` (optional)
   - [ ] Email Subject: e.g., `Test` (optional)
2. [ ] Convert a PDF to base64:
   ```bash
   base64 -i test-bill.pdf > bill-base64.txt
   ```
3. [ ] Create test payload file `test-payload.json`:
   ```json
   {
     "MessageID": "test-123",
     "From": "test@example.com",
     "To": "your-user-email@example.com",
     "Subject": "Test Bill",
     "ReceivedAt": "2024-01-01T00:00:00Z",
     "Attachments": [
       {
         "Name": "bill.pdf",
         "Content": "<paste-base64-from-bill-base64.txt>",
         "ContentType": "application/pdf",
         "ContentLength": 12345
       }
     ]
   }
   ```
4. [ ] Send test request:
   ```bash
   curl -X POST http://localhost:3000/api/test/email-webhook \
     -H "Content-Type: application/json" \
     -d @test-payload.json
   ```
5. [ ] Check `/dashboard/bills` for new bill
6. [ ] Verify bill was processed

**Expected Result**: Email processed, bill created, extraction performed

## 🧪 Test 5: Dual-Purpose Extraction

1. [ ] Create two rules for the same property:
   - [ ] Rule 1: Purpose = "Invoice Generation", Bill Type = "levy"
   - [ ] Rule 2: Purpose = "Payment Processing", Bill Type = "levy"
2. [ ] Upload a bill PDF (should match both rules)
3. [ ] Check database for both `invoiceExtractionData` and `paymentExtractionData`
4. [ ] Verify both contain relevant extracted data

**Expected Result**: Single PDF processed with both rules, both extraction results stored

## 🔍 Verification Points

### Check Server Logs
- Look for OpenAI API calls
- Check for Supabase storage operations
- Verify extraction results
- Monitor for errors

### Check Database
```sql
-- Check bills
SELECT id, file_name, status, invoice_extraction_data, payment_extraction_data 
FROM bills 
ORDER BY created_at DESC 
LIMIT 5;

-- Check rule samples
SELECT id, file_name, extraction_rule_id 
FROM rule_samples 
ORDER BY uploaded_at DESC;

-- Check extraction rules
SELECT id, name, purpose, is_active 
FROM extraction_rules;
```

### Check Admin Dashboard
- Navigate to `/dashboard/admin`
- Review system statistics
- Check processing success rate
- View recent bills and failed bills

## 🐛 Common Issues & Solutions

### Issue: Bills stuck in "processing" status
**Solution**: 
- Check OpenAI API key is valid
- Verify PDF is accessible from Supabase
- Check server logs for errors
- Ensure OpenAI API has sufficient credits

### Issue: Extraction returns empty data
**Solution**:
- Verify extraction config JSON is valid
- Check if field mappings match PDF content
- Try simpler extraction config
- Test with a known-good PDF

### Issue: Sample upload fails
**Solution**:
- Verify Supabase storage bucket exists
- Check `SUPABASE_SERVICE_ROLE_KEY` has write access
- Verify file size < 10MB
- Check file is valid PDF

### Issue: Email webhook not working
**Solution**:
- Verify webhook URL is accessible
- Check Postmark webhook configuration
- Verify `POSTMARK_WEBHOOK_SECRET` matches
- Use test endpoint for local testing

## 📊 Success Criteria

- ✅ Can upload PDFs manually
- ✅ Bills are processed automatically
- ✅ Extraction rules can be created
- ✅ Sample PDFs can be uploaded
- ✅ Rules can be tested against samples
- ✅ Extraction results are displayed correctly
- ✅ Email processing works (if Postmark configured)
- ✅ Dual-purpose extraction works
- ✅ Admin dashboard shows statistics

