import type { AnalyticsDateRange } from "@/lib/analytics/types";

export function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function getRangeStart(dateRange: AnalyticsDateRange) {
  const now = new Date();

  if (dateRange === "all") {
    return null;
  }

  if (dateRange === "ytd") {
    return new Date(now.getFullYear(), 0, 1);
  }

  const days: Record<Exclude<AnalyticsDateRange, "ytd" | "all">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "12m": 365,
  };

  const offset = days[dateRange as keyof typeof days] ?? 365;
  const start = new Date(now);
  start.setDate(start.getDate() - offset);
  return start;
}

export function isWithinRange(value: string, start: Date | null) {
  if (!start) {
    return true;
  }

  return new Date(value) >= start;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekKey(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return dayKey(start);
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(new Date(Number(year), Number(month) - 1, 1));
}

function dayLabel(key: string) {
  const date = new Date(`${key}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function weekLabel(key: string) {
  const date = new Date(`${key}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function buildTimeBuckets(dateRange: AnalyticsDateRange) {
  const now = new Date();
  const buckets: Array<{ period: string; label: string }> = [];

  if (dateRange === "7d") {
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - index);
      const period = dayKey(date);
      buckets.push({ period, label: dayLabel(period) });
    }
    return buckets;
  }

  if (dateRange === "30d") {
    for (let index = 29; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - index);
      const period = dayKey(date);
      buckets.push({ period, label: dayLabel(period) });
    }
    return buckets;
  }

  if (dateRange === "90d") {
    for (let index = 12; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - index * 7);
      const period = weekKey(date);
      buckets.push({ period, label: weekLabel(period) });
    }
    return buckets;
  }

  const monthCount =
    dateRange === "ytd"
      ? now.getMonth() + 1
      : dateRange === "all"
        ? 24
        : 12;

  for (let index = monthCount - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const period = monthKey(date);
    buckets.push({ period, label: monthLabel(period) });
  }

  return buckets;
}

export function periodKeyForDate(date: Date, dateRange: AnalyticsDateRange) {
  if (dateRange === "7d" || dateRange === "30d") {
    return dayKey(date);
  }

  if (dateRange === "90d") {
    return weekKey(date);
  }

  return monthKey(date);
}

export function groupByPeriod<T extends { created_at: string }>(
  items: T[],
  dateRange: AnalyticsDateRange,
  getValue: (item: T) => number
) {
  const buckets = buildTimeBuckets(dateRange);
  const totals = new Map<string, { value: number; count: number }>();

  for (const bucket of buckets) {
    totals.set(bucket.period, { value: 0, count: 0 });
  }

  for (const item of items) {
    const key = periodKeyForDate(new Date(item.created_at), dateRange);
    const bucket = totals.get(key);
    if (!bucket) continue;
    bucket.value += getValue(item);
    bucket.count += 1;
  }

  return buckets.map((bucket) => {
    const entry = totals.get(bucket.period)!;
    return {
      period: bucket.period,
      label: bucket.label,
      value: entry.value,
      count: entry.count,
    };
  });
}

export function hoursBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, diff / (1000 * 60 * 60));
}

export function daysBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, diff / (1000 * 60 * 60 * 24));
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function safePercent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

export function normalizeRelation<T>(value: unknown) {
  if (Array.isArray(value)) {
    return value[0] as T | undefined;
  }

  return value as T | undefined;
}
