"use server"

import { createBrowserUseClient, downloadFile, type BrowserUseCredentials } from "@/lib/browser-use-client"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

export interface AgenticBrowserResult {
  success: boolean
  pdfBuffer?: Buffer
  error?: string
  trace?: Array<{ step: string; timestamp: Date; data?: unknown }>
}

/**
 * Process URL using agentic browser (Browser Use Cloud API)
 * This is a fallback when Playwright selectors break
 */
export async function processWithAgenticBrowser(
  url: string,
  goal: string,
  guardrails: {
    maxSteps: number
    maxTime: number
    allowedDomains: string[]
  }
): Promise<AgenticBrowserResult> {
  const trace: Array<{ step: string; timestamp: Date; data?: unknown }> = []
  const startTime = new Date()

  console.log("[Agentic Browser] Processing with Browser Use Cloud API...")
  console.log(`[Agentic Browser] Goal: ${goal}`)
  console.log(`[Agentic Browser] URL: ${url}`)
  trace.push({ step: "start", timestamp: startTime, data: { goal, url, guardrails } })

  try {
    // Check for API key
    const apiKey = process.env.BROWSER_USE_API_KEY
    if (!apiKey || !apiKey.startsWith("bu_")) {
      throw new Error(
        "BROWSER_USE_API_KEY environment variable is not set or invalid. Must start with 'bu_'"
      )
    }

    trace.push({ step: "api_key_validated", timestamp: new Date() })

    // Initialize Browser Use client
    const client = createBrowserUseClient(apiKey)
    trace.push({ step: "client_initialized", timestamp: new Date() })

    // Create task with goal
    trace.push({ step: "task_creation_start", timestamp: new Date() })
    const task = await client.tasks.createTask({
      task: goal,
      llm: "browser-use-llm"
    })
    trace.push({
      step: "task_created",
      timestamp: new Date(),
      data: { taskId: task.id }
    })

    console.log(`[Agentic Browser] Task created: ${task.id}`)

    // Wait for task completion with timeout
    const maxWaitTime = guardrails.maxTime * 1000 // Convert seconds to milliseconds
    trace.push({
      step: "task_execution_start",
      timestamp: new Date(),
      data: { maxWaitTime }
    })

    const result = await Promise.race([
      task.complete(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Task timeout after ${maxWaitTime}ms`)),
          maxWaitTime
        )
      )
    ])

    trace.push({
      step: "task_completed",
      timestamp: new Date(),
      data: {
        outputLength: result.output?.length || 0,
        outputFilesCount: result.outputFiles?.length || 0
      }
    })

    console.log(
      `[Agentic Browser] Task completed. Output files: ${result.outputFiles?.length || 0}`
    )

    // Find PDF files in outputFiles
    const pdfFiles =
      result.outputFiles?.filter(
        (f) =>
          f.fileName.toLowerCase().endsWith(".pdf")
      ) || []

    if (pdfFiles.length === 0) {
      console.log("[Agentic Browser] ⚠ No PDF files found in output")
      trace.push({
        step: "no_pdf_found",
        timestamp: new Date(),
        data: {
          totalFiles: result.outputFiles?.length || 0,
          files: result.outputFiles?.map((f) => ({
            fileName: f.fileName
          }))
        }
      })
      return {
        success: false,
        error: `No PDF files found in task output. Found ${result.outputFiles?.length || 0} file(s)`,
        trace
      }
    }

    console.log(`[Agentic Browser] ✓ Found ${pdfFiles.length} PDF file(s)`)

    // Download the first PDF (or all PDFs - for now, just first)
    const pdfFile = pdfFiles[0]
    trace.push({
      step: "pdf_download_start",
      timestamp: new Date(),
      data: { fileName: pdfFile.fileName, fileId: pdfFile.id }
    })

    const pdfBuffer = await downloadFile({ apiKey }, task.id, pdfFile.id)

    trace.push({
      step: "pdf_downloaded",
      timestamp: new Date(),
      data: { fileName: pdfFile.fileName, size: pdfBuffer.length }
    })

    console.log(
      `[Agentic Browser] ✓ Successfully downloaded PDF: ${pdfFile.fileName} (${pdfBuffer.length} bytes)`
    )

    trace.push({
      step: "complete",
      timestamp: new Date(),
      data: { pdfSize: pdfBuffer.length, pdfFileName: pdfFile.fileName }
    })

    return {
      success: true,
      pdfBuffer,
      trace
    }
  } catch (error) {
    console.error("[Agentic Browser] ✗ Error:", error)
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error("[Agentic Browser]   Error name:", error.name)
      console.error("[Agentic Browser]   Error message:", error.message)
      if (error.stack) {
        console.error("[Agentic Browser]   Stack trace:", error.stack)
      }
      
      // Handle specific error types
      if (error.name === "AbortError" || error.message.includes("aborted")) {
        console.error("[Agentic Browser]   ⚠ Request was aborted (likely timeout or cancellation)")
      }
      if (error.message.includes("timeout")) {
        console.error("[Agentic Browser]   ⚠ Request timed out")
      }
    } else {
      console.error("[Agentic Browser]   Unknown error type:", typeof error)
      console.error("[Agentic Browser]   Error value:", JSON.stringify(error, null, 2))
    }
    
    trace.push({
      step: "error",
      timestamp: new Date(),
      data: {
        error: error instanceof Error ? error.message : "Unknown error",
        errorName: error instanceof Error ? error.name : typeof error,
        errorStack: error instanceof Error ? error.stack : undefined
      }
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      trace
    }
  }
}
