# Lane Configuration Guide

## Overview

The lane-based email processing system allows you to configure how emails are processed. This guide explains how to set up rules with lane configuration.

## Rule Setup Changes

### What Changed?

**New Configuration Options**:
- **Preferred Lane**: Choose which processing lane to use (or let the system auto-detect)
- **Lane 2 Settings**: Configure direct download behavior (redirects, timeouts)
- **Lane 3 Settings**: Configure interactive portal automation (Playwright selectors, agentic browser settings)

### Where to Configure

When creating or editing an extraction rule:

1. **Step 1**: Basic Information (Property, Name, Bill Type, Channel)
2. **Step 2**: What to Extract (Invoice/Payment)
3. **Step 3**: Field Mappings
4. **Step 4**: Email Filters + **Lane Configuration** ← NEW!

### Lane Configuration UI

In Step 4 of the rule builder, you'll see a new section: **"Processing Lane Configuration"**

#### Preferred Lane

Choose how emails should be processed:

- **Auto (Recommended)**: System automatically selects the best lane
  - If PDF attachments → Lane 1
  - If links → Try Lane 2, escalate to Lane 3 if needed
- **Lane 1: Attachments Only**: Force attachment processing (skip links)
- **Lane 2: Direct Download**: Force direct download (skip attachments, skip browser)
- **Lane 3: Interactive Portal**: Force browser automation (skip attachments, skip direct download)

**When to specify a lane**:
- You know exactly how bills arrive (e.g., always as attachments)
- You want to skip certain processing methods
- You're debugging a specific lane

#### Lane 2 Configuration

For direct download links:

- **Follow Redirects**: Whether to follow HTTP redirects (default: enabled)
- **Max Redirects**: Maximum number of redirects to follow (default: 5)

**Use cases**:
- Links that redirect multiple times
- Shortened URLs that expand to PDFs

#### Lane 3 Configuration

For interactive portals requiring PIN authentication:

**Automation Method**:
- **Auto**: Try Playwright first, fallback to agentic if selectors fail
- **Playwright**: Use deterministic browser automation (faster, requires selectors)
- **Agentic**: Use AI-powered browser automation (slower, more resilient)

**Playwright Configuration** (if using Playwright or Auto):

CSS selectors for page elements:

- **PIN Input Selector**: Where to enter the PIN
  - Example: `input[name="pin"]`, `#pin-input`, `input[type="text"].pin-field`
- **Submit Button Selector**: Button to submit the PIN
  - Example: `button[type="submit"]`, `.submit-btn`, `button:has-text("Submit")`
- **PDF Download Selector** (Optional): Button/link to download PDF
  - Example: `a[href*=".pdf"]`, `button:has-text("Download")`
- **Wait For Selector**: Element that appears after successful login
  - Example: `.statement-content`, `#invoice-view`

**Finding Selectors**:

1. Open the portal page in your browser
2. Right-click on the element → Inspect
3. Copy the CSS selector or use browser DevTools
4. Test the selector: `document.querySelector('your-selector')` in console

**Auto-Detection**:
- If selectors are left empty, the system will try common patterns
- Less reliable but works for standard portals

**Agentic Configuration** (if using Agentic or Auto):

- **Max Steps**: Maximum actions the AI can take (default: 50)
- **Max Time**: Maximum time in seconds (default: 120)
- **Allowed Domains**: Security allowlist (comma-separated)
  - Example: `system.angor.co.za, example.com`
  - Leave empty to allow all domains (not recommended for production)

## Example Configurations

### Example 1: ANGOR Portal (Your Use Case)

**Scenario**: Email contains link to `system.angor.co.za` with PIN in email body

**Configuration**:
- **Preferred Lane**: Auto
- **Lane 3 Method**: Playwright
- **PIN Input Selector**: `input[type="text"][name*="pin" i]` or `#pin-input`
- **Submit Button Selector**: `button[type="submit"]` or `button:has-text("View")`
- **PDF Download Selector**: `a:has-text("Download")` or `button:has-text("Print")`
- **Wait For Selector**: `.statement-content` or `#statement-view`

**Agentic Fallback**:
- **Allowed Domains**: `system.angor.co.za`
- **Max Steps**: 50
- **Max Time**: 120

### Example 2: Municipality Bills (Attachments)

**Scenario**: Bills always arrive as PDF attachments

**Configuration**:
- **Preferred Lane**: Lane 1: Attachments Only
- (No Lane 2/3 config needed)

### Example 3: Direct Download Links

**Scenario**: Links point directly to PDFs (no authentication)

**Configuration**:
- **Preferred Lane**: Lane 2: Direct Download
- **Follow Redirects**: Enabled
- **Max Redirects**: 5

## Testing Your Configuration

1. **Create the rule** with your lane configuration
2. **Send a test email** that matches the rule
3. **Check extraction job trace** in the database:
   ```sql
   SELECT trace FROM extraction_jobs 
   WHERE extraction_rule_id = 'your-rule-id' 
   ORDER BY created_at DESC LIMIT 1;
   ```
4. **Review logs** for lane selection and processing steps
5. **Adjust selectors** if browser automation fails

## Troubleshooting

### Browser Automation Fails

**Symptoms**: Lane 3A fails, escalates to Lane 3B

**Solutions**:
1. Check selectors are correct (use browser DevTools)
2. Website structure may have changed
3. Try agentic mode as fallback
4. Check browser logs for specific errors

### Wrong Lane Selected

**Symptoms**: System uses wrong lane (e.g., tries direct download when portal needed)

**Solutions**:
1. Set **Preferred Lane** explicitly
2. Check email content (attachments vs links)
3. Review decision matrix logs

### Selectors Not Found

**Symptoms**: "Element not found" errors

**Solutions**:
1. Verify selectors in browser console
2. Check if website uses dynamic loading (may need wait time)
3. Use more generic selectors (e.g., `button[type="submit"]` instead of `.specific-class`)
4. Enable agentic fallback

## Best Practices

1. **Start with Auto**: Let the system auto-detect lanes first
2. **Test with real emails**: Use actual bill emails to test configuration
3. **Use specific selectors**: More specific selectors are more reliable
4. **Set domain allowlist**: Always restrict agentic browser to known domains
5. **Monitor extraction jobs**: Check trace logs to understand what's happening
6. **Iterate**: Start simple, add complexity as needed

## Migration from Old Rules

**Existing rules** will continue to work:
- Default to "Auto" lane selection
- Use default lane configurations
- No breaking changes

**To upgrade**:
1. Edit existing rules
2. Add lane configuration in Step 4
3. Save to enable new features

