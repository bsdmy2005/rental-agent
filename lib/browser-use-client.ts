/**
 * Browser Use Cloud API Client Helper
 * 
 * This module provides functions for interacting with Browser Use Cloud API.
 * It handles task creation, file downloads, and session management.
 */

import { BrowserUseClient } from "browser-use-sdk"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

export interface BrowserUseCredentials {
  apiKey: string
}

export interface BrowserUseTaskResult {
  taskId: string
  output: string
  outputFiles: Array<{
    id: string
    fileName: string
  }>
  parsed?: unknown // For structured output
}

export interface BrowserUseFile {
  id: string
  fileName: string
}

/**
 * Create Browser Use client instance
 */
export function createBrowserUseClient(apiKey: string): BrowserUseClient {
  if (!apiKey || !apiKey.startsWith("bu_")) {
    throw new Error("Invalid Browser Use API key. Must start with 'bu_'")
  }
  return new BrowserUseClient({ apiKey })
}

/**
 * Test Browser Use API connection
 */
export async function testBrowserUseConnection(
  credentials: BrowserUseCredentials
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const client = createBrowserUseClient(credentials.apiKey)
    
    // Create a simple test task
    const task = await client.tasks.createTask({
      task: "Navigate to https://example.com and return the page title",
      llm: "browser-use-llm"
    })
    
    // Wait for completion (with timeout)
    const result = await Promise.race([
      task.complete(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Connection test timeout")), 30000)
      )
    ])
    
    return {
      success: true,
      message: `Connection successful. Task completed: ${result.output?.substring(0, 100) || "No output"}`
    }
  } catch (error) {
    console.error("[Browser Use Client] Connection test failed:", error)
    return {
      success: false,
      message: "Failed to connect to Browser Use API",
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

/**
 * Create a task and wait for completion
 */
export async function createTask(
  credentials: BrowserUseCredentials,
  taskDescription: string,
  options?: {
    llm?: string
    sessionId?: string
    schema?: unknown // Zod schema for structured output
    maxWaitTime?: number // milliseconds
  }
): Promise<BrowserUseTaskResult> {
  const client = createBrowserUseClient(credentials.apiKey)
  
  // Create task - handle schema separately if provided
  let task
  const llmValue = (options?.llm || "browser-use-llm") as any // Browser Use SDK will validate
  
  if (options?.schema) {
    // Use schema overload - Browser Use SDK expects JSON Schema
    // The schema is already converted from Zod to JSON Schema on the client
    task = await client.tasks.createTask({
      task: taskDescription,
      llm: llmValue,
      sessionId: options.sessionId || undefined,
      structuredOutput: JSON.stringify(options.schema) // Pass JSON Schema as stringified JSON
    } as any)
  } else {
    // No schema - use regular CreateTaskRequest
    task = await client.tasks.createTask({
      task: taskDescription,
      llm: llmValue,
      sessionId: options?.sessionId || undefined
    })
  }
  
  const maxWaitTime = options?.maxWaitTime || 300000 // 5 minutes default
  
  const result = await Promise.race([
    task.complete(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Task timeout after ${maxWaitTime}ms`)), maxWaitTime)
    )
  ])
  
  return {
    taskId: task.id,
    output: result.output || "",
    outputFiles: (result.outputFiles || []).map(f => ({
      id: f.id,
      fileName: f.fileName
    })),
    parsed: (result as any).parsed // Only available when schema is used
  }
}

/**
 * Download a file from Browser Use
 */
export async function downloadFile(
  credentials: BrowserUseCredentials,
  taskId: string,
  fileId: string
): Promise<Buffer> {
  try {
    const client = createBrowserUseClient(credentials.apiKey)
    
    // Get presigned URL for the file
    const fileResponse = await client.files.getTaskOutputFilePresignedUrl({
      task_id: taskId,
      file_id: fileId
    })
    
    // Download from presigned URL with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
    
    try {
      const response = await fetch(fileResponse.downloadUrl, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        throw new Error(`File download timeout after 60 seconds for file ${fileId}`)
      }
      throw fetchError
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("aborted") || error.name === "AbortError") {
        console.error(`[Browser Use Client] File download aborted for file ${fileId}:`, error.message)
        throw new Error(`File download was aborted: ${error.message}`)
      }
      console.error(`[Browser Use Client] File download error for file ${fileId}:`, error.message)
    }
    throw error
  }
}

/**
 * Create a session
 */
export async function createSession(
  credentials: BrowserUseCredentials,
  profileId?: string
): Promise<{ id: string; liveUrl?: string }> {
  const client = createBrowserUseClient(credentials.apiKey)
  const session = await client.sessions.createSession({ profileId })
  
  return {
    id: session.id,
    liveUrl: session.liveUrl || undefined
  }
}

/**
 * List sessions
 */
export async function listSessions(
  credentials: BrowserUseCredentials
): Promise<Array<{ id: string; status: string; liveUrl?: string }>> {
  const client = createBrowserUseClient(credentials.apiKey)
  const response = await client.sessions.listSessions()
  
  // SessionListResponse has an items array property
  const sessions = response.items || []
  
  return sessions.map((s) => ({
    id: s.id,
    status: s.status || "unknown",
    liveUrl: s.liveUrl || undefined
  }))
}

/**
 * Stop a session
 */
export async function stopSession(
  credentials: BrowserUseCredentials,
  sessionId: string
): Promise<void> {
  const client = createBrowserUseClient(credentials.apiKey)
  // Use updateSession with action: "stop"
  await client.sessions.updateSession({
    session_id: sessionId,
    action: "stop"
  })
}

