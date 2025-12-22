"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getExtractionRulesByUserProfileIdQuery } from "@/queries/extraction-rules-queries"
import { getPropertyByIdQuery, getPropertiesByLandlordIdQuery, getPropertiesByRentalAgentIdQuery } from "@/queries/properties-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { FileText, DollarSign, ArrowRight, Settings, Sparkles } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RuleActions } from "./rule-actions"
import { getRulesReferencedBySchedulesQuery } from "@/queries/extraction-rules-queries"

async function RuleActionsWrapper({
  ruleId,
  ruleName,
  isReferenced,
  userProfileId,
  properties
}: {
  ruleId: string
  ruleName: string
  isReferenced: boolean
  userProfileId: string
  properties: Array<{ id: string; name: string }>
}) {
  return (
    <RuleActions
      ruleId={ruleId}
      ruleName={ruleName}
      isReferenced={isReferenced}
      userProfileId={userProfileId}
      properties={properties}
    />
  )
}

export async function RulesTable() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const rules = await getExtractionRulesByUserProfileIdQuery(userProfile.id)

  if (rules.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-2">No extraction rules found.</p>
          <p className="text-muted-foreground text-sm mb-4">
            Create extraction rules to automatically process bills and invoices.
          </p>
          <Button asChild>
            <Link href="/dashboard/rules/add">Create Your First Rule</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Group rules by property
  const rulesByProperty = new Map<string, typeof rules>()
  for (const rule of rules) {
    const propertyId = rule.propertyId
    if (!rulesByProperty.has(propertyId)) {
      rulesByProperty.set(propertyId, [])
    }
    rulesByProperty.get(propertyId)!.push(rule)
  }

  // Fetch property names
  const propertyIds = Array.from(rulesByProperty.keys())
  const propertiesForMap = await Promise.all(
    propertyIds.map((id) => getPropertyByIdQuery(id))
  )
  const propertyMap = new Map(
    propertiesForMap.map((p, i) => [propertyIds[i], p?.name || "Unknown Property"])
  )

  // Fetch all properties for the duplicate dialog
  let allProperties: Array<{ id: string; name: string }> = []
  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      allProperties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
    }
  } else if (userProfile.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      const agentProperties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
      allProperties = agentProperties.map((p) => ({ id: p.id, name: p.name }))
    }
  }

  // Batch check which rules are referenced by schedules (fixes N+1 query problem)
  const allRuleIds = rules.map((r) => r.id)
  const referencedRuleIds = await getRulesReferencedBySchedulesQuery(allRuleIds)

  return (
    <div className="space-y-6">
      {Array.from(rulesByProperty.entries()).map(([propertyId, propertyRules]) => {
        const propertyName = propertyMap.get(propertyId) || "Unknown Property"
        return (
          <Card key={propertyId}>
            <CardHeader>
              <CardTitle className="text-lg">{propertyName}</CardTitle>
              <CardDescription>
                {propertyRules.length} rule{propertyRules.length !== 1 ? "s" : ""} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Rule Name</TableHead>
                    <TableHead className="w-[150px]">Input (Bill Type)</TableHead>
                    <TableHead className="w-[200px]">Outputs</TableHead>
                    <TableHead className="w-[150px]">Channel</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {rule.billType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          {rule.extractForInvoice && (
                            <Badge variant="secondary" className="text-xs">
                              <FileText className="mr-1 h-3 w-3" />
                              Invoice
                            </Badge>
                          )}
                          {rule.extractForPayment && (
                            <Badge variant="secondary" className="text-xs">
                              <DollarSign className="mr-1 h-3 w-3" />
                              Payment
                            </Badge>
                          )}
                          {!rule.extractForInvoice && !rule.extractForPayment && (
                            <span className="text-muted-foreground text-xs">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {rule.channel === "email_forward"
                              ? "Email Forward"
                              : rule.channel === "agentic"
                                ? "Agentic"
                                : "Manual Upload"}
                          </Badge>
                          {rule.channel === "email_forward" && rule.emailProcessingInstruction && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="text-xs cursor-help">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  AI Processing
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>This rule has custom email processing instructions for intelligent link handling.</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rule.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <RuleActionsWrapper
                          ruleId={rule.id}
                          ruleName={rule.name}
                          isReferenced={referencedRuleIds.has(rule.id)}
                          userProfileId={userProfile.id}
                          properties={allProperties}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

