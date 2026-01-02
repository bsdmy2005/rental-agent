/**
 * Download PDF files from URLs
 */

/**
 * Download a PDF file from a URL
 * @param url - The URL to download from
 * @returns Buffer containing the PDF file content
 * @throws Error if download fails or file is not a PDF
 */
export async function downloadPDFFromUrl(url: string): Promise<Buffer> {
  console.log(`[URL Downloader] Downloading PDF from URL: ${url}`)
  
  if (!url || typeof url !== "string") {
    throw new Error("Invalid URL provided")
  }
  
  // Validate URL format
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch (error) {
    throw new Error(`Invalid URL format: ${url}`)
  }
  
  // Only allow HTTP/HTTPS
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Only HTTP/HTTPS are supported.`)
  }
  
  try {
    // Fetch the URL with proper headers
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "PropNxtAI/1.0",
        "Accept": "application/pdf,application/octet-stream,*/*"
      },
      // Follow redirects
      redirect: "follow"
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    // Check content-type
    const contentType = response.headers.get("content-type") || ""
    const isPDF = 
      contentType.includes("application/pdf") ||
      contentType.includes("application/octet-stream") ||
      url.toLowerCase().endsWith(".pdf")
    
    if (!isPDF && !contentType.includes("application/octet-stream")) {
      // Log warning but continue - filename might indicate PDF
      console.warn(`[URL Downloader] ⚠ Content-Type is not PDF: ${contentType}`)
      console.warn(`[URL Downloader]   URL: ${url}`)
      console.warn(`[URL Downloader]   Continuing download - will validate file content`)
    }
    
    // Download the file
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    if (buffer.length === 0) {
      throw new Error("Downloaded file is empty")
    }
    
    // Validate PDF magic bytes (PDF files start with %PDF)
    const pdfMagicBytes = buffer.slice(0, 4).toString("ascii")
    if (pdfMagicBytes !== "%PDF") {
      throw new Error(`File is not a valid PDF. Magic bytes: ${pdfMagicBytes}`)
    }
    
    console.log(`[URL Downloader] ✓ Successfully downloaded PDF: ${buffer.length} bytes`)
    return buffer
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[URL Downloader] ✗ Failed to download PDF from ${url}:`, error.message)
      throw new Error(`Failed to download PDF: ${error.message}`)
    }
    throw error
  }
}

/**
 * Check if a URL is accessible (without downloading the full file)
 * Useful for validating links before attempting full download
 */
export async function checkUrlAccessibility(url: string): Promise<{
  accessible: boolean
  contentType?: string
  contentLength?: number
  error?: string
}> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "PropNxtAI/1.0"
      },
      redirect: "follow"
    })
    
    return {
      accessible: response.ok,
      contentType: response.headers.get("content-type") || undefined,
      contentLength: response.headers.get("content-length") 
        ? parseInt(response.headers.get("content-length")!, 10)
        : undefined
    }
  } catch (error) {
    return {
      accessible: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

