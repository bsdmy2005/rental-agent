import { WAMessage, WASocket } from "@whiskeysockets/baileys";
export interface UploadedMedia {
    url: string;
    fileName: string;
    type: string;
}
/**
 * Download media from WhatsApp message and upload to Next.js API
 *
 * This service handles the complete media transfer flow:
 * 1. Downloads media buffer from WhatsApp using Baileys
 * 2. Determines the appropriate MIME type and filename
 * 3. Uploads the media to the Next.js media API endpoint
 *
 * @param socket - The Baileys WASocket instance (currently unused but may be needed for future enhancements)
 * @param message - The WhatsApp message containing media
 * @param sessionId - The session ID associated with this WhatsApp connection
 * @returns The uploaded media details or null if upload failed
 */
export declare function downloadAndUploadMedia(socket: WASocket, message: WAMessage, sessionId: string): Promise<UploadedMedia | null>;
/**
 * Check if a message contains downloadable media
 *
 * @param message - The WhatsApp message to check
 * @returns True if the message contains media that can be downloaded
 */
export declare function hasDownloadableMedia(message: WAMessage): boolean;
/**
 * Get the media type from a message
 *
 * @param message - The WhatsApp message
 * @returns The type of media or null if no media present
 */
export declare function getMediaType(message: WAMessage): "image" | "video" | "audio" | "document" | "sticker" | null;
//# sourceMappingURL=media-downloader.d.ts.map