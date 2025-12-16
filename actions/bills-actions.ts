"use server"

import { db } from "@/db"
import { billsTable, type InsertBill, type SelectBill } from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function createBillAction(bill: InsertBill): Promise<ActionState<SelectBill>> {
  try {
    const [newBill] = await db.insert(billsTable).values(bill).returning()

    if (!newBill) {
      return { isSuccess: false, message: "Failed to create bill" }
    }

    return {
      isSuccess: true,
      message: "Bill created successfully",
      data: newBill
    }
  } catch (error) {
    console.error("Error creating bill:", error)
    return { isSuccess: false, message: "Failed to create bill" }
  }
}

export async function updateBillAction(
  billId: string,
  data: Partial<InsertBill>
): Promise<ActionState<SelectBill>> {
  try {
    const [updatedBill] = await db
      .update(billsTable)
      .set(data)
      .where(eq(billsTable.id, billId))
      .returning()

    if (!updatedBill) {
      return { isSuccess: false, message: "Bill not found" }
    }

    return {
      isSuccess: true,
      message: "Bill updated successfully",
      data: updatedBill
    }
  } catch (error) {
    console.error("Error updating bill:", error)
    return { isSuccess: false, message: "Failed to update bill" }
  }
}

export async function processBillAction(billId: string): Promise<ActionState<SelectBill>> {
  try {
    // Update status to processing
    const [updatedBill] = await db
      .update(billsTable)
      .set({ status: "processing" })
      .where(eq(billsTable.id, billId))
      .returning()

    if (!updatedBill) {
      return { isSuccess: false, message: "Bill not found" }
    }

    // Import PDF processing function
    const { processPDFWithOpenAI, extractTextFromPDF } = await import("@/lib/pdf-processing")

    try {
      // Extract text from PDF
      const rawText = await extractTextFromPDF(updatedBill.fileUrl)

      // Get extraction rule if available
      let extractionConfig = null
      if (updatedBill.extractionRuleId) {
        const { getExtractionRuleByIdQuery } = await import("@/queries/extraction-rules-queries")
        const rule = await getExtractionRuleByIdQuery(updatedBill.extractionRuleId)
        if (rule) {
          extractionConfig = rule.extractionConfig
        }
      }

      // Process PDF with OpenAI
      const extractedData = await processPDFWithOpenAI(
        updatedBill.fileUrl,
        rawText,
        extractionConfig
      )

      // Update bill with extracted data
      const [processedBill] = await db
        .update(billsTable)
        .set({
          status: "processed",
          rawText,
          extractedData: extractedData as any
        })
        .where(eq(billsTable.id, billId))
        .returning()

      if (!processedBill) {
        return { isSuccess: false, message: "Failed to update bill after processing" }
      }

      return {
        isSuccess: true,
        message: "Bill processed successfully",
        data: processedBill
      }
    } catch (processingError) {
      // Update status to error
      await db
        .update(billsTable)
        .set({ status: "error" })
        .where(eq(billsTable.id, billId))

      console.error("Error processing bill:", processingError)
      return {
        isSuccess: false,
        message: "Failed to process bill with AI"
      }
    }    }
  } catch (error) {
    console.error("Error processing bill:", error)
    return { isSuccess: false, message: "Failed to process bill" }
  }
}

