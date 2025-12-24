import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function PaymentsListSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

