/**
 * Extract PDF links from email body (HTML or text)
 */

export interface PDFLink {
  url: string
  label?: string // Link text/label from email
}

/**
 * Extract links from HTML email body
 */
function extractLinksFromHTML(htmlBody: string): PDFLink[] {
  const links: PDFLink[] = []
  
  // Match <a href="..."> tags and check both URL and link text
  const hrefRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi
  let match
  
  while ((match = hrefRegex.exec(htmlBody)) !== null) {
    const url = match[1]
    const linkText = match[2]?.trim() || ""
    
    // Check if URL is a PDF link
    if (url && isValidPDFLink(url)) {
      links.push({ url, label: linkText || undefined })
    }
    // Check if link text contains PDF filename (even if URL is a tracking link)
    else if (url && linkText && /\.pdf/i.test(linkText)) {
      // This is likely a tracking link pointing to a PDF - use link text as label
      links.push({ url, label: linkText })
      console.log(`[Link Extractor] Found PDF link via link text: "${linkText}" -> ${url.substring(0, 100)}...`)
    }
    // Check if URL contains PDF filename patterns (even if it's a redirect/tracking link)
    else if (url && containsPDFFilename(url)) {
      links.push({ url })
      console.log(`[Link Extractor] Found PDF link via URL pattern: ${url.substring(0, 100)}...`)
    }
  }
  
  // Also match <a> tags without closing tag (self-closing or malformed)
  const hrefRegex2 = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi
  let match2
  while ((match2 = hrefRegex2.exec(htmlBody)) !== null) {
    const url = match2[1]
    if (url && isValidPDFLink(url) && !links.some(l => l.url === url)) {
      links.push({ url })
    } else if (url && containsPDFFilename(url) && !links.some(l => l.url === url)) {
      links.push({ url })
    }
  }
  
  // Also check for direct URLs in the HTML content
  const urlRegex = /https?:\/\/[^\s<>"']+\.pdf/gi
  let urlMatch
  while ((urlMatch = urlRegex.exec(htmlBody)) !== null) {
    const url = urlMatch[0]
    if (isValidPDFLink(url) && !links.some(l => l.url === url)) {
      links.push({ url })
    }
  }
  
  return links
}

/**
 * Extract links from plain text email body
 */
function extractLinksFromText(textBody: string): PDFLink[] {
  const links: PDFLink[] = []
  
  // Match URLs ending in .pdf
  const urlRegex = /https?:\/\/[^\s<>"']+\.pdf/gi
  let match
  
  while ((match = urlRegex.exec(textBody)) !== null) {
    const url = match[0]
    if (isValidPDFLink(url) && !links.some(l => l.url === url)) {
      links.push({ url })
    }
  }
  
  // Also check for URLs that might have PDF content-type indicators
  // Look for common patterns like "Download PDF" followed by URL
  const downloadPattern = /(?:download|view|get|access)[\s:]+(?:pdf|document|statement|invoice)[\s:]*\s*(https?:\/\/[^\s<>"']+)/gi
  let downloadMatch
  while ((downloadMatch = downloadPattern.exec(textBody)) !== null) {
    const url = downloadMatch[1]
    if (isValidPDFLink(url) && !links.some(l => l.url === url)) {
      links.push({ url })
    }
  }
  
  return links
}

/**
 * Check if a URL contains PDF filename patterns (for tracking/redirect links)
 */
function containsPDFFilename(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false
  }
  
  const lowerUrl = url.toLowerCase()
  
  // Check for common PDF filename patterns in URL (even in query params or path)
  const pdfPatterns = [
    /invoice[^&]*\.pdf/i,
    /statement[^&]*\.pdf/i,
    /customer[^&]*\.pdf/i,
    /bill[^&]*\.pdf/i,
    /document[^&]*\.pdf/i,
    /\.pdf[^&]*/i, // .pdf anywhere in URL
    /filename[=:][^&]*\.pdf/i, // filename=...pdf or filename:...pdf
    /file[=:][^&]*\.pdf/i // file=...pdf or file:...pdf
  ]
  
  return pdfPatterns.some(pattern => pattern.test(url))
}

/**
 * Check if a URL is likely a PDF link
 */
function isValidPDFLink(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false
  }
  
  // Must be HTTP/HTTPS
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false
  }
  
  // Check if URL ends with .pdf
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.endsWith(".pdf")) {
    return true
  }
  
  // Check for PDF indicators in URL path
  if (lowerUrl.includes("/pdf/") || lowerUrl.includes("/document/") || lowerUrl.includes("/download/")) {
    return true
  }
  
  // Check for PDF in query parameters
  if (lowerUrl.includes("?") && (lowerUrl.includes("type=pdf") || lowerUrl.includes("format=pdf"))) {
    return true
  }
  
  // Check if URL contains PDF filename patterns (for tracking links)
  if (containsPDFFilename(url)) {
    return true
  }
  
  return false
}

/**
 * Extract PDF links from email body
 * @param emailBody - The email body (HTML or text)
 * @param isHtml - Whether the body is HTML format
 * @returns Array of PDF links with URLs and optional labels
 */
export function extractLinksFromEmail(emailBody: string, isHtml: boolean): PDFLink[] {
  if (!emailBody || emailBody.trim() === "") {
    return []
  }
  
  try {
    if (isHtml) {
      return extractLinksFromHTML(emailBody)
    } else {
      return extractLinksFromText(emailBody)
    }
  } catch (error) {
    console.error("[Link Extractor] Error extracting links:", error)
    return []
  }
}

