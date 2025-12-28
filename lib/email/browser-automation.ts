"use server"

import { chromium, type Browser, type Page } from "playwright"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

export interface PlaywrightConfig {
  pinInputSelector?: string
  submitButtonSelector?: string
  pdfDownloadSelector?: string
  waitForSelector?: string
}

export interface BrowserAutomationResult {
  success: boolean
  pdfBuffer?: Buffer
  error?: string
  trace?: Array<{ step: string; timestamp: Date; data?: unknown }>
}

/**
 * Launch browser and navigate to URL
 */
async function launchBrowser(): Promise<Browser> {
  const headless = process.env.BROWSER_HEADLESS !== "false"
  const timeout = parseInt(process.env.BROWSER_TIMEOUT || "30000", 10)

  return await chromium.launch({
    headless,
    timeout
  })
}

/**
 * Navigate to URL, enter PIN, and download PDF using Playwright
 */
export async function automateBrowserInteraction(
  url: string,
  pin: string,
  config: PlaywrightConfig
): Promise<BrowserAutomationResult> {
  const trace: Array<{ step: string; timestamp: Date; data?: unknown }> = []
  let browser: Browser | null = null
  let page: Page | null = null

  try {
    trace.push({ step: "browser_launch", timestamp: new Date() })
    console.log("[Browser Automation] Launching browser...")
    browser = await launchBrowser()

    trace.push({ step: "page_create", timestamp: new Date() })
    page = await browser.newPage()

    // Set up download listener
    let downloadPath: string | null = null
    page.on("download", async (download) => {
      downloadPath = await download.path()
      trace.push({
        step: "download_detected",
        timestamp: new Date(),
        data: { path: downloadPath, suggestedFilename: download.suggestedFilename() }
      })
    })

    trace.push({ step: "navigate", timestamp: new Date(), data: { url } })
    console.log(`[Browser Automation] Navigating to: ${url}`)
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 })

    // Wait for page to load
    await page.waitForLoadState("domcontentloaded")

    // Enter PIN if selector is provided
    if (config.pinInputSelector) {
      trace.push({
        step: "pin_input_wait",
        timestamp: new Date(),
        data: { selector: config.pinInputSelector }
      })
      console.log(`[Browser Automation] Waiting for PIN input: ${config.pinInputSelector}`)
      await page.waitForSelector(config.pinInputSelector, { timeout: 10000 })

      trace.push({ step: "pin_enter", timestamp: new Date() })
      console.log(`[Browser Automation] Entering PIN...`)
      await page.fill(config.pinInputSelector, pin)

      // Submit form if submit button selector is provided
      if (config.submitButtonSelector) {
        trace.push({
          step: "submit_wait",
          timestamp: new Date(),
          data: { selector: config.submitButtonSelector }
        })
        console.log(`[Browser Automation] Waiting for submit button: ${config.submitButtonSelector}`)
        await page.waitForSelector(config.submitButtonSelector, { timeout: 10000 })

        trace.push({ step: "submit_click", timestamp: new Date() })
        console.log(`[Browser Automation] Clicking submit button...`)
        await page.click(config.submitButtonSelector)

        // Wait for navigation or content load
        await page.waitForLoadState("networkidle", { timeout: 30000 })
      } else {
        // Try to submit by pressing Enter
        trace.push({ step: "submit_enter", timestamp: new Date() })
        await page.press(config.pinInputSelector, "Enter")
        await page.waitForLoadState("networkidle", { timeout: 30000 })
      }
    }

    // Wait for statement page if selector is provided
    if (config.waitForSelector) {
      trace.push({
        step: "wait_for_selector",
        timestamp: new Date(),
        data: { selector: config.waitForSelector }
      })
      console.log(`[Browser Automation] Waiting for selector: ${config.waitForSelector}`)
      await page.waitForSelector(config.waitForSelector, { timeout: 30000 })
    }

    // Try to download PDF
    let pdfBuffer: Buffer | null = null

    // Method 1: Check if download was triggered
    if (downloadPath) {
      trace.push({ step: "pdf_from_download", timestamp: new Date() })
      const fs = await import("fs/promises")
      pdfBuffer = Buffer.from(await fs.readFile(downloadPath))
      console.log(`[Browser Automation] ✓ PDF downloaded: ${pdfBuffer.length} bytes`)
    }
    // Method 2: Click download button if provided
    else if (config.pdfDownloadSelector) {
      trace.push({
        step: "download_button_wait",
        timestamp: new Date(),
        data: { selector: config.pdfDownloadSelector }
      })
      console.log(`[Browser Automation] Waiting for download button: ${config.pdfDownloadSelector}`)
      await page.waitForSelector(config.pdfDownloadSelector, { timeout: 10000 })

      trace.push({ step: "download_button_click", timestamp: new Date() })
      console.log(`[Browser Automation] Clicking download button...`)
      const downloadPromise = page.waitForEvent("download", { timeout: 30000 })
      await page.click(config.pdfDownloadSelector)
      const download = await downloadPromise

      downloadPath = await download.path()
      const fs = await import("fs/promises")
      pdfBuffer = Buffer.from(await fs.readFile(downloadPath))
      console.log(`[Browser Automation] ✓ PDF downloaded via button: ${pdfBuffer.length} bytes`)
    }
    // Method 3: Print to PDF
    else {
      trace.push({ step: "print_to_pdf", timestamp: new Date() })
      console.log(`[Browser Automation] Generating PDF via print...`)
      pdfBuffer = Buffer.from(await page.pdf({ format: "A4", printBackground: true }))
      console.log(`[Browser Automation] ✓ PDF generated via print: ${pdfBuffer.length} bytes`)
    }

    if (!pdfBuffer) {
      throw new Error("Failed to obtain PDF from page")
    }

    // Clean up download file if it exists
    if (downloadPath) {
      try {
        const fs = await import("fs/promises")
        await fs.unlink(downloadPath)
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    trace.push({
      step: "complete",
      timestamp: new Date(),
      data: { pdfSize: pdfBuffer.length }
    })

    return {
      success: true,
      pdfBuffer,
      trace
    }
  } catch (error) {
    console.error("[Browser Automation] ✗ Error:", error)
    trace.push({
      step: "error",
      timestamp: new Date(),
      data: { error: error instanceof Error ? error.message : "Unknown error" }
    })

    // Capture screenshot on error if enabled
    if (process.env.BROWSER_SCREENSHOT_ON_ERROR === "true" && page) {
      try {
        const screenshot = await page.screenshot({ fullPage: true })
        trace.push({
          step: "error_screenshot",
          timestamp: new Date(),
          data: { screenshotSize: screenshot.length }
        })
      } catch (screenshotError) {
        // Ignore screenshot errors
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      trace
    }
  } finally {
    if (page) {
      await page.close().catch(() => {})
    }
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}

