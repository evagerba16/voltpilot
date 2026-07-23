"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useKeyboardShortcut } from "@/lib/hooks/use-keyboard-shortcut";
import { buildCustomersUrl } from "@/lib/customers/url";
import { buildProjectsUrl } from "@/lib/projects/url";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  type: "project" | "customer" | "estimate" | "proposal";
  title: string;
  subtitle?: string;
  href: string;
};

const typeIcons = {
  project: FolderKanban,
  customer: Building2,
  estimate: FileSpreadsheet,
  proposal: FileText,
};

const typeLabels = {
  project: "Project",
  customer: "Customer",
  estimate: "Estimate",
  proposal: "Proposal",
};

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retryCount, setRetryCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
    setOpen(true);
  }, []);

  useKeyboardShortcut({ key: "k", metaOrCtrl: true }, focusSearch);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery.trim())}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Search request failed.");
        }

        return response.json() as Promise<{ results?: SearchResult[] }>;
      })
      .then((data) => {
        setResults(data.results ?? []);
        setActiveIndex(-1);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }

        setResults([]);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load search results."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, retryCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    if (activeIndex >= 0 && results[activeIndex]) {
      navigate(results[activeIndex].href);
      return;
    }

    navigate(buildProjectsUrl({ q: trimmed }));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        current < results.length - 1 ? current + 1 : current
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current > 0 ? current - 1 : -1));
    } else if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <Search
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search projects, customers..."
          aria-label="Search projects and customers"
          aria-controls={showDropdown ? "global-search-results" : undefined}
          aria-autocomplete="list"
          className="h-9 w-36 rounded-lg border border-input bg-background pr-14 pl-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-48 lg:w-64"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">
          ⌘K
        </kbd>
      </form>

      {showDropdown ? (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute top-full right-0 z-50 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-lg lg:w-80"
        >
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Spinner />
              Searching...
            </div>
          ) : error ? (
            <div className="space-y-3 px-4 py-3">
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{error}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setRetryCount((count) => count + 1)}
              >
                Retry search
              </Button>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No results for &ldquo;{query.trim()}&rdquo;. Press Enter to search
              projects.
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((result, index) => {
                const Icon = typeIcons[result.type];
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onClick={() => navigate(result.href)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/60",
                        index === activeIndex && "bg-muted/60"
                      )}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{result.title}</p>
                        {result.subtitle ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {result.subtitle}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {typeLabels[result.type]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() =>
                navigate(buildCustomersUrl({ q: query.trim() }))
              }
              className="hover:text-foreground"
            >
              Search customers
            </button>
            {" · "}
            <button
              type="button"
              onClick={() =>
                navigate(buildProjectsUrl({ q: query.trim() }))
              }
              className="hover:text-foreground"
            >
              Search projects
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
