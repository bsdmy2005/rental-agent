# Browser Execution Architecture

## Overview

The lane-based email processing system uses headless browsers (Playwright) to interact with secure portals that require PIN authentication. This document explains how browsers are executed and what infrastructure considerations are needed.

## Browser Execution Model

### Where Browsers Run

**Browsers run on the Next.js server** where your application is deployed. Specifically:

- **Server-Side Execution**: All browser automation happens in server actions (`"use server"`), not in the browser
- **Headless Mode**: Browsers run in headless mode by default (no GUI), controlled by `BROWSER_HEADLESS=true`
- **Per-Request Isolation**: Each email processing request launches its own browser instance, which is closed after processing

### Execution Flow

```
Email Received (Postmark Webhook)
    ↓
Server Action (processEmailWebhookAction)
    ↓
Lane Decision (Lane 3 selected)
    ↓
Browser Launched (Playwright)
    ├─ Navigate to URL
    ├─ Enter PIN
    ├─ Download PDF
    └─ Browser Closed
    ↓
PDF Processed (existing pipeline)
```

## Infrastructure Requirements

### 1. Server Resources

**CPU & Memory**:
- Each browser instance uses ~100-200MB RAM
- CPU usage spikes during page rendering
- **Recommendation**: Ensure server has at least 2GB RAM available for browser operations

**Disk Space**:
- Playwright browsers require ~300-500MB disk space
- Temporary PDF files are cleaned up automatically
- **Recommendation**: Ensure at least 1GB free disk space

### 2. Playwright Installation

Playwright browsers must be installed on the server:

```bash
# Install Playwright browsers (run on server)
npx playwright install chromium

# Or install all browsers
npx playwright install
```

**Note**: This is a one-time setup. The browsers are downloaded to `node_modules/.playwright/`.

### 3. Environment Variables

Add these to your `.env.local`:

```bash
# Browser Automation
BROWSER_HEADLESS=true              # Run browsers without GUI (required for servers)
BROWSER_TIMEOUT=30000              # Timeout in milliseconds (30 seconds)
BROWSER_SCREENSHOT_ON_ERROR=true   # Capture screenshots on errors (for debugging)

# Agentic Browser (Lane 3B - Future)
AGENTIC_MAX_STEPS=50               # Max steps for agentic browser
AGENTIC_MAX_TIME=120               # Max time in seconds
AGENTIC_ALLOWED_DOMAINS=system.angor.co.za,example.com  # Domain allowlist
```

## Deployment Considerations

### Vercel / Serverless Functions

**Limitations**:
- Serverless functions have execution time limits (typically 10-60 seconds)
- Browser launch adds ~2-5 seconds overhead
- Large pages may timeout

**Recommendations**:
1. Use **Vercel Pro** or higher for longer execution times
2. Consider **background jobs** (Vercel Cron or external queue) for heavy processing
3. Set appropriate timeouts: `BROWSER_TIMEOUT=25000` (leave buffer for function timeout)

### Docker / Container Deployments

**Advantages**:
- Full control over resources
- Can install system dependencies
- Better for long-running processes

**Setup**:
```dockerfile
# Install Playwright dependencies
RUN npx playwright install chromium
RUN npx playwright install-deps chromium
```

### Dedicated Server / VPS

**Best Option** for production:
- Full control over resources
- Can handle multiple concurrent browser instances
- Better performance and reliability

**Considerations**:
- Monitor memory usage (browsers are memory-intensive)
- Consider rate limiting to prevent resource exhaustion
- Use process managers (PM2, systemd) for reliability

## Concurrency & Rate Limiting

### Current Implementation

- **Sequential Processing**: One browser instance per email (no concurrent browsers)
- **Isolation**: Each browser is launched fresh and closed after use
- **No Connection Pooling**: Browsers are not reused between requests

### Scaling Considerations

For high-volume scenarios:

1. **Queue System**: Use a job queue (BullMQ, Bull, etc.) to process emails asynchronously
2. **Worker Processes**: Separate worker processes for browser operations
3. **Browser Pool**: Consider browser pooling for better performance (advanced)

## Security Considerations

### Sandboxing

- Browsers run in isolated processes
- Each browser instance is sandboxed by Playwright
- No access to local file system (except temporary downloads)

### Network Access

- Browsers can access any URL (no restrictions by default)
- **Lane 3B (Agentic)**: Uses domain allowlist for safety
- Consider firewall rules for production

### Resource Limits

- Timeout limits prevent runaway processes
- Memory limits prevent resource exhaustion
- Automatic cleanup of browser instances

## Monitoring & Debugging

### Logging

All browser operations are logged:
- Browser launch
- Navigation steps
- PIN entry
- PDF download
- Errors and timeouts

### Screenshots

When `BROWSER_SCREENSHOT_ON_ERROR=true`:
- Screenshots captured on errors
- Stored in trace data (not on disk)
- Useful for debugging selector issues

### Extraction Job Traces

Each extraction job stores detailed trace:
- Step-by-step execution
- Timestamps
- Decisions made
- Errors encountered

View traces in the database `extraction_jobs.trace` field.

## Troubleshooting

### Browser Won't Launch

**Error**: `Browser closed unexpectedly`

**Solutions**:
1. Ensure Playwright browsers are installed: `npx playwright install chromium`
2. Check server has enough memory
3. Verify `BROWSER_HEADLESS=true` is set

### Timeout Errors

**Error**: `Navigation timeout`

**Solutions**:
1. Increase `BROWSER_TIMEOUT` value
2. Check network connectivity from server
3. Verify target URL is accessible

### Selector Not Found

**Error**: `Element not found`

**Solutions**:
1. Update CSS selectors in rule configuration
2. Check if website structure changed
3. Use Lane 3B (agentic) as fallback

## Future Enhancements

### Browser Pooling

Reuse browser instances for better performance:
- Launch browsers once
- Reuse for multiple requests
- Close after inactivity

### Distributed Processing

For very high volume:
- Separate browser worker processes
- Queue-based job distribution
- Horizontal scaling

### Container Isolation

Run browsers in separate containers:
- Better isolation
- Resource limits per container
- Easier scaling

