/**
 * Message formatter for converting email content to WhatsApp-friendly text
 */

export interface RfqMessageData {
  title: string
  description: string
  propertyName: string
  propertyAddress: string
  tenantName?: string
  notes?: string
  dueDate?: Date
  rfqCode?: string
  onlineSubmissionUrl?: string
  attachmentCount?: number
  priority?: string
}

/**
 * Format RFQ message for WhatsApp
 * Converts email HTML/text content to WhatsApp-friendly plain text
 */
export function formatRfqMessageForWhatsApp(data: RfqMessageData): string {
  const {
    title,
    description,
    propertyName,
    propertyAddress,
    tenantName,
    notes,
    dueDate,
    rfqCode,
    onlineSubmissionUrl,
    attachmentCount = 0,
    priority
  } = data

  let message = `🔧 *Quote Request*\n\n`

  // Title
  if (title) {
    message += `*${title}*\n\n`
  }

  // Property details
  message += `*Property:* ${propertyName}\n`
  message += `*Address:* ${propertyAddress}\n\n`

  // Priority if available
  if (priority) {
    message += `*Priority:* ${priority}\n`
  }

  // Tenant if available
  if (tenantName) {
    message += `*Tenant:* ${tenantName}\n`
  }

  // Description
  message += `\n*Details:*\n${description}\n\n`

  // Additional notes
  if (notes) {
    message += `*Additional Notes:*\n${notes}\n\n`
  }

  // Due date
  if (dueDate) {
    message += `*Quote Due Date:* ${new Date(dueDate).toLocaleDateString()}\n\n`
  }

  // Attachments
  if (attachmentCount > 0) {
    message += `📎 *Attachments:* ${attachmentCount} file(s)\n\n`
  }

  // Response instructions
  message += `*How to Respond:*\n`
  message += `Please reply with:\n`
  message += `• Your quote amount (e.g., R 1,500.00)\n`
  message += `• Description of work to be performed\n`
  message += `• Estimated completion date (if available)\n\n`

  // RFQ code and online submission
  if (rfqCode && onlineSubmissionUrl) {
    message += `*Or submit online:*\n`
    message += `${onlineSubmissionUrl}\n\n`
    message += `*RFQ Code:* ${rfqCode}\n`
  } else if (rfqCode) {
    message += `*RFQ Code:* ${rfqCode}\n`
  }

  message += `\nThank you for your service.`

  return message
}

/**
 * Format incident confirmation message for WhatsApp
 */
export function formatIncidentConfirmationMessage(
  incidentId: string,
  referenceNumber: string,
  propertyName: string
): string {
  return `✅ *Incident Logged Successfully*\n\n` +
    `*Reference:* ${referenceNumber}\n` +
    `*Property:* ${propertyName}\n\n` +
    `Your incident has been logged and will be reviewed by the property manager. You may be contacted for additional information if needed.\n\n` +
    `Thank you for reporting this issue.`
}

/**
 * Format error message for WhatsApp
 */
export function formatErrorMessage(error: string): string {
  return `❌ *Error*\n\n${error}\n\nPlease try again or contact support if the issue persists.`
}

/**
 * Format help message for incident submission
 */
export function formatIncidentHelpMessage(): string {
  return `📋 *How to Report an Incident*\n\n` +
    `Send a message in one of these formats:\n\n` +
    `*Format 1 (with Property Code):*\n` +
    `PROP-ABC123\n` +
    `Title: [Your title]\n` +
    `Description: [Your description]\n\n` +
    `*Format 2 (simple):*\n` +
    `Property: PROP-ABC123\n` +
    `Issue: [Brief description]\n` +
    `Details: [Full details]\n\n` +
    `*Note:* If you don't have a property code, we'll try to match your phone number to your property.`
}

