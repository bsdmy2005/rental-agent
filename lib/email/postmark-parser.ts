export interface PostmarkWebhookPayload {
  MessageID: string
  From: string
  FromName?: string
  FromFull?: {
    Email?: string
    Name?: string
    MailboxHash?: string
  }
  To?: string // May be "Name" <email@domain.com> format
  ToFull?: Array<{ Email?: string; MailboxHash?: string; Name?: string }>
  Recipient?: string // Alternative field name Postmark might use
  OriginalRecipient?: string
  Subject?: string
  Date?: string // Postmark sends Date field
  ReceivedAt?: string // May be missing
  Attachments?: Array<{
    Name: string
    Content: string
    ContentType: string
    ContentLength?: number
    ContentID?: string
  }>
  TextBody?: string // Email body as plain text
  HtmlBody?: string // Email body as HTML
  // Additional Postmark fields that might be present
  [key: string]: unknown
}

export interface ParsedAttachment {
  name: string
  content: Buffer
  contentType: string
  size: number
}

/**
 * Parse Postmark webhook payload and extract PDF attachments
 */
export function parsePostmarkWebhook(payload: PostmarkWebhookPayload): {
  messageId: string
  from: string
  to: string
  subject?: string
  receivedAt: Date
  pdfAttachments: ParsedAttachment[]
} {
  console.log("[Email Parser] Parsing Postmark webhook payload...")
  const pdfAttachments: ParsedAttachment[] = []

  if (payload.Attachments) {
    console.log(`[Email Parser] Found ${payload.Attachments.length} attachment(s)`)
    for (const attachment of payload.Attachments) {
      // Only process PDF attachments
      if (
        attachment.ContentType === "application/pdf" ||
        attachment.Name.toLowerCase().endsWith(".pdf")
      ) {
        try {
          // According to Postmark docs, Content should contain base64-encoded data
          // However, some webhook configurations might not include content
          if (!attachment.Content || attachment.Content.trim() === "") {
            console.warn(`[Email Parser] ⚠ PDF attachment ${attachment.Name} has no content in webhook payload`)
            console.log(`[Email Parser]   ContentLength: ${attachment.ContentLength}`)
            console.log(`[Email Parser]   ContentID: ${attachment.ContentID || "(none)"}`)
            console.log(`[Email Parser]   Note: Check Postmark webhook configuration - attachments should include Content`)
            console.log(`[Email Parser]   For now, skipping attachment without content`)
            // Skip attachments without content
            continue
          }
          
          // Decode base64 content (Postmark sends base64-encoded content)
          let content: Buffer
          try {
            content = Buffer.from(attachment.Content, "base64")
          } catch (decodeError) {
            console.error(`[Email Parser] ✗ Failed to decode base64 content for ${attachment.Name}:`, decodeError)
            // Try as raw buffer if base64 decode fails
            content = Buffer.from(attachment.Content)
          }
          
          if (content.length === 0) {
            console.warn(`[Email Parser] ⚠ PDF attachment ${attachment.Name} decoded to empty buffer`)
            console.log(`[Email Parser]   Expected size: ${attachment.ContentLength}, Actual: ${content.length}`)
            continue
          }
          
          // Validate content length matches expected
          if (attachment.ContentLength && content.length !== attachment.ContentLength) {
            console.warn(`[Email Parser] ⚠ Size mismatch for ${attachment.Name}`)
            console.log(`[Email Parser]   Expected: ${attachment.ContentLength}, Actual: ${content.length}`)
            // Continue anyway - content might still be valid
          }
          
          pdfAttachments.push({
            name: attachment.Name,
            content,
            contentType: attachment.ContentType,
            size: attachment.ContentLength || content.length
          })
          console.log(`[Email Parser] ✓ Parsed PDF attachment: ${attachment.Name} (${content.length} bytes)`)
        } catch (error) {
          console.error(`[Email Parser] ✗ Failed to process attachment ${attachment.Name}:`, error)
          if (error instanceof Error) {
            console.error(`[Email Parser]   Error: ${error.message}`)
          }
        }
      } else {
        console.log(`[Email Parser] ⊘ Skipping non-PDF attachment: ${attachment.Name} (${attachment.ContentType})`)
      }
    }
  } else {
    console.log("[Email Parser] No attachments found in email")
  }

  // Handle recipient email extraction
  // When emails are forwarded to Postmark inbound address, the To field will be the Postmark address
  // Strategy:
  // 1. If To is Postmark inbound address, use From field (person forwarding = user)
  // 2. Check MailboxHash in ToFull for routing (if configured)
  // 3. Extract from email body as fallback
  let recipientEmail = ""
  
  // Extract email from To field (may be "Name" <email@domain.com> format)
  let toEmail = payload.To || payload.Recipient || payload.OriginalRecipient || ""
  if (toEmail.includes("<") && toEmail.includes(">")) {
    const match = toEmail.match(/<([^>]+)>/)
    if (match && match[1]) {
      toEmail = match[1]
    }
  }
  
  // Check if To is a Postmark inbound address
  const isPostmarkInboundAddress = toEmail.includes("@inbound.postmarkapp.com")
  
  if (isPostmarkInboundAddress) {
    console.log("[Email Parser] Detected Postmark inbound address:", toEmail)
    
    // Check MailboxHash - if configured, this can be used for routing
    // Format: hash+mailboxhash@inbound.postmarkapp.com
    const mailboxHashMatch = toEmail.match(/\+([^@]+)@inbound\.postmarkapp\.com/)
    if (mailboxHashMatch && mailboxHashMatch[1]) {
      console.log("[Email Parser] Found MailboxHash:", mailboxHashMatch[1])
      // TODO: Could use MailboxHash to route to specific users/properties
      // For now, we'll still use From field as primary recipient
    }
    
    // Primary strategy: Use From field (the person forwarding the email)
    // This is the most reliable when users forward emails to Postmark
    recipientEmail = payload.From || ""
    console.log("[Email Parser] Using From field as recipient (forwarded email):", recipientEmail)
    
    // Also check FromFull for cleaner email extraction
    if (payload.FromFull && payload.FromFull.Email) {
      recipientEmail = payload.FromFull.Email
      console.log("[Email Parser] Using FromFull.Email as recipient:", recipientEmail)
    }
    
    // Fallback: Extract from email body (look for original "To:" in forwarded message)
    if (payload.TextBody) {
      // Look for patterns like "To: <email@domain.com>" or "To: email@domain.com"
      const toMatch = payload.TextBody.match(/To:\s*<?([^\s<>@]+@[^\s<>@]+)>?/i)
      if (toMatch && toMatch[1]) {
        const bodyRecipient = toMatch[1].trim()
        console.log("[Email Parser] Found recipient in email body:", bodyRecipient)
        // Use body recipient if From doesn't look like a user email
        // (e.g., if From is a no-reply address or system email)
        if (!recipientEmail || 
            recipientEmail.includes("no-reply") || 
            recipientEmail.includes("noreply") ||
            recipientEmail.includes("do-not-reply")) {
          recipientEmail = bodyRecipient
          console.log("[Email Parser] Using body recipient (From was system email):", recipientEmail)
        }
      }
    }
  } else {
    // Normal email (not forwarded to Postmark) - use To field
    recipientEmail = toEmail
    console.log("[Email Parser] Normal email, using To field as recipient:", recipientEmail)
  }
  
  // Final fallback: Check ToFull array if still no recipient
  if (!recipientEmail && payload.ToFull && Array.isArray(payload.ToFull) && payload.ToFull.length > 0) {
    const toFullEmail = payload.ToFull[0].Email || ""
    // Only use ToFull if it's not a Postmark address
    if (toFullEmail && !toFullEmail.includes("@inbound.postmarkapp.com")) {
      recipientEmail = toFullEmail
      console.log("[Email Parser] Using ToFull[0].Email as recipient:", recipientEmail)
    }
  }
  
  if (!recipientEmail) {
    console.warn("[Email Parser] ⚠ No recipient email found in payload")
    console.log("[Email Parser] Available payload keys:", Object.keys(payload))
    console.log("[Email Parser] To field:", payload.To)
    console.log("[Email Parser] From field:", payload.From)
    console.log("[Email Parser] FromFull field:", payload.FromFull)
    console.log("[Email Parser] ToFull field:", payload.ToFull)
    console.log("[Email Parser] OriginalRecipient field:", payload.OriginalRecipient)
    console.log("[Email Parser] MailboxHash field:", payload.MailboxHash)
  } else {
    console.log("[Email Parser] ✓ Final recipient email:", recipientEmail)
  }

  // Handle Date field (Postmark sends Date instead of ReceivedAt)
  // Date format can be: "Thu, 18 Dec 2025 19:34:35 +0200" or ISO format
  let receivedAt: Date
  if (payload.ReceivedAt) {
    receivedAt = new Date(payload.ReceivedAt)
  } else if (payload.Date) {
    // Postmark sends dates in RFC 2822 format: "Thu, 18 Dec 2025 19:34:35 +0200"
    receivedAt = new Date(payload.Date)
  } else {
    // Fallback to current time if no date provided
    receivedAt = new Date()
    console.warn("[Email Parser] ⚠ No date field found, using current time")
  }
  
  // Validate date
  if (isNaN(receivedAt.getTime())) {
    console.warn("[Email Parser] ⚠ Invalid date, using current time")
    console.log("[Email Parser]   Date value was:", payload.Date || payload.ReceivedAt)
    receivedAt = new Date()
  }

  const parsed = {
    messageId: payload.MessageID,
    from: payload.From,
    to: recipientEmail,
    subject: payload.Subject,
    receivedAt,
    pdfAttachments
  }

  console.log("[Email Parser] Parsed email data:", {
    messageId: parsed.messageId,
    from: parsed.from,
    to: parsed.to || "(missing)",
    subject: parsed.subject || "(no subject)",
    receivedAt: parsed.receivedAt.toISOString(),
    pdfCount: parsed.pdfAttachments.length
  })

  return parsed
}

