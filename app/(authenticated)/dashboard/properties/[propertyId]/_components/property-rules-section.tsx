"use server"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { SelectExtractionRule } from "@/db/schema"

interface PropertyRulesSectionProps {
  rules: SelectExtractionRule[]
  rulesByBillType: {
    municipality: SelectExtractionRule[]
    levy: SelectExtractionRule[]
    utility: SelectExtractionRule[]
    other: SelectExtractionRule[]
  }
}

export function PropertyRulesSection({
  rules,
  rulesByBillType
}: PropertyRulesSectionProps) {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-muted-foreground text-sm">No extraction rules found for this property.</p>
        <Link href="/dashboard/rules" className="text-primary hover:underline text-sm mt-2">
          Create a rule →
        </Link>
      </div>
    )
  }

  const billTypes = [
    { key: "municipality", label: "Rules for Municipality Bills" },
    { key: "levy", label: "Rules for Levy Bills" },
    { key: "utility", label: "Rules for Utility Bills" },
    { key: "other", label: "Rules for Other Bills" }
  ] as const

  return (
    <div className="space-y-4">
      {billTypes.map(({ key, label }) => {
        const typeRules = rulesByBillType[key]
        if (typeRules.length === 0) return null

        return (
          <div key={key}>
            <h4 className="font-medium text-sm mb-2">{label} ({typeRules.length})</h4>
            <div className="space-y-2">
              {typeRules.map((rule) => (
                <Link
                  key={rule.id}
                  href={`/dashboard/rules/${rule.id}`}
                  className="flex items-center justify-between rounded-md border p-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{rule.name}</p>
                      <Badge
                        variant={rule.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {rule.extractForInvoice && (
                        <Badge variant="outline" className="text-xs">
                          Invoice
                        </Badge>
                      )}
                      {rule.extractForPayment && (
                        <Badge variant="outline" className="text-xs">
                          Payment
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      {rule.channel === "email_forward" ? "Email Forward" : "Manual Upload"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

