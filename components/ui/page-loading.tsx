import { Spinner } from "@/components/ui/spinner";

export function PageLoading({ label = "Loading page..." }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="h-16 shrink-0 border-b border-border bg-background" />
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-3 border-b border-border px-6 py-4">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-6 py-4">
            <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
