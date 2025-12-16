import { Skeleton } from "@/components/ui/skeleton"

export function UsersListSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="divide-y">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="flex-1">
              <Skeleton className="mb-2 h-6 w-1/4" />
              <Skeleton className="mb-2 h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}

