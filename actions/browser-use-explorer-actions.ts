"use server"

import {
  testBrowserUseConnection,
  createTask,
  downloadFile,
  createSession,
  listSessions,
  stopSession,
  type BrowserUseCredentials,
  type BrowserUseTaskResult
} from "@/lib/browser-use-client"
import { ActionState } from "@/types"
import { z } from "zod"

/**
 * Test Browser Use API connection
 */
export async function testBrowserUseConnectionAction(
  apiKey: string
): Promise<ActionState<{ message: string }>> {
  try {
    if (!apiKey || apiKey.trim() === "") {
      return {
        isSuccess: false,
        message: "API key is required"
      }
    }

    const result = await testBrowserUseConnection({ apiKey })
    
    if (result.success) {
      return {
        isSuccess: true,
        message: result.message,
        data: { message: result.message }
      }
    } else {
      return {
        isSuccess: false,
        message: result.error || result.message
      }
    }
  } catch (error) {
    console.error("[Browser Use Explorer] Connection test error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to test connection"
    }
  }
}

/**
 * Create a task with file output
 */
export async function createTaskWithFileOutputAction(
  apiKey: string,
  taskDescription: string,
  options?: {
    llm?: string
    sessionId?: string
    maxWaitTime?: number
  }
): Promise<ActionState<{
  taskId: string
  output: string
  files: Array<{
    id: string
    name: string
    size: number
    mimeType: string
  }>
  downloadedFiles?: Array<{
    name: string
    size: number
    mimeType: string
    preview: string // Base64 preview of first 100 bytes
  }>
}>> {
  try {
    if (!apiKey || apiKey.trim() === "") {
      return {
        isSuccess: false,
        message: "API key is required"
      }
    }

    const result = await createTask(
      { apiKey },
      taskDescription,
      {
        llm: options?.llm || "browser-use-llm",
        sessionId: options?.sessionId,
        maxWaitTime: options?.maxWaitTime
      }
    )

    // Download file previews (first 100 bytes)
    const downloadedFiles = await Promise.all(
      result.outputFiles.slice(0, 5).map(async (file) => {
        try {
          const buffer = await downloadFile({ apiKey }, result.taskId, file.id)
          const preview = buffer.slice(0, 100).toString("base64")
          // Try to detect mime type from file name
          const mimeType = file.fileName.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : file.fileName.toLowerCase().endsWith(".png")
              ? "image/png"
              : file.fileName.toLowerCase().endsWith(".jpg") || file.fileName.toLowerCase().endsWith(".jpeg")
                ? "image/jpeg"
                : "application/octet-stream"
          return {
            name: file.fileName,
            size: buffer.length,
            mimeType,
            preview: `data:${mimeType};base64,${preview}`
          }
        } catch (error) {
          console.error(`[Browser Use Explorer] Failed to download file ${file.id}:`, error)
          return {
            name: file.fileName,
            size: 0,
            mimeType: "unknown",
            preview: ""
          }
        }
      })
    )

    return {
      isSuccess: true,
      message: `Task completed successfully. Found ${result.outputFiles.length} file(s)`,
      data: {
        taskId: result.taskId,
        output: result.output,
        files: result.outputFiles.map(f => ({
          id: f.id,
          name: f.fileName,
          size: 0, // Size not available in FileView
          mimeType: f.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "unknown"
        })),
        downloadedFiles
      }
    }
  } catch (error) {
    console.error("[Browser Use Explorer] Task creation error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create task"
    }
  }
}

/**
 * Create a task with structured output
 * Accepts JSON Schema (converted from Zod schema on client)
 */
