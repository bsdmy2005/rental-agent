import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { testRuleAgainstSampleAction } from "@/actions/rule-samples-actions"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ruleId } = await params
    const body = await request.json()
    const { sampleId } = body

    if (!sampleId) {
      return NextResponse.json({ error: "Sample ID is required" }, { status: 400 })
    }

    const result = await testRuleAgainstSampleAction(ruleId, sampleId)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("Error testing rule:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

