import type { ReactNode } from "react";

type ListPageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function ListPageHeader({ title, description, action }: ListPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
