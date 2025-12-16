import { db } from "@/db"
import { billsTable, type SelectBill } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getBillByIdQuery(billId: string): Promise<SelectBill | null> {
  const [bill] = await db
    .select()
    .from(billsTable)
    .where(eq(billsTable.id, billId))
    .limit(1)

  return bill || null
}

export async function getBillsByPropertyIdQuery(propertyId: string): Promise<SelectBill[]> {
  const bills = await db
    .select()
    .from(billsTable)
    .where(eq(billsTable.propertyId, propertyId))

  return bills
}

export async function getBillsByStatusQuery(
  status: "pending" | "processing" | "processed" | "error"
): Promise<SelectBill[]> {
  const bills = await db
    .select()
    .from(billsTable)
    .where(eq(billsTable.status, status))

  return bills
}

