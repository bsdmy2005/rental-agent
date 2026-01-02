import { Skeleton } from "@/components/ui/skeleton"

export function AgenciesListSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="divide-y">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}

