"use server"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle2, XCircle, AlertCircle, Calendar } from "lucide-react"
import { type SelectRentalInvoiceTemplate, type SelectBillTemplate } from "@/db/schema"
import { getBillsByPropertyIdQuery } from "@/queries/bills-queries"
import { db } from "@/db"
import { periodBillMatchesTable } from "@/db/schema"
import { inArray } from "drizzle-orm"

interface RentalInvoiceTemplateDependenciesViewProps {
  template: SelectRentalInvoiceTemplate | null
  billTemplates: SelectBillTemplate[]
  propertyId: string
}

export async function RentalInvoiceTemplateDependenciesView({
  template,
  billTemplates,
  propertyId
}: RentalInvoiceTemplateDependenciesViewProps) {
  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rental Invoice Template</CardTitle>
          <CardDescription>No template configured for this tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create a rental invoice template to see its dependencies.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Get dependency bill template IDs
  const dependsOnBillTemplateIds = (template.dependsOnBillTemplateIds as string[]) || []
  
  // Get bill templates that are dependencies
  const dependencyBillTemplates = billTemplates.filter((bt) =>
    dependsOnBillTemplateIds.includes(bt.id)
  )

  // Get all bills for this property that match the dependency templates
  const allBills = await getBillsByPropertyIdQuery(propertyId)
  const billsByTemplate = new Map<string, typeof allBills>()
  
  for (const billTemplate of dependencyBillTemplates) {
    const bills = allBills.filter((bill) => bill.billTemplateId === billTemplate.id)
    billsByTemplate.set(billTemplate.id, bills)
  }

  // Get matches for all bills to see which ones are matched to periods
  const allBillIds = allBills.map((b) => b.id).filter((id): id is string => id !== null)
  const allMatches = allBillIds.length > 0
    ? await db
        .select()
        .from(periodBillMatchesTable)
        .where(inArray(periodBillMatchesTable.billId, allBillIds))
    : []
  const matchedBillIds = new Set(allMatches.map((m) => m.billId))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Rental Invoice Template Dependencies
        </CardTitle>
        <CardDescription>
          View the bill templates required for this invoice template and track which bills have arrived
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Info */}
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Template Name</p>
            <p className="font-semibold text-lg">{template.name}</p>
          </div>
          {template.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{template.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Generation Day</p>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                Day {template.generationDayOfMonth} of each month
              </p>
            </div>
          </div>
        </div>

        {/* Dependencies Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-3">Required Bill Templates</h3>
            {dependencyBillTemplates.length === 0 ? (
              <div className="p-4 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  No bill template dependencies configured. This template will generate invoices without waiting for bills.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dependencyBillTemplates.map((billTemplate) => {
                  const bills = billsByTemplate.get(billTemplate.id) || []
                  const processedBills = bills.filter((b) => b.status === "processed")
                  const matchedBills = bills.filter((b) => matchedBillIds.has(b.id))
                  
                  return (
                    <div
                      key={billTemplate.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{billTemplate.name}</h4>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {billTemplate.billType}
                            </Badge>
                            {billTemplate.isActive ? (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          {billTemplate.description && (
                            <p className="text-xs text-muted-foreground">
                              {billTemplate.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bill Status */}
                      <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Bills</p>
                          <p className="text-sm font-semibold">{bills.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Processed</p>
                          <div className="flex items-center gap-1">
                            {processedBills.length > 0 ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <p className="text-sm font-semibold">{processedBills.length}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Matched to Periods</p>
                          <div className="flex items-center gap-1">
                            {matchedBills.length > 0 ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                            <p className="text-sm font-semibold">{matchedBills.length}</p>
                          </div>
                        </div>
                      </div>

                      {/* Recent Bills */}
                      {bills.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Recent Bills</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {bills.slice(0, 5).map((bill) => {
                              const isMatched = matchedBillIds.has(bill.id)
                              return (
                                <div
                                  key={bill.id}
                                  className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{bill.fileName}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge
                                      variant={
                                        bill.status === "processed"
                                          ? "default"
                                          : bill.status === "processing"
                                          ? "secondary"
                                          : bill.status === "error"
                                          ? "destructive"
                                          : "outline"
                                      }
                                      className="text-xs"
                                    >
                                      {bill.status}
                                    </Badge>
                                    {isMatched && (
                                      <Badge variant="outline" className="text-xs">
                                        Matched
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                            {bills.length > 5 && (
                              <p className="text-xs text-muted-foreground text-center pt-1">
                                +{bills.length - 5} more bills
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {dependencyBillTemplates.length > 0 && (
          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Dependency Summary</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Required Templates:</p>
                <p className="font-semibold">{dependencyBillTemplates.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Bills Available:</p>
                <p className="font-semibold">
                  {Array.from(billsByTemplate.values()).reduce((sum, bills) => sum + bills.length, 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

