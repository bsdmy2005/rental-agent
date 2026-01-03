"use client"

import { WizardStep } from "../wizard-step"
import { useWizardState } from "../wizard-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export function ReviewStep() {
  const { state } = useWizardState()

  const getTenantDisplayData = (tenant: { extractedData?: { name?: string; idNumber?: string; email?: string; rentalAmount?: number; startDate?: string; endDate?: string }; manualData?: { name?: string; idNumber?: string; email?: string; rentalAmount?: number; startDate?: string; endDate?: string } }) => {
    return tenant.extractedData || tenant.manualData
  }

  return (
    <WizardStep
      title="Step 5: Review & Complete"
      description="Review all configurations before completing the onboarding process"
    >
      <div className="space-y-4">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground text-sm">Name:</span>
                <p className="font-medium">{state.property.name || "Not set"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Address:</span>
                <p className="font-medium">
                  {state.property.streetAddress || "Not set"}
                  {state.property.suburb && `, ${state.property.suburb}`}
                  {state.property.province && `, ${state.property.province}`}
                </p>
              </div>
              {state.property.propertyType && (
                <div>
                  <span className="text-muted-foreground text-sm">Property Type:</span>
                  <p className="font-medium">{state.property.propertyType}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bill Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Bill Templates ({state.billTemplates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.billTemplates.length === 0 ? (
              <p className="text-muted-foreground text-sm">No bill templates configured</p>
            ) : (
              <div className="space-y-3">
                {state.billTemplates.map((template, index) => (
                  <div key={index} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.name || `Bill Template ${index + 1}`}</span>
                          <Badge variant="outline">{template.billType}</Badge>
                        </div>
                        {template.expectedDayOfMonth && (
                          <p className="text-muted-foreground text-xs">
                            Expected arrival: Day {template.expectedDayOfMonth} of each month
                          </p>
                        )}
                        {template.newRule && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {template.newRule.extractForInvoice && (
                              <Badge variant="secondary">Invoice Extraction</Badge>
                            )}
                            {template.newRule.extractForPayment && (
                              <Badge variant="secondary">Payment Extraction</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payable Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Payable Templates ({state.payableTemplates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.payableTemplates.length === 0 ? (
              <p className="text-muted-foreground text-sm">No payable templates configured</p>
            ) : (
              <div className="space-y-3">
                {state.payableTemplates.map((template, index) => (
                  <div key={index} className="rounded-lg border p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name || `Payable Template ${index + 1}`}</span>
                      </div>
                      {template.dependsOnBillTemplateIds && template.dependsOnBillTemplateIds.length > 0 && (
                        <p className="text-muted-foreground text-xs">
                          Depends on {template.dependsOnBillTemplateIds.length} bill template(s)
                        </p>
                      )}
                      {template.scheduledDayOfMonth && (
                        <p className="text-muted-foreground text-xs">
                          Scheduled payment: Day {template.scheduledDayOfMonth} of each month
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tenants ({state.tenants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {state.tenants.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tenants added</p>
            ) : (
              <div className="space-y-3">
                {state.tenants.map((tenant, index) => {
                  const displayData = getTenantDisplayData(tenant)
                  return (
                    <div key={index} className="rounded-lg border p-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {displayData?.name || `Tenant ${index + 1}`}
                          </span>
                          {tenant.extractedData && (
                            <Badge variant="secondary">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Extracted from Lease
                            </Badge>
                          )}
                        </div>
                        {displayData?.idNumber && (
                          <p className="text-muted-foreground text-xs">ID: {displayData.idNumber}</p>
                        )}
                        {displayData?.email && (
                          <p className="text-muted-foreground text-xs">Email: {displayData.email}</p>
                        )}
                        {displayData?.rentalAmount && (
                          <p className="text-muted-foreground text-xs">
                            Rental: R{displayData.rentalAmount.toFixed(2)}/month
                          </p>
                        )}
                        {displayData?.startDate && displayData?.endDate && (
                          <p className="text-muted-foreground text-xs">
                            Lease: {new Date(displayData.startDate).toLocaleDateString()} -{" "}
                            {new Date(displayData.endDate).toLocaleDateString()}
                          </p>
                        )}
                        {tenant.rentalInvoiceTemplate && (
                          <div className="pt-2 border-t">
                            <p className="text-muted-foreground text-xs mb-1">Rental Invoice Template:</p>
                            <div className="space-y-1 text-xs">
                              <div>
                                Name: {tenant.rentalInvoiceTemplate.name || "Not set"}
                              </div>
                              <div>
                                Generation Day: Day {tenant.rentalInvoiceTemplate.generationDayOfMonth || 5}
                              </div>
                              <div>
                                Dependencies: {tenant.rentalInvoiceTemplate.dependsOnBillTemplateIds.length} bill template(s)
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
            <CardDescription>What will be created when you complete onboarding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Property:</span>
                <span className="font-medium">1 property</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bill Templates:</span>
                <span className="font-medium">{state.billTemplates.length} templates</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Extraction Rules:</span>
                <span className="font-medium">
                  {state.billTemplates.filter((t) => t.newRule).length} rules
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payable Templates:</span>
                <span className="font-medium">{state.payableTemplates.length} templates</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tenants:</span>
                <span className="font-medium">{state.tenants.length} tenants</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rental Invoice Templates:</span>
                <span className="font-medium">
                  {state.tenants.filter((t) => t.rentalInvoiceTemplate).length} template(s)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </WizardStep>
  )
}