export async function createTaskWithStructuredOutputAction(
  apiKey: string,
  taskDescription: string,
  schema: Record<string, unknown>, // JSON Schema object (serializable)
  options?: {
    llm?: string
    sessionId?: string
    maxWaitTime?: number
  }
): Promise<ActionState<{
  taskId: string
  output: string
  parsed: unknown
}>> {
  try {
    if (!apiKey || apiKey.trim() === "") {
      return {
        isSuccess: false,
        message: "API key is required"
      }
    }

    const result = await createTask(
      { apiKey },
      taskDescription,
      {
        llm: options?.llm || "browser-use-llm",
        sessionId: options?.sessionId,
        schema,
        maxWaitTime: options?.maxWaitTime
      }
    )

    return {
      isSuccess: true,
      message: "Task completed successfully with structured output",
      data: {
        taskId: result.taskId,
        output: result.output,
        parsed: result.parsed
      }
    }
  } catch (error) {
    console.error("[Browser Use Explorer] Structured output task error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create task"
    }
  }
}

/**
 * Create a session
 */
export async function createSessionAction(
  apiKey: string,
  profileId?: string
): Promise<ActionState<{ id: string; liveUrl?: string }>> {
  try {
    if (!apiKey || apiKey.trim() === "") {
      return {
        isSuccess: false,
        message: "API key is required"
      }
    }

    const session = await createSession({ apiKey }, profileId)
    
    return {
      isSuccess: true,
      message: "Session created successfully",
      data: session
    }
  } catch (error) {
    console.error("[Browser Use Explorer] Session creation error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to create session"
    }
  }
}

/**
 * List sessions
 */
export async function listSessionsAction(
  apiKey: string
): Promise<ActionState<Array<{ id: string; status: string; liveUrl?: string }>>> {
  try {
    if (!apiKey || apiKey.trim() === "") {
      return {
        isSuccess: false,
        message: "API key is required"
      }
    }

    const sessions = await listSessions({ apiKey })
    
    return {
      isSuccess: true,
      message: `Found ${sessions.length} session(s)`,
      data: sessions
    }
  } catch (error) {
    console.error("[Browser Use Explorer] List sessions error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to list sessions"
    }
  }
}

/**
 * Stop a session
 */
export async function stopSessionAction(
  apiKey: string,
  sessionId: string
): Promise<ActionState<void>> {
  try {
    if (!apiKey || apiKey.trim() === "") {
      return {
        isSuccess: false,
        message: "API key is required"
      }
    }

    await stopSession({ apiKey }, sessionId)
    
    return {
      isSuccess: true,
      message: "Session stopped successfully",
      data: undefined
    }
  } catch (error) {
    console.error("[Browser Use Explorer] Stop session error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to stop session"
    }
  }
}

/**
 * Test ANGOR portal PDF extraction (real-world example)
 */
export async function testAngorPortalAction(
  apiKey: string,
  url: string,
  pin: string
): Promise<ActionState<{
  taskId: string
  output: string
  files: Array<{
    id: string
    name: string
    size: number
    mimeType: string
  }>
  pdfDownloaded: boolean
}>> {
  try {
    if (!apiKey || apiKey.trim() === "") {
      return {
        isSuccess: false,
        message: "API key is required"
      }
    }

    const taskDescription = `Navigate to ${url}, enter PIN ${pin} in the input field, submit the form, and download the statement PDF. Save the PDF file.`

    const result = await createTask(
      { apiKey },
      taskDescription,
      {
        llm: "browser-use-llm",
        maxWaitTime: 300000 // 5 minutes for complex portal
      }
    )

    const pdfFiles = result.outputFiles.filter(
      f => f.fileName.toLowerCase().endsWith(".pdf")
    )

    return {
      isSuccess: true,
      message: pdfFiles.length > 0
        ? `Successfully extracted PDF. Found ${pdfFiles.length} PDF file(s)`
        : `Task completed but no PDF files found. Found ${result.outputFiles.length} file(s)`,
      data: {
        taskId: result.taskId,
        output: result.output,
        files: result.outputFiles.map(f => ({
          id: f.id,
          name: f.fileName,
          size: 0, // Size not available in FileView
          mimeType: f.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "unknown"
        })),
        pdfDownloaded: pdfFiles.length > 0
      }
    }
  } catch (error) {
    console.error("[Browser Use Explorer] ANGOR portal test error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to test ANGOR portal"
    }
  }
}

