"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Play } from "lucide-react"
import { deleteExtractionRuleAction } from "@/actions/extraction-rules-actions"
import { toast } from "sonner"
import Link from "next/link"

interface RuleActionsProps {
  ruleId: string
  ruleName: string
}

export function RuleActions({ ruleId, ruleName }: RuleActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
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
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={handleDelete}
        disabled={loading}
        title="Delete Rule"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

