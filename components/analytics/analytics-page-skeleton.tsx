export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-8 motion-safe:animate-pulse">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-20 border-b border-border bg-muted/30" />
        <div className="h-28 bg-muted/20" />
        <div className="h-12 bg-muted/30" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-28 bg-muted/30" />
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 rounded-xl border border-border bg-muted/20"
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-5 w-32 rounded bg-muted/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-96 rounded-2xl border border-border bg-muted/30"
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 rounded-2xl border border-border bg-muted/30" />
        <div className="h-80 rounded-2xl border border-border bg-muted/30" />
      </div>
    </div>
  );
}
