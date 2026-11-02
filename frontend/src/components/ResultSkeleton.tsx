import { Skeleton } from '@/components/ui/skeleton'

export function ResultSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-14 w-64 -rotate-3" />
      <Skeleton className="h-5 w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-6 w-40" />
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground" aria-hidden="true">
        {label}
      </p>
    </div>
  )
}
