"use server"

import { db } from "@/db"
import { ruleSamplesTable, type InsertRuleSample, type SelectRuleSample } from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"

export async function createRuleSampleAction(
  sample: InsertRuleSample
): Promise<ActionState<SelectRuleSample>> {
  try {
    const [newSample] = await db.insert(ruleSamplesTable).values(sample).returning()

    if (!newSample) {
      return { isSuccess: false, message: "Failed to create rule sample" }
    }

    return {
      isSuccess: true,
      message: "Rule sample uploaded successfully",
      data: newSample
    }
  } catch (error) {
    console.error("Error creating rule sample:", error)
    return { isSuccess: false, message: "Failed to create rule sample" }
  }
}

export async function deleteRuleSampleAction(sampleId: string): Promise<ActionState<void>> {
  try {
    await db.delete(ruleSamplesTable).where(eq(ruleSamplesTable.id, sampleId))

    return {
      isSuccess: true,
      message: "Rule sample deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting rule sample:", error)
    return { isSuccess: false, message: "Failed to delete rule sample" }
  }
}

export async function testRuleAgainstSampleAction(
  ruleId: string,
  sampleId: string
): Promise<ActionState<{
  invoiceData: unknown | null
  paymentData: unknown | null
  success: boolean
  error?: string
}>> {
  try {
    const { getExtractionRuleByIdQuery } = await import("@/queries/extraction-rules-queries")
    const { getRuleSampleByIdQuery } = await import("@/queries/rule-samples-queries")
    const { processPDFWithDualPurposeExtraction } = await import("@/lib/pdf-processing")

    const rule = await getExtractionRuleByIdQuery(ruleId)
    if (!rule) {
      return { isSuccess: false, message: "Extraction rule not found" }
    }

    const sample = await getRuleSampleByIdQuery(sampleId)
    if (!sample) {
      return { isSuccess: false, message: "Rule sample not found" }
    }

    // Prepare rules based on output type flags
    const invoiceRule = rule.extractForInvoice
      ? {
          id: rule.id,
          extractionConfig: rule.invoiceExtractionConfig as Record<string, unknown> | undefined,
          instruction: rule.invoiceInstruction || undefined
        }
      : undefined

    const paymentRule = rule.extractForPayment
      ? {
          id: rule.id,
          extractionConfig: rule.paymentExtractionConfig as Record<string, unknown> | undefined,
          instruction: rule.paymentInstruction || undefined
        }
      : undefined

    // Process the sample PDF
    const { invoiceData, paymentData } = await processPDFWithDualPurposeExtraction(
      sample.fileUrl,
      invoiceRule,
      paymentRule
    )

    return {
      isSuccess: true,
      message: "Rule tested successfully",
      data: {
        invoiceData,
        paymentData,
        success: true
      }
    }
  } catch (error) {
    console.error("Error testing rule against sample:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to test rule"
    }
  }
}

