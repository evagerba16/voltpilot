"use client";

import { formatCurrency, formatPercent } from "@/lib/analytics/format";

import { ChartTooltipShell } from "./chart-tooltip-shell";

export function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <ChartTooltipShell label={label} active={active}>
      <p className="text-base font-semibold tabular-nums">
        {formatCurrency(payload[0].value)}
      </p>
      {payload.length > 1 ? (
        <div className="mt-1.5 space-y-1 border-t border-border/60 pt-1.5">
          {payload.slice(1).map((entry) => (
            <p key={entry.name} className="flex items-center justify-between gap-4 text-xs">
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="font-medium tabular-nums">{formatCurrency(entry.value)}</span>
            </p>
          ))}
        </div>
      ) : null}
    </ChartTooltipShell>
  );
}

export function PercentTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <ChartTooltipShell label={label} active={active}>
      <p className="text-base font-semibold tabular-nums">
        {formatPercent(payload[0].value)}
      </p>
    </ChartTooltipShell>
  );
}

export function CountTooltip({
  active,
  payload,
  label,
  suffix = "items",
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <ChartTooltipShell label={label} active={active}>
      <p className="text-base font-semibold tabular-nums">
        {payload[0].value}{" "}
        <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
      </p>
    </ChartTooltipShell>
  );
}

export function PipelineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name?: string;
    payload?: { status?: string; value?: number };
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const status = entry.payload?.status ?? entry.name ?? label;

  return (
    <ChartTooltipShell label={status} active={active}>
      <p className="text-base font-semibold tabular-nums">
        {entry.value} projects
      </p>
      {entry.payload?.value ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatCurrency(entry.payload.value)} pipeline value
        </p>
      ) : null}
    </ChartTooltipShell>
  );
}
