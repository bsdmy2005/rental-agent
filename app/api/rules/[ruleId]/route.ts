import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getExtractionRuleByIdQuery } from "@/queries/extraction-rules-queries"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userProfile = await getUserProfileByClerkIdQuery(userId)
    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const { ruleId } = await params
    const rule = await getExtractionRuleByIdQuery(ruleId)

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }

    // Verify user owns this rule
    if (rule.userProfileId !== userProfile.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ rule })
  } catch (error) {
    console.error("Error fetching extraction rule:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

