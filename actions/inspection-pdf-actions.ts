"use server"

import { auth } from "@clerk/nextjs/server"
import { ActionState } from "@/types"
import {
  generateBlankInspectionPDFAction as generateBlankPDF,
  generateFilledInspectionPDFAction as generateFilledPDF,
  generateMoveOutReportPDFAction as generateMoveOutReportPDF
} from "@/lib/moving-inspection-pdf-generator"

export async function generateBlankInspectionPDFAction(
  inspectionId: string
): Promise<ActionState<string>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const result = await generateBlankPDF(inspectionId)
    if (!result.isSuccess || !result.data) {
      return { isSuccess: false, message: result.message }
    }

    // Convert Buffer to base64 string for serialization
    const base64 = result.data.toString("base64")
    return {
      isSuccess: true,
      message: result.message,
      data: base64
    }
  } catch (error) {
    console.error("Error generating blank PDF:", error)
    return { isSuccess: false, message: "Failed to generate blank PDF" }
  }
}

export async function generateFilledInspectionPDFAction(
  inspectionId: string
): Promise<ActionState<string>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const result = await generateFilledPDF(inspectionId)
    if (!result.isSuccess || !result.data) {
      return { isSuccess: false, message: result.message }
    }

    // Convert Buffer to base64 string for serialization
    const base64 = result.data.toString("base64")
    return {
      isSuccess: true,
      message: result.message,
      data: base64
    }
  } catch (error) {
    console.error("Error generating filled PDF:", error)
    return { isSuccess: false, message: "Failed to generate filled PDF" }
  }
}

export async function generateMoveOutReportPDFAction(
  moveOutInspectionId: string
): Promise<ActionState<string>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const result = await generateMoveOutReportPDF(moveOutInspectionId)
    if (!result.isSuccess || !result.data) {
      return { isSuccess: false, message: result.message }
    }

    // Convert Buffer to base64 string for serialization
    const base64 = result.data.toString("base64")
    return {
      isSuccess: true,
      message: result.message,
      data: base64
    }
  } catch (error) {
    console.error("Error generating move-out report PDF:", error)
    return { isSuccess: false, message: "Failed to generate move-out report PDF" }
  }
}

