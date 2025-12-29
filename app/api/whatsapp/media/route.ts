import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * API route for uploading WhatsApp media to Supabase Storage.
 *
 * This endpoint receives media files from the Baileys WhatsApp server
 * and uploads them to Supabase Storage for persistent storage.
 *
 * @remarks
 * - Requires API key authentication via x-api-key header
 * - Files are organized by sessionId in the storage bucket
 * - The "whatsapp-media" bucket must be created manually in Supabase
 *
 * @example
 * ```typescript
 * const formData = new FormData()
 * formData.append("file", file)
 * formData.append("sessionId", "session-123")
 * formData.append("messageId", "msg-456")
 *
 * const response = await fetch("/api/whatsapp/media", {
 *   method: "POST",
 *   headers: { "x-api-key": apiKey },
 *   body: formData
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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const sessionId = formData.get("sessionId") as string
    const messageId = formData.get("messageId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const ext = file.name.split(".").pop() || "bin"
    const fileName = `${sessionId}/${timestamp}-${messageId}.${ext}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("whatsapp-media")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error("Error uploading to Supabase:", error)
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("whatsapp-media")
      .getPublicUrl(fileName)

    // Determine file type category
    const fileType = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : "document"

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName: file.name,
      fileType,
      storagePath: data.path
    })
  } catch (error) {
    console.error("Error handling media upload:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
