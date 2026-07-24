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
import {
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  PenLine,
  Search,
  Star,
} from "lucide-react";

import { HighlightMatch } from "@/components/estimates/highlight-match";
import {
  getFavoriteLineItemNames,
  hasExactLineItemMatch,
  isInCompanyLibrary,
  isLineItemFavorite,
  recordLineItemUse,
  saveToCompanyLibrary,
  searchLineItemCatalog,
  toggleLineItemFavorite,
  type PickerCatalogCategory,
} from "@/lib/estimates/line-item-catalogs";
import { useOrgLineItemCatalog } from "@/lib/estimates/org-catalog/use-org-line-item-catalog";
import { getGroupIcon, getSpecialIcon } from "@/lib/estimates/line-item-catalogs/icons";
import type { LineItemSearchResult } from "@/lib/estimates/line-item-catalogs/types";
import { isCatalogItemActive } from "@/lib/estimates/line-item-catalogs/utils";
import { cn } from "@/lib/utils";

export type LineItemPickerSelection = {
  description: string;
  defaultUnit?: string;
  defaultUnitCost?: number;
};

type LineItemPickerProps = {
  category: PickerCatalogCategory;
  value: string;
  onChange: (selection: LineItemPickerSelection) => void;
  className?: string;
  placeholder?: string;
};

type DropdownEntry =
  | {
      type: "result";
      key: string;
      result: LineItemSearchResult;
      groupId?: string;
    }
  | {
      type: "custom";
      key: string;
      label: string;
    }
  | {
      type: "custom-mode";
      key: string;
    }
  | {
      type: "group-header";
      key: string;
      groupId: string;
      label: string;
      itemCount: number;
    };

const PLACEHOLDERS: Record<PickerCatalogCategory, string> = {
  labor: "Search labor roles…",
  materials: "Search materials…",
  equipment: "Search equipment…",
  subcontractors: "Search subcontractors…",
};

function useDropdownPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLInputElement | null>
) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    function updatePosition() {
      const node = anchorRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const maxHeight = 360;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
      const height = Math.min(maxHeight, openUpward ? spaceAbove : spaceBelow);

      setStyle({
        position: "fixed",
        left: Math.max(8, rect.left),
        width: Math.min(Math.max(rect.width, 320), window.innerWidth - 16),
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

export function LineItemPicker({
  category,
  value,
  onChange,
  className,
  placeholder,
}: LineItemPickerProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [favoriteNames, setFavoriteNames] = useState<string[]>([]);
  const [customMode, setCustomMode] = useState(false);
  const [saveCustomToLibrary, setSaveCustomToLibrary] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const catalog = useOrgLineItemCatalog(category);
  const dropdownStyle = useDropdownPosition(open, inputRef);
  const trimmedQuery = query.trim();

  useEffect(() => {
    setMounted(true);
    setFavoriteNames(getFavoriteLineItemNames(category));
  }, [category]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const searchResults = useMemo(
    () =>
      searchLineItemCatalog(catalog, category, trimmedQuery, {
        favoriteNames,
      }),
    [catalog, category, trimmedQuery, favoriteNames]
  );

  const showCustomOption =
    trimmedQuery.length > 0 &&
    !hasExactLineItemMatch(catalog, category, trimmedQuery) &&
    trimmedQuery.toLowerCase() !== "other / custom";

  const entries = useMemo<DropdownEntry[]>(() => {
    if (customMode) {
      return [{ type: "custom-mode", key: "custom-mode" }];
    }

    if (trimmedQuery) {
      const rows: DropdownEntry[] = searchResults.map((result) => ({
        type: "result",
        key: result.item.id,
        result,
      }));

      rows.push({
        type: "custom",
        key: "custom-mode-trigger",
        label: "Other / Custom",
      });

      if (showCustomOption) {
        rows.push({
          type: "custom",
          key: `custom-${trimmedQuery}`,
          label: trimmedQuery,
        });
      }

      return rows;
    }

    const rows: DropdownEntry[] = [];
    const topResults = searchResults.filter(
      (result) => result.isFavorite || result.isRecent || result.isCompany
    );

    for (const result of topResults) {
      rows.push({
        type: "result",
        key: `top-${result.item.id}`,
        result,
      });
    }

    for (const group of catalog.groups) {
      const groupItems = group.items.filter(
        (item) =>
          isCatalogItemActive(item) &&
          searchLineItemCatalog(catalog, category, item.name, { favoriteNames }).some(
            (entry) => entry.item.id === item.id
          )
      );

      if (groupItems.length === 0) continue;

      rows.push({
        type: "group-header",
        key: `group-${group.id}`,
        groupId: group.id,
        label: group.label,
        itemCount: groupItems.length,
      });

      if (!collapsedGroups.has(group.id)) {
        for (const item of groupItems) {
          rows.push({
            type: "result",
            key: item.id,
            result: {
              item,
              groupLabel: group.label,
            },
            groupId: group.id,
          });
        }
      }
    }

    rows.push({
      type: "custom",
      key: "custom-mode-trigger",
      label: "Other / Custom",
    });

    return rows;
  }, [
    catalog,
    category,
    collapsedGroups,
    customMode,
    favoriteNames,
    searchResults,
    showCustomOption,
    trimmedQuery,
  ]);

  const selectableEntries = useMemo(
    () =>
      entries.filter(
        (entry) => entry.type === "result" || entry.type === "custom"
      ),
    [entries]
  );

  useEffect(() => {
    if (highlightIndex >= selectableEntries.length) {
      setHighlightIndex(Math.max(0, selectableEntries.length - 1));
    }
  }, [highlightIndex, selectableEntries.length]);

  const commitValue = useCallback(
    (next: string, defaultUnit?: string, persistToLibrary = false, defaultUnitCost?: number) => {
      const trimmed = next.trim();
      if (!trimmed) return;

      onChange({
        description: trimmed,
        ...(defaultUnit ? { defaultUnit } : {}),
        ...(defaultUnitCost != null && defaultUnitCost > 0 ? { defaultUnitCost } : {}),
      });
      setQuery(trimmed);
      recordLineItemUse(category, trimmed);

      if (persistToLibrary || (saveCustomToLibrary && customMode)) {
        saveToCompanyLibrary(category, trimmed, defaultUnit, defaultUnitCost);
      }

      setCustomMode(false);
      setSaveCustomToLibrary(false);
      setOpen(false);
    },
    [category, customMode, onChange, saveCustomToLibrary]
  );

  const selectResult = useCallback(
    (result: LineItemSearchResult) => {
      if (result.item.name === "Other / Custom") {
        setCustomMode(true);
        setQuery("");
        setOpen(true);
        return;
      }

      commitValue(result.item.name, result.item.defaultUnit, false, result.item.defaultUnitCost);
    },
    [commitValue]
  );

  const selectEntry = useCallback(
    (entry: DropdownEntry) => {
      if (entry.type === "custom") {
        if (entry.key === "custom-mode-trigger") {
          setCustomMode(true);
          setQuery("");
          setOpen(true);
          return;
        }

        commitValue(entry.label, undefined, saveCustomToLibrary);
        return;
      }

      if (entry.type === "result") {
        selectResult(entry.result);
      }
    },
    [commitValue, saveCustomToLibrary, selectResult]
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (inputRef.current?.contains(target)) return;

      const list = document.getElementById(listboxId);
      if (list?.contains(target)) return;

      setOpen(false);
      setCustomMode(false);
      setQuery(value);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [listboxId, open, value]);

  function handleInputChange(next: string) {
    setQuery(next);
    onChange({ description: next });
    setCustomMode(false);
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
        selectableEntries.length === 0
          ? 0
          : Math.min(current + 1, selectableEntries.length - 1)
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
      setCustomMode(false);
      setQuery(value);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (customMode) {
        commitValue(query, undefined, saveCustomToLibrary);
        return;
      }

      if (open && selectableEntries.length > 0) {
        selectEntry(selectableEntries[highlightIndex]);
        return;
      }

      commitValue(query);
    }
  }

  function toggleGroup(groupId: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  const dropdown =
    open && (entries.length > 0 || customMode) ? (
      <div
        id={listboxId}
        role="listbox"
        aria-label={`${catalog.label} catalog`}
        style={dropdownStyle}
        className="overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150"
      >
        <div className="sticky top-0 z-10 border-b border-border/60 bg-popover/95 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm">
          {customMode
            ? "Enter a custom description"
            : trimmedQuery
              ? `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`
              : `${catalog.label} library · favorites & recents first`}
        </div>

        {customMode ? (
          <div className="space-y-3 p-3">
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={2}
              autoFocus
              placeholder="Type a custom line item description…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={saveCustomToLibrary}
                onChange={(event) => setSaveCustomToLibrary(event.target.checked)}
                className="size-3.5 rounded border-input accent-primary"
              />
              Save to company library for future estimates
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                onClick={() => commitValue(query, undefined, saveCustomToLibrary)}
              >
                Use custom item
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-2 text-sm"
                onClick={() => {
                  setCustomMode(false);
                  setQuery(value);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <ul className="py-1">
            {(() => {
              let selectableIndex = -1;

              return entries.map((entry) => {
                if (entry.type === "group-header") {
                  const GroupIcon = getGroupIcon(entry.groupId);
                  const collapsed = collapsedGroups.has(entry.groupId);

                  return (
                    <li key={entry.key} className="px-1 pt-1">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/40"
                        onClick={() => toggleGroup(entry.groupId)}
                      >
                        {collapsed ? (
                          <ChevronRight className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        )}
                        <GroupIcon className="size-3.5" />
                        {entry.label}
                        <span className="ml-auto font-normal normal-case">
                          {entry.itemCount}
                        </span>
                      </button>
                    </li>
                  );
                }

                if (entry.type === "custom") {
                  selectableIndex += 1;
                  const activeIndex = selectableIndex;
                  const isActive = highlightIndex === activeIndex;
                  const CustomIcon =
                    entry.key === "custom-mode-trigger"
                      ? PenLine
                      : getSpecialIcon("custom");

                  return (
                    <li key={entry.key}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm",
                          isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                        )}
                        onMouseEnter={() => setHighlightIndex(activeIndex)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectEntry(entry)}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <CustomIcon className="size-3.5" />
                        </span>
                        <span>
                          {entry.key === "custom-mode-trigger" ? (
                            entry.label
                          ) : (
                            <>
                              Add &quot;
                              <HighlightMatch text={entry.label} query={trimmedQuery} />
                              &quot; as custom
                            </>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                }

                if (entry.type === "result") {
                  selectableIndex += 1;
                  const activeIndex = selectableIndex;
                  const isActive = highlightIndex === activeIndex;
                  const { result } = entry;

                  const Icon = result.isFavorite
                    ? getSpecialIcon("favorite")
                    : result.isRecent
                      ? getSpecialIcon("recent")
                      : result.isCompany
                        ? getSpecialIcon("company")
                        : getGroupIcon(entry.groupId ?? "custom");

                  const subtitle = result.isFavorite
                    ? "Favorite"
                    : result.isRecent
                      ? "Recently used"
                      : result.isCompany
                        ? "Company library"
                        : result.item.description ?? result.groupLabel;

                  const unitLabel =
                    result.item.defaultUnit === "hrs"
                      ? "Hour"
                      : result.item.defaultUnit === "wk"
                        ? "Week"
                        : result.item.defaultUnit === "day"
                          ? "Day"
                          : result.item.defaultUnit;

                  return (
                    <li key={entry.key}>
                      <div
                        className={cn(
                          "flex w-full items-center gap-1 motion-safe:transition-colors",
                          isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                        )}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className="flex min-w-0 flex-1 items-start gap-2.5 px-3 py-2.5 text-left"
                          onMouseEnter={() => setHighlightIndex(activeIndex)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectResult(result)}
                        >
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="size-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">
                              <HighlightMatch text={result.item.name} query={trimmedQuery} />
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {subtitle}
                              {unitLabel ? ` · ${unitLabel}` : ""}
                              {result.item.defaultUnitCost
                                ? ` · $${result.item.defaultUnitCost.toLocaleString()}`
                                : ""}
                            </span>
                          </span>
                        </button>
                        {!result.isCompany ? (
                          <button
                            type="button"
                            className="mr-2 shrink-0 rounded p-1 text-muted-foreground hover:text-amber-500"
                            aria-label={
                              isLineItemFavorite(category, result.item.name)
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleLineItemFavorite(category, result.item.name);
                              setFavoriteNames(getFavoriteLineItemNames(category));
                            }}
                          >
                            <Star
                              className={cn(
                                "size-3.5",
                                isLineItemFavorite(category, result.item.name) &&
                                  "fill-amber-400 text-amber-500"
                              )}
                            />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                }

                return null;
              });
            })()}
          </ul>
        )}

        {!customMode && trimmedQuery && showCustomOption ? (
          <div className="border-t border-border/60 px-3 py-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={() => {
                if (!isInCompanyLibrary(category, trimmedQuery)) {
                  saveToCompanyLibrary(category, trimmedQuery);
                }
              }}
            >
              <BookmarkPlus className="size-3.5" />
              Save &quot;{trimmedQuery}&quot; to company library
            </button>
          </div>
        ) : null}
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
          placeholder={placeholder ?? PLACEHOLDERS[category]}
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
              if (!inputRef.current || customMode) return;
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
