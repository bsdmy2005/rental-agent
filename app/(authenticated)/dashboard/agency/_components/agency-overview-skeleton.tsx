import { Skeleton } from "@/components/ui/skeleton"

export function AgencyOverviewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

