type ActivityItem = {
  id: string;
  action: string;
  project: string;
  user: string;
  time: string;
};

type RecentActivityProps = {
  items: ActivityItem[];
};

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">
          Latest updates across your estimating pipeline
        </p>
      </div>

      <ul className="divide-y divide-border/60">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.action}</p>
              <p className="truncate text-sm text-muted-foreground">
                {item.project}
              </p>
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <p>{item.user}</p>
              <p>{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
