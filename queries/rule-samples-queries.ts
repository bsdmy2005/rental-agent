import { db } from "@/db"
import { ruleSamplesTable, type SelectRuleSample } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getRuleSampleByIdQuery(
  sampleId: string
): Promise<SelectRuleSample | null> {
  const [sample] = await db
    .select()
    .from(ruleSamplesTable)
    .where(eq(ruleSamplesTable.id, sampleId))
    .limit(1)

  return sample || null
}

export async function getRuleSamplesByRuleIdQuery(
  ruleId: string
): Promise<SelectRuleSample[]> {
  const samples = await db
    .select()
    .from(ruleSamplesTable)
    .where(eq(ruleSamplesTable.extractionRuleId, ruleId))
    .orderBy(ruleSamplesTable.uploadedAt)

  return samples
}

