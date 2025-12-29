import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Request body for media upload
 */
interface MediaUploadBody {
  /** Base64 encoded file data */
  fileData: string
  /** Original filename */
  fileName: string
  /** MIME type of the file */
  mimeType: string
  /** WhatsApp session ID */
  sessionId: string
  /** WhatsApp message ID */
  messageId: string
}

/**
 * API route for uploading WhatsApp media to Supabase Storage.
 *
 * This endpoint receives media files from the Baileys WhatsApp server
 * as base64-encoded JSON and uploads them to Supabase Storage.
 *
 * @remarks
 * - Requires API key authentication via x-api-key header
 * - Files are organized by sessionId in the storage bucket
 * - The "whatsapp-media" bucket must be created manually in Supabase
 * - Accepts JSON with base64-encoded file data (more reliable than multipart)
 *
 * @example
 * ```typescript
 * const response = await fetch("/api/whatsapp/media", {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "x-api-key": apiKey
 *   },
 *   body: JSON.stringify({
 *     fileData: base64EncodedData,
 *     fileName: "image.jpg",
 *     mimeType: "image/jpeg",
 *     sessionId: "session-123",
 *     messageId: "msg-456"
 *   })
 * })
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get("x-api-key")
    const expectedApiKey = process.env.WHATSAPP_SERVER_API_KEY

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse JSON body
    // Check both lowercase and capitalized header names (Next.js normalizes to lowercase)
    const contentType = request.headers.get("content-type")
    
    // Log for debugging
    console.log(`[Media Upload] Received request with Content-Type: ${contentType || "NOT SET"}`)
    
    // Allow both application/json and application/json; charset=utf-8
    if (!contentType || (!contentType.includes("application/json") && !contentType.includes("application/json;"))) {
      const allHeaders = Object.fromEntries(request.headers.entries())
      console.error(`[Media Upload] Invalid Content-Type. Received: ${contentType || "undefined"}`)
      console.error(`[Media Upload] All headers:`, allHeaders)
      return NextResponse.json(
        { 
          error: "Content-Type must be application/json",
          receivedContentType: contentType || "not set",
          availableHeaders: Object.keys(allHeaders)
        },
        { status: 400 }
      )
    }

    let body: MediaUploadBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    // Validate required fields
    const { fileData, fileName, mimeType, sessionId, messageId } = body

    if (!fileData) {
      return NextResponse.json(
        { error: "Missing required field: fileData" },
        { status: 400 }
      )
    }
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing required field: sessionId" },
        { status: 400 }
      )
    }
    if (!messageId) {
      return NextResponse.json(
        { error: "Missing required field: messageId" },
        { status: 400 }
      )
    }

    // Decode base64 to buffer
    let fileBuffer: Buffer
    try {
      fileBuffer = Buffer.from(fileData, "base64")
    } catch {
      return NextResponse.json(
        { error: "Invalid base64 fileData" },
        { status: 400 }
      )
    }

    if (fileBuffer.length === 0) {
      return NextResponse.json(
        { error: "Empty file data" },
        { status: 400 }
      )
    }

    // Generate unique filename for storage
    const timestamp = Date.now()
    const ext = fileName?.split(".").pop() || getExtensionFromMime(mimeType) || "bin"
    const storagePath = `${sessionId}/${timestamp}-${messageId}.${ext}`

    console.log(`[Media Upload] Uploading ${storagePath} (${fileBuffer.length} bytes, ${mimeType})`)

    // Upload to Supabase Storage
    // Use "bills" bucket (existing bucket) with a whatsapp-media prefix
    const fullStoragePath = `whatsapp-media/${storagePath}`
    
    const { data, error } = await supabase.storage
      .from("bills")
      .upload(fullStoragePath, fileBuffer, {
        contentType: mimeType || "application/octet-stream",
        upsert: false
      })

    if (error) {
      console.error("Error uploading to Supabase:", error)
      return NextResponse.json(
        { error: "Failed to upload file", details: error.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("bills")
      .getPublicUrl(fullStoragePath)

    // Determine file type category
    const fileType = mimeType?.startsWith("image/")
      ? "image"
      : mimeType?.startsWith("video/")
        ? "video"
        : mimeType?.startsWith("audio/")
          ? "audio"
          : "document"

    console.log(`[Media Upload] Success: ${urlData.publicUrl}`)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName: fileName || `${messageId}.${ext}`,
      fileType,
      storagePath: data.path
    })
  } catch (error) {
    console.error("Error handling media upload:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType?: string): string {
  if (!mimeType) return "bin"

  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
  }

  return mimeToExt[mimeType] || mimeType.split("/")[1]?.split(";")[0] || "bin"
}
