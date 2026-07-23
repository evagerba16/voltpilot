export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6 motion-safe:animate-pulse">
      <div className="h-24 rounded-xl border border-border bg-muted/30" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-xl border border-border bg-muted/30"
          />
        ))}
      </div>
      <div className="h-80 rounded-xl border border-border bg-muted/30" />
      <div className="h-64 rounded-xl border border-border bg-muted/30" />
    </div>
  );
}
