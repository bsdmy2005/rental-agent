import { db } from "@/db"
import { emailProcessorsTable, type SelectEmailProcessor } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function getEmailProcessorByIdQuery(
  processorId: string
): Promise<SelectEmailProcessor | null> {
  const [processor] = await db
    .select()
    .from(emailProcessorsTable)
    .where(eq(emailProcessorsTable.id, processorId))
    .limit(1)

  return processor || null
}

export async function getEmailProcessorsByUserProfileIdQuery(
  userProfileId: string
): Promise<SelectEmailProcessor[]> {
  const processors = await db
    .select()
    .from(emailProcessorsTable)
    .where(eq(emailProcessorsTable.userProfileId, userProfileId))

  return processors
}

export async function getEmailProcessorsByStatusQuery(
  status: "pending" | "processing" | "processed" | "error"
): Promise<SelectEmailProcessor[]> {
  const processors = await db
    .select()
    .from(emailProcessorsTable)
    .where(eq(emailProcessorsTable.status, status))

  return processors
}

