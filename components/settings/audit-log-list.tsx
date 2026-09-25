import { RelativeTime } from "@/components/ui/relative-time";
import type { OrganizationAuditEvent } from "@/lib/audit/types";
import { vpTheme } from "@/lib/ui/vp-theme";

type AuditLogListProps = {
  events: OrganizationAuditEvent[];
};

export function AuditLogList({ events }: AuditLogListProps) {
  if (events.length === 0) {
    return (
      <div className={`${vpTheme.card} px-6 py-10 text-center text-sm text-muted-foreground`}>
        No activity yet
      </div>
    );
  }

  return (
    <ul className={`${vpTheme.card} divide-y divide-border/60`}>
      {events.map((event) => (
        <li
          key={event.id}
          className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
        >
          <p className="min-w-0 text-sm text-foreground">{event.summary}</p>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            <RelativeTime value={event.created_at} />
          </span>
        </li>
      ))}
    </ul>
  );
}
