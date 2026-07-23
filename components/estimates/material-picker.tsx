"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Plus, Search, Star } from "lucide-react";

import {
  getFavoriteMaterialNames,
  getMaterialCatalog,
  hasExactMaterialMatch,
  isMaterialFavorite,
  recordMaterialUse,
  resolveMaterialTradeId,
  searchMaterialCatalog,
  toggleMaterialFavorite,
} from "@/lib/estimates/material-catalogs";
import { cn } from "@/lib/utils";

export type MaterialPickerSelection = {
  description: string;
  /** Set only when the user picks a catalog item (not custom/free-text entry). */
  defaultUnit?: string;
};

type MaterialPickerProps = {
  value: string;
  onChange: (selection: MaterialPickerSelection) => void;
  projectType?: string | null;
  className?: string;
  placeholder?: string;
};

type DropdownEntry =
  | {
      type: "result";
      key: string;
      label: string;
      groupLabel: string;
      defaultUnit?: string;
      isRecent?: boolean;
      isFavorite?: boolean;
    }
  | {
      type: "custom";
      key: string;
      label: string;
    };

function useDropdownPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLInputElement | null>
) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open || !anchorRef.current) {
      return;
    }

    function updatePosition() {
      const node = anchorRef.current;
      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const maxHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
      const height = Math.min(maxHeight, openUpward ? spaceAbove : spaceBelow);

      setStyle({
        position: "fixed",
        left: rect.left,
        width: Math.max(rect.width, 280),
        top: openUpward ? rect.top - height - 4 : rect.bottom + 4,
        maxHeight: height,
        zIndex: 60,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, open]);

  return style;
}

export function MaterialPicker({
  value,
  onChange,
  projectType,
  className,
  placeholder = "Search materials…",
}: MaterialPickerProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [favoriteNames, setFavoriteNames] = useState<string[]>([]);

  const tradeId = resolveMaterialTradeId(projectType);
  const catalog = useMemo(() => getMaterialCatalog(tradeId), [tradeId]);
  const dropdownStyle = useDropdownPosition(open, inputRef);

  useEffect(() => {
    setMounted(true);
    setFavoriteNames(getFavoriteMaterialNames(tradeId));
  }, [tradeId]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const trimmedQuery = query.trim();

  const searchResults = useMemo(
    () =>
      searchMaterialCatalog(catalog, tradeId, trimmedQuery, {
        favoriteNames,
      }),
    [catalog, tradeId, trimmedQuery, favoriteNames]
  );

  const showCustomOption =
    trimmedQuery.length > 0 && !hasExactMaterialMatch(catalog, trimmedQuery);

  const entries = useMemo<DropdownEntry[]>(() => {
    const rows: DropdownEntry[] = searchResults.map((result) => ({
      type: "result",
      key: result.item.id,
      label: result.item.name,
      groupLabel: result.groupLabel,
      defaultUnit: result.item.defaultUnit,
      isRecent: result.isRecent,
      isFavorite: result.isFavorite,
    }));

    if (showCustomOption) {
      rows.push({
        type: "custom",
        key: `custom-${trimmedQuery}`,
        label: trimmedQuery,
      });
    }

    return rows;
  }, [searchResults, showCustomOption, trimmedQuery]);

  useEffect(() => {
    if (highlightIndex >= entries.length) {
      setHighlightIndex(Math.max(0, entries.length - 1));
    }
  }, [entries.length, highlightIndex]);

  const commitCustom = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      onChange({ description: trimmed });
      setQuery(trimmed);
      if (trimmed) {
        recordMaterialUse(tradeId, trimmed);
      }
      setOpen(false);
    },
    [onChange, tradeId]
  );

  const selectCatalogEntry = useCallback(
    (entry: Extract<DropdownEntry, { type: "result" }>) => {
      const trimmed = entry.label.trim();
      const defaultUnit = entry.defaultUnit?.trim();

      onChange({
        description: trimmed,
        ...(defaultUnit ? { defaultUnit } : {}),
      });
      setQuery(trimmed);
      if (trimmed) {
        recordMaterialUse(tradeId, trimmed);
      }
      setOpen(false);
    },
    [onChange, tradeId]
  );

  const selectEntry = useCallback(
    (entry: DropdownEntry) => {
      if (entry.type === "custom") {
        commitCustom(entry.label);
        return;
      }

      selectCatalogEntry(entry);
    },
    [commitCustom, selectCatalogEntry]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (inputRef.current?.contains(target)) {
        return;
      }

      const list = document.getElementById(listboxId);
      if (list?.contains(target)) {
        return;
      }

      setOpen(false);
      setQuery(value);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [listboxId, open, value]);

  function handleInputChange(next: string) {
    setQuery(next);
    onChange({ description: next });
    setOpen(true);
    setHighlightIndex(0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }

      setHighlightIndex((current) =>
        entries.length === 0 ? 0 : Math.min(current + 1, entries.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }

      setHighlightIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery(value);
      return;
    }

    if (event.key === "Enter") {
      if (open && entries.length > 0) {
        event.preventDefault();
        selectEntry(entries[highlightIndex]);
        return;
      }

      event.preventDefault();
      commitCustom(query);
      return;
    }
  }

  const dropdown =
    open && entries.length > 0 ? (
      <div
        id={listboxId}
        role="listbox"
        aria-label={`${catalog.tradeLabel} materials`}
        style={dropdownStyle}
        className="overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
      >
        <div className="border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
          {trimmedQuery
            ? `${entries.length} result${entries.length === 1 ? "" : "s"}`
            : `${catalog.tradeLabel} catalog · favorites & recents first`}
        </div>
        <ul className="py-1">
          {entries.map((entry, index) => {
            const isActive = index === highlightIndex;

            if (entry.type === "custom") {
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                      isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                    )}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectEntry(entry)}
                  >
                    <Plus className="size-3.5 shrink-0 text-primary" />
                    <span>
                      Add &quot;{entry.label}&quot; as a custom material
                    </span>
                  </button>
                </li>
              );
            }

            return (
              <li key={entry.key}>
                <div
                  className={cn(
                    "flex w-full items-center gap-1",
                    isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                  )}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2 text-left"
                    onMouseEnter={() => setHighlightIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectEntry(entry)}
                  >
                    <span className="text-sm font-medium">{entry.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.isFavorite
                        ? "Favorite"
                        : entry.isRecent
                          ? "Recently used"
                          : entry.groupLabel}
                      {entry.defaultUnit ? ` · ${entry.defaultUnit}` : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="mr-2 shrink-0 rounded p-1 text-muted-foreground hover:text-amber-500"
                    aria-label={
                      isMaterialFavorite(tradeId, entry.label)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleMaterialFavorite(tradeId, entry.label);
                      setFavoriteNames(getFavoriteMaterialNames(tradeId));
                    }}
                  >
                    <Star
                      className={cn(
                        "size-3.5",
                        isMaterialFavorite(tradeId, entry.label) &&
                          "fill-amber-400 text-amber-500"
                      )}
                    />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  return (
    <>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          onFocus={() => {
            setOpen(true);
            setHighlightIndex(0);
          }}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            window.setTimeout(() => {
              if (!inputRef.current) {
                return;
              }

              const trimmed = query.trim();
              if (trimmed !== value.trim()) {
                onChange({ description: trimmed });
              }
            }, 120);
          }}
          className={cn(
            "h-8 w-full border-0 bg-transparent py-0 pr-2 pl-7 text-sm outline-none focus:bg-background focus:ring-1 focus:ring-ring/50",
            className
          )}
        />
      </div>
      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </>
  );
}
