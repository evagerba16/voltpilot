import type { ReactNode } from "react";

type ListPageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function ListPageHeader({ title, description, action }: ListPageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-t-xl border-b border-border bg-card px-6 py-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand/80 via-brand/40 to-transparent"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
