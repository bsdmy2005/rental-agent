"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { SelectExtractionRule, SelectBillTemplate } from "@/db/schema"

interface PropertyRulesSectionProps {
  rules: SelectExtractionRule[]
  rulesByBillType: {
    municipality: SelectExtractionRule[]
    levy: SelectExtractionRule[]
    utility: SelectExtractionRule[]
    other: SelectExtractionRule[]
  }
  billTemplates?: SelectBillTemplate[]
}

export function PropertyRulesSection({
  rules,
  rulesByBillType,
  billTemplates = []
}: PropertyRulesSectionProps) {
  // Helper to find bill templates linked to a rule
  const getLinkedTemplates = (ruleId: string) => {
    return billTemplates.filter((t) => t.extractionRuleId === ruleId)
  }
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
              {typeRules.map((rule) => {
                const linkedTemplates = getLinkedTemplates(rule.id)
                return (
                  <div
                  key={rule.id}
                    className="flex items-start justify-between rounded-md border p-2 hover:bg-muted/50 transition-colors"
                >
                    <Link href={`/dashboard/rules/${rule.id}`} className="flex-1">
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
                        {linkedTemplates.length > 0 && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                            Linked to {linkedTemplates.length} template{linkedTemplates.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      {rule.channel === "email_forward" ? "Email Forward" : "Manual Upload"}
                    </p>
                      {linkedTemplates.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {linkedTemplates.map((template) => (
                            <Badge
                              key={template.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {template.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

