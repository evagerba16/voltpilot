"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

type FilterChip = {
  key: string;
  label: string;
  value: string;
};

type FilterBarProps = {
  search?: string;
  searchPlaceholder?: string;
  onSearchChange: (query: string) => void;
  filters?: ReactNode;
  chips?: FilterChip[];
  onClearChip?: (key: string) => void;
  onClearAll?: () => void;
};

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function FilterBar({
  search = "",
  searchPlaceholder = "Search...",
  onSearchChange,
  filters,
  chips = [],
  onClearChip,
  onClearAll,
}: FilterBarProps) {
  const [query, setQuery] = useState(search);
  const debouncedQuery = useDebouncedValue(query, 350);
  const onSearchChangeRef = useRef(onSearchChange);
  const lastEmittedSearchRef = useRef(search.trim());

  onSearchChangeRef.current = onSearchChange;

  useEffect(() => {
    const nextSearch = search.trim();
    setQuery(search);
    lastEmittedSearchRef.current = nextSearch;
  }, [search]);

  useEffect(() => {
    const next = debouncedQuery.trim();
    if (next === lastEmittedSearchRef.current) {
      return;
    }

    lastEmittedSearchRef.current = next;
    onSearchChangeRef.current(next);
  }, [debouncedQuery]);

  const activeChips = chips.filter((chip) => chip.value);

  return (
    <div className="space-y-3 border-b border-border px-6 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search"
            className={inputClassName}
          />
        </div>
        {filters ? (
          <div className="flex flex-wrap items-center gap-2">{filters}</div>
        ) : null}
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onClearChip?.(chip.key)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
              )}
            >
              {chip.label}: {chip.value}
              <X className="size-3" aria-hidden="true" />
              <span className="sr-only">Remove {chip.label} filter</span>
            </button>
          ))}
          {onClearAll ? (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
};

export function FilterSelect({ label, value, onChange, children }: FilterSelectProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {children}
      </select>
    </label>
  );
}
