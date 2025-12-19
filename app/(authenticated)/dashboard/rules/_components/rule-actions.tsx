"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Play, Copy } from "lucide-react"
import { deleteExtractionRuleAction } from "@/actions/extraction-rules-actions"
import { toast } from "sonner"
import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { DuplicateRuleDialog } from "./duplicate-rule-dialog"

interface RuleActionsProps {
  ruleId: string
  ruleName: string
  isReferenced?: boolean
  userProfileId: string
  properties: Array<{ id: string; name: string }>
}

export function RuleActions({
  ruleId,
  ruleName,
  isReferenced = false,
  userProfileId,
  properties
}: RuleActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)

  const handleDelete = async () => {
    if (isReferenced) {
      toast.error("Cannot delete this rule because it is referenced by one or more billing schedules.")
      return
    }

    if (!confirm(`Are you sure you want to delete the rule "${ruleName}"? This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    try {
      const result = await deleteExtractionRuleAction(ruleId)
      if (result.isSuccess) {
        toast.success("Rule deleted successfully!")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to delete rule")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Test Rule">
          <Link href={`/dashboard/rules/${ruleId}`}>
            <Play className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Edit Rule">
          <Link href={`/dashboard/rules/${ruleId}/edit`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setDuplicateDialogOpen(true)}
          title="Duplicate Rule"
        >
          <Copy className="h-4 w-4" />
        </Button>
        {isReferenced ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground cursor-not-allowed"
                  disabled={true}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                This rule cannot be deleted because it is referenced by one or more billing schedules.
                Please remove or update the billing schedules first.
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={loading}
            title="Delete Rule"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <DuplicateRuleDialog
        ruleId={duplicateDialogOpen ? ruleId : null}
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        userProfileId={userProfileId}
        properties={properties}
      />
    </>
  )
}

