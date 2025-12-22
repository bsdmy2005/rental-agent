import { db } from "@/db"
import { periodBillMatchesTable, type SelectPeriodBillMatch } from "@/db/schema"
import { eq, inArray } from "drizzle-orm"

export async function getMatchesByPeriodIdQuery(periodId: string): Promise<SelectPeriodBillMatch[]> {
  const matches = await db
    .select()
    .from(periodBillMatchesTable)
    .where(eq(periodBillMatchesTable.periodId, periodId))

  return matches
}

export async function getMatchesByBillIdQuery(billId: string): Promise<SelectPeriodBillMatch | null> {
  const [match] = await db
    .select()
    .from(periodBillMatchesTable)
    .where(eq(periodBillMatchesTable.billId, billId))
    .limit(1)

  return match || null
}

export async function getAllMatchesByBillIdQuery(billId: string): Promise<SelectPeriodBillMatch[]> {
  const matches = await db
    .select()
    .from(periodBillMatchesTable)
    .where(eq(periodBillMatchesTable.billId, billId))

  return matches
}

export async function getMatchesByPeriodIdsQuery(
  periodIds: string[]
): Promise<Map<string, SelectPeriodBillMatch[]>> {
  if (periodIds.length === 0) {
    return new Map()
  }

  const matches = await db
    .select()
    .from(periodBillMatchesTable)
    .where(inArray(periodBillMatchesTable.periodId, periodIds))

  // Group by periodId
  const matchesByPeriod = new Map<string, SelectPeriodBillMatch[]>()
  for (const match of matches) {
    if (!matchesByPeriod.has(match.periodId)) {
      matchesByPeriod.set(match.periodId, [])
    }
    matchesByPeriod.get(match.periodId)!.push(match)
  }

  return matchesByPeriod
}

export async function getMatchesByBillIdsQuery(
  billIds: string[]
): Promise<Map<string, SelectPeriodBillMatch>> {
  if (billIds.length === 0) {
    return new Map()
  }

  const matches = await db
    .select()
    .from(periodBillMatchesTable)
    .where(inArray(periodBillMatchesTable.billId, billIds))

  return new Map(matches.map((match) => [match.billId, match]))
}

