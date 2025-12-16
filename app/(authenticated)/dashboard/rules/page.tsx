"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { ExtractionRulesList } from "./_components/extraction-rules-list"
import { ExtractionRulesListSkeleton } from "./_components/extraction-rules-list-skeleton"
import { RuleBuilder } from "./_components/rule-builder"

export default async function ExtractionRulesPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Extraction Rules</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Create New Rule</h2>
          {userProfile && <RuleBuilder userProfileId={userProfile.id} />}
        </div>
        <div>
          <h2 className="mb-4 text-xl font-semibold">Existing Rules</h2>
          <Suspense fallback={<ExtractionRulesListSkeleton />}>
            <ExtractionRulesList />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