/**
 * Match email to extraction rules based on email filters
 * Rules are matched by output type flags (extractForInvoice, extractForPayment)
 */
export function matchEmailToRules(
  from: string,
  subject: string | undefined,
  rules: Array<{
    id: string
    emailFilter: Record<string, unknown> | null
    propertyId: string | null
    billType: string
    extractForInvoice: boolean
    extractForPayment: boolean
  }>
): {
  invoiceRule: typeof rules[0] | null
  paymentRule: typeof rules[0] | null
} {
  console.log("[Email Rule Matcher] ==========================================")
  console.log("[Email Rule Matcher] Matching email to rules...")
  console.log("[Email Rule Matcher] Email from:", from)
  console.log("[Email Rule Matcher] Email subject:", subject || "(no subject)")
  console.log("[Email Rule Matcher] Total rules to check:", rules.length)

  let invoiceRule: typeof rules[0] | null = null
  let paymentRule: typeof rules[0] | null = null

  // Sort rules by specificity (property-specific first)
  // Note: All rules are now property-specific, but keeping sort for consistency
  const sortedRules = [...rules].sort((a, b) => {
    if (a.propertyId && !b.propertyId) return -1
    if (!a.propertyId && b.propertyId) return 1
    return 0
  })

  for (let i = 0; i < sortedRules.length; i++) {
    const rule = sortedRules[i]
    console.log(`[Email Rule Matcher] Checking rule ${i + 1}/${sortedRules.length}:`, {
      ruleId: rule.id,
      propertyId: rule.propertyId || "(no property)",
      billType: rule.billType,
      extractForInvoice: rule.extractForInvoice,
      extractForPayment: rule.extractForPayment,
      hasEmailFilter: !!rule.emailFilter
    })

    if (!rule.emailFilter) {
      console.log(`[Email Rule Matcher]   ⊘ Rule ${i + 1} has no email filter, skipping`)
      continue
    }

    const emailFilter = rule.emailFilter as {
      from?: string
      subject?: string
    }

    console.log(`[Email Rule Matcher]   Email filter:`, {
      from: emailFilter.from || "(any)",
      subject: emailFilter.subject || "(any)"
    })

    // Check from filter
    let fromMatch = true
    if (emailFilter.from) {
      const fromPattern = emailFilter.from.toLowerCase()
      const fromLower = from.toLowerCase()
      // Support exact match or contains match
      fromMatch = fromLower === fromPattern || fromLower.includes(fromPattern)
      console.log(`[Email Rule Matcher]   From check: "${fromLower}" ${fromMatch ? "✓ matches" : "✗ doesn't match"} "${fromPattern}"`)
      if (!fromMatch) {
        console.log(`[Email Rule Matcher]   ⊘ Rule ${i + 1} failed from filter, skipping`)
        continue
      }
    }

    // Check subject filter
    let subjectMatch = true
    if (emailFilter.subject && subject) {
      const subjectPattern = emailFilter.subject.toLowerCase()
      const subjectLower = subject.toLowerCase()
      subjectMatch = subjectLower.includes(subjectPattern)
      console.log(`[Email Rule Matcher]   Subject check: "${subjectLower}" ${subjectMatch ? "✓ matches" : "✗ doesn't match"} "${subjectPattern}"`)
      if (!subjectMatch) {
        console.log(`[Email Rule Matcher]   ⊘ Rule ${i + 1} failed subject filter, skipping`)
        continue
      }
    } else if (emailFilter.subject && !subject) {
      console.log(`[Email Rule Matcher]   ⊘ Rule ${i + 1} requires subject but email has none, skipping`)
      continue
    }

    // Match found - assign to appropriate output type
    // A single rule can extract for both purposes
    if (rule.extractForInvoice && !invoiceRule) {
      invoiceRule = rule
      console.log(`[Email Rule Matcher]   ✓ Rule ${i + 1} matched for INVOICE extraction`)
    }
    if (rule.extractForPayment && !paymentRule) {
      paymentRule = rule
      console.log(`[Email Rule Matcher]   ✓ Rule ${i + 1} matched for PAYMENT extraction`)
    }

    // If both rules found (can be same rule), we can stop
    if (invoiceRule && paymentRule) {
      console.log(`[Email Rule Matcher]   ✓ Both invoice and payment rules found, stopping search`)
      break
    }
  }

  console.log("[Email Rule Matcher] Final matches:")
  console.log("[Email Rule Matcher]   Invoice rule:", invoiceRule ? `ID ${invoiceRule.id} (${invoiceRule.billType})` : "none")
  console.log("[Email Rule Matcher]   Payment rule:", paymentRule ? `ID ${paymentRule.id} (${paymentRule.billType})` : "none")
  console.log("[Email Rule Matcher] ==========================================")

  return { invoiceRule, paymentRule }
}

