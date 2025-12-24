"use client"

import { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link as LinkIcon } from "lucide-react"
import { PayableTemplateLinkDialog } from "@/app/(authenticated)/dashboard/properties/[propertyId]/_components/payable-template-link-dialog"
import {
  getPayableTemplatesWithReadyCountAction
} from "@/actions/payable-templates-actions"
import { getPaymentInstructionByPropertyAction } from "@/actions/payment-instructions-actions"
import { type SelectPayableTemplate } from "@/db/schema"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PaymentsTemplatesTabProps {
  properties: Array<{ id: string; name: string }>
}

interface TemplateWithDetails extends SelectPayableTemplate {
  propertyName: string
  readyCount: number
  bankAccountLinked: boolean
  beneficiaryLinked: boolean
}

export function PaymentsTemplatesTab({ properties }: PaymentsTemplatesTabProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<string>("all")
  const [paymentInstructionMap, setPaymentInstructionMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    loadTemplates()
  }, [properties])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const propertyIds = properties.map((p) => p.id)

      // Fetch templates with ready count using server action
      const templatesResult = await getPayableTemplatesWithReadyCountAction(propertyIds)
      if (templatesResult.isSuccess && templatesResult.data) {
        setTemplates(templatesResult.data)
      } else {
        toast.error(templatesResult.message || "Failed to load templates")
        setTemplates([])
      }

      // Fetch payment instructions for each property
      for (const property of properties) {
        const piResult = await getPaymentInstructionByPropertyAction(property.id)
        if (piResult.isSuccess && piResult.data) {
          setPaymentInstructionMap((prev) => {
            const newMap = new Map(prev)
            newMap.set(property.id, piResult.data!.id)
            return newMap
          })
        }
      }
    } catch (error) {
      console.error("Error loading templates:", error)
      toast.error("Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = useMemo(() => {
    if (selectedProperty === "all") {
      return templates
    }
    return templates.filter((t) => t.propertyId === selectedProperty)
  }, [templates, selectedProperty])

  const handleLinkSuccess = () => {
    loadTemplates()
    router.refresh()
  }

  if (loading) {
    return <div className="text-center py-10 text-muted-foreground">Loading templates...</div>
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>No payable templates found.</p>
        <p className="text-sm mt-2">
          Create templates from the{" "}
          <a href="/dashboard/properties" className="text-primary underline">
            Properties
          </a>{" "}
          page.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage payment links for payable templates
          </p>
        </div>
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Properties</option>
          {properties.map((prop) => (
            <option key={prop.id} value={prop.id}>
              {prop.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Template Name</TableHead>
              <TableHead>Bank Account</TableHead>
              <TableHead>Beneficiary</TableHead>
              <TableHead className="text-right">Ready Count</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No templates found matching your filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => {
                const paymentInstructionId = paymentInstructionMap.get(template.propertyId)

                return (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.propertyName}</TableCell>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>
                      {template.bankAccountLinked ? (
                        <Badge variant="default" className="bg-green-600">
                          Linked
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Linked</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.beneficiaryLinked ? (
                        <Badge variant="default" className="bg-green-600">
                          Linked
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Linked</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {template.readyCount > 0 ? (
                        <Badge variant="secondary">{template.readyCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLinkingId(template.id)}
                        disabled={!paymentInstructionId}
                      >
                        <LinkIcon className="h-4 w-4 mr-1" />
                        {template.bankAccountLinked && template.beneficiaryLinked
                          ? "Change Link"
                          : "Link Payment"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Link Dialog */}
      {linkingId && (
        <PayableTemplateLinkDialog
          template={templates.find((t) => t.id === linkingId)!}
          paymentInstructionId={paymentInstructionMap.get(
            templates.find((t) => t.id === linkingId)!.propertyId
          ) || null}
          open={!!linkingId}
          onOpenChange={(open) => {
            if (!open) {
              setLinkingId(null)
            }
          }}
          onSuccess={handleLinkSuccess}
        />
      )}
    </div>
  )
}

