"use client"

import { useRouter } from "next/navigation"
import { ModernRuleBuilder } from "../../_components/modern-rule-builder"

interface RuleBuilderWrapperProps {
  userProfileId: string
  properties: Array<{ id: string; name: string }>
}

export function RuleBuilderWrapper({ userProfileId, properties }: RuleBuilderWrapperProps) {
  const router = useRouter()

  const handleSuccess = () => {
    router.push("/dashboard/rules")
  }

  return <ModernRuleBuilder userProfileId={userProfileId} properties={properties} onSuccess={handleSuccess} />
}

