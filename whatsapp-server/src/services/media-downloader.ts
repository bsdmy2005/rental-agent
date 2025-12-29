import { downloadMediaMessage, WAMessage, WASocket } from "@whiskeysockets/baileys"
import { createLogger } from "../utils/logger.js"
import { env } from "../config/env.js"

const logger = createLogger("media-downloader")

/** Response from the Next.js media upload API */
interface MediaUploadResponse {
  success: boolean
  url: string
  fileName: string
  fileType: string
  storagePath: string
  error?: string
}

export interface UploadedMedia {
  url: string
  fileName: string
  type: string
}

/**
 * Download media from WhatsApp message and upload to Next.js API
 *
 * This service handles the complete media transfer flow:
 * 1. Downloads media buffer from WhatsApp using Baileys
 * 2. Determines the appropriate MIME type and filename
 * 3. Uploads the media to the Next.js media API endpoint as base64 JSON
 *
 * @param socket - The Baileys WASocket instance (currently unused but may be needed for future enhancements)
 * @param message - The WhatsApp message containing media
 * @param sessionId - The session ID associated with this WhatsApp connection
 * @returns The uploaded media details or null if upload failed
 */
export async function downloadAndUploadMedia(
  socket: WASocket,
  message: WAMessage,
  sessionId: string
): Promise<UploadedMedia | null> {
  try {
    const messageId = message.key.id || `media-${Date.now()}`

    logger.debug({ messageId, sessionId }, "Starting media download")

    // Download media buffer from WhatsApp
    const buffer = await downloadMediaMessage(message, "buffer", {})

    if (!buffer) {
      logger.warn({ messageId }, "Failed to download media - empty buffer")
      return null
    }

    // Ensure buffer is a Buffer instance
    const mediaBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)

    logger.debug({ messageId, bufferSize: mediaBuffer.length }, "Media buffer downloaded")

    // Determine file type and name based on message type
    const msg = message.message
    let mimeType = "application/octet-stream"
    let fileName = `media-${messageId}`

    if (msg?.imageMessage) {
      mimeType = msg.imageMessage.mimetype || "image/jpeg"
      fileName = `image-${messageId}.${getExtension(mimeType, "jpg")}`
    } else if (msg?.videoMessage) {
      mimeType = msg.videoMessage.mimetype || "video/mp4"
      fileName = `video-${messageId}.${getExtension(mimeType, "mp4")}`
    } else if (msg?.documentMessage) {
      mimeType = msg.documentMessage.mimetype || "application/pdf"
      fileName = msg.documentMessage.fileName || `doc-${messageId}`
    } else if (msg?.audioMessage) {
      mimeType = msg.audioMessage.mimetype || "audio/ogg"
      fileName = `audio-${messageId}.ogg`
    } else if (msg?.stickerMessage) {
      mimeType = msg.stickerMessage.mimetype || "image/webp"
      fileName = `sticker-${messageId}.webp`
    }

    logger.debug({ messageId, mimeType, fileName }, "Media metadata determined")

    // Convert buffer to base64
    const base64Data = mediaBuffer.toString("base64")

    logger.debug(
      { messageId, base64Length: base64Data.length, uploadUrl: `${env.nextjsAppUrl}/api/whatsapp/media` },
      "Uploading media to Next.js as JSON"
    )

    // Upload to Next.js API as JSON with base64 data
    const nextjsUrl = env.nextjsAppUrl || "http://localhost:3000"
    const requestBody = JSON.stringify({
      fileData: base64Data,
      fileName,
      mimeType,
      sessionId,
      messageId
    })
    
    logger.debug(
      { messageId, bodyLength: requestBody.length, headers: { "Content-Type": "application/json", "x-api-key": "***" } },
      "Sending media upload request"
    )
    
    const response = await fetch(`${nextjsUrl}/api/whatsapp/media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-api-key": env.apiKey
      },
      body: requestBody
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      logger.error(
        { messageId, status: response.status, statusText: response.statusText, error: errorText },
        "Failed to upload media to Next.js API"
      )
      return null
    }

    const result = (await response.json()) as MediaUploadResponse

    if (!result.success) {
      logger.error({ messageId, error: result.error }, "Media upload failed")
      return null
    }

    logger.info({ messageId, url: result.url, fileName: result.fileName }, "Media uploaded successfully")

    return {
      url: result.url,
      fileName: result.fileName,
      type: result.fileType
    }
  } catch (error) {
    logger.error({ error, sessionId }, "Error downloading/uploading media")
    return null
  }
}

/**
 * Extract file extension from MIME type
 *
 * @param mimeType - The MIME type string (e.g., "image/jpeg")
 * @param defaultExt - Default extension if extraction fails
 * @returns The file extension without the dot
 */
function getExtension(mimeType: string, defaultExt: string): string {
  const parts = mimeType.split("/")
  if (parts.length !== 2) {
    return defaultExt
  }

  // Handle special cases like "audio/ogg; codecs=opus"
  const subType = parts[1].split(";")[0].trim()

  // Map common MIME subtypes to extensions
  const extensionMap: Record<string, string> = {
    jpeg: "jpg",
    "x-wav": "wav",
    "x-matroska": "mkv",
    "x-msvideo": "avi",
    plain: "txt",
    "x-python": "py",
    javascript: "js"
  }

  return extensionMap[subType] || subType || defaultExt
}

/**
 * Check if a message contains downloadable media
 *
 * @param message - The WhatsApp message to check
 * @returns True if the message contains media that can be downloaded
 */
export function hasDownloadableMedia(message: WAMessage): boolean {
  const msg = message.message
  if (!msg) return false

  return !!(
    msg.imageMessage ||
    msg.videoMessage ||
    msg.audioMessage ||
    msg.documentMessage ||
    msg.stickerMessage
  )
}

/**
 * Get the media type from a message
 *
 * @param message - The WhatsApp message
 * @returns The type of media or null if no media present
 */
export function getMediaType(
  message: WAMessage
): "image" | "video" | "audio" | "document" | "sticker" | null {
  const msg = message.message
  if (!msg) return null

  if (msg.imageMessage) return "image"
  if (msg.videoMessage) return "video"
  if (msg.audioMessage) return "audio"
  if (msg.documentMessage) return "document"
  if (msg.stickerMessage) return "sticker"

  return null
}
