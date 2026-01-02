import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { movingInspectionsTable, movingInspectionAttachmentsTable } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

/**
 * GET - Get images for an inspection item (inspector token-based)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get("itemId")
    const token = searchParams.get("token")

    if (!itemId || !token) {
      return NextResponse.json(
        { error: "Missing required fields: itemId, token" },
        { status: 400 }
      )
    }

    // Verify inspector token
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.inspectorAccessToken, token))
      .limit(1)

    if (!inspection || inspection.signedByInspector) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    // Get images for the item
    const images = await db
      .select()
      .from(movingInspectionAttachmentsTable)
      .where(eq(movingInspectionAttachmentsTable.itemId, itemId))
      .orderBy(desc(movingInspectionAttachmentsTable.createdAt))

    return NextResponse.json({
      success: true,
      data: images
    })
  } catch (error) {
    console.error("Error getting inspection item images:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete an image (inspector token-based)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get("attachmentId")
    const token = searchParams.get("token")

    if (!attachmentId || !token) {
      return NextResponse.json(
        { error: "Missing required fields: attachmentId, token" },
        { status: 400 }
      )
    }

    // Verify inspector token and get inspection
    const [inspection] = await db
      .select()
      .from(movingInspectionsTable)
      .where(eq(movingInspectionsTable.inspectorAccessToken, token))
      .limit(1)

    if (!inspection || inspection.signedByInspector) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    // Get attachment to verify it belongs to this inspection
    const [attachment] = await db
      .select()
      .from(movingInspectionAttachmentsTable)
      .where(eq(movingInspectionAttachmentsTable.id, attachmentId))
      .limit(1)

    if (!attachment || attachment.inspectionId !== inspection.id) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }

    // Delete from database
    await db
      .delete(movingInspectionAttachmentsTable)
      .where(eq(movingInspectionAttachmentsTable.id, attachmentId))

    // Delete from Supabase storage
    try {
      const { deleteImageFromSupabase } = await import("@/lib/storage/supabase-storage")
      const url = new URL(attachment.fileUrl)
      const pathParts = url.pathname.split("/storage/v1/object/public/bills/")
      if (pathParts.length > 1) {
        const storagePath = pathParts[1]
        await deleteImageFromSupabase(storagePath)
      }
    } catch (error) {
      console.error("Error deleting image from Supabase storage:", error)
      // Continue even if storage deletion fails
    }

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting inspection item image:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

