"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  )
}

// Use service role key for server-side operations (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const BUCKET_NAME = "bills"

/**
 * Upload a PDF file to Supabase storage
 * @param file - File object or Buffer
 * @param path - Storage path (e.g., "bills/{propertyId}/{billId}/{filename}")
 * @returns Public URL of the uploaded file
 */
export async function uploadPDFToSupabase(
  file: File | Buffer,
  path: string
): Promise<string> {
  try {
    const fileBuffer = file instanceof File ? await file.arrayBuffer() : file
    const fileName = file instanceof File ? file.name : path.split("/").pop() || "file.pdf"

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, fileBuffer, {
        contentType: "application/pdf",
        upsert: false
      })

    if (error) {
      throw new Error(`Failed to upload PDF to Supabase: ${error.message}`)
    }

    // Get public URL
    const {
      data: { publicUrl }
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)

    return publicUrl
  } catch (error) {
    console.error("Error uploading PDF to Supabase:", error)
    throw error
  }
}

/**
 * Delete a PDF file from Supabase storage
 * @param path - Storage path to delete
 */
export async function deletePDFFromSupabase(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

    if (error) {
      throw new Error(`Failed to delete PDF from Supabase: ${error.message}`)
    }
  } catch (error) {
    console.error("Error deleting PDF from Supabase:", error)
    throw error
  }
}

/**
 * Get a signed URL for a PDF file (for private files)
 * @param path - Storage path
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL
 */
export async function getSignedPDFUrl(path: string, expiresIn: number = 3600): Promise<string> {
  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    if (!data?.signedUrl) {
      throw new Error("Failed to create signed URL: No signed URL returned")
    }

    return data.signedUrl
  } catch (error) {
    console.error("Error creating signed URL:", error)
    throw error
  }
}

/**
 * Get public URL for a PDF file
 * @param path - Storage path
 * @returns Public URL
 */
export async function getPDFUrl(path: string): Promise<string> {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Download a PDF file from Supabase storage
 * @param fileUrlOrPath - Storage path or public URL
 * @returns File buffer
 */
export async function downloadPDFFromSupabase(fileUrlOrPath: string): Promise<Buffer> {
  try {
    // Extract storage path from URL if it's a full URL
    // Supabase public URL format: {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
    let storagePath = fileUrlOrPath
    
    if (fileUrlOrPath.startsWith("http")) {
      // It's a full URL, extract the path
      const urlPattern = new RegExp(`/storage/v1/object/public/${BUCKET_NAME}/(.+)$`)
      const match = fileUrlOrPath.match(urlPattern)
      if (match && match[1]) {
        storagePath = match[1]
      } else {
        // Try to extract path from URL by removing the base URL and bucket prefix
        try {
          const url = new URL(fileUrlOrPath)
          const pathParts = url.pathname.split(`/${BUCKET_NAME}/`)
          if (pathParts.length > 1) {
            storagePath = pathParts[1]
          }
        } catch {
          // If URL parsing fails, try to use the original value
          throw new Error(`Invalid file URL format: ${fileUrlOrPath}`)
        }
      }
    }

    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(storagePath)

    if (error) {
      const errorMessage = error.message || JSON.stringify(error) || "Unknown error"
      throw new Error(`Failed to download PDF from Supabase: ${errorMessage}`)
    }

    if (!data) {
      throw new Error(`No data returned from Supabase for path: ${storagePath}`)
    }

    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error("Error downloading PDF from Supabase:", error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Failed to download PDF: ${String(error)}`)
  }
}

