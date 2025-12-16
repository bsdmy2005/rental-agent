import { Skeleton } from "@/components/ui/skeleton"

export function BillsListSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="divide-y">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Skeleton className="mb-2 h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

