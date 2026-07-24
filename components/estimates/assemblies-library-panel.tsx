"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Layers,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import { HighlightMatch } from "@/components/estimates/highlight-match";
import { AssemblyFormDialog } from "@/components/estimates/assembly-form-dialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { useToast } from "@/components/ui/toast-provider";
import {
  ASSEMBLY_CATEGORY_LABELS,
  assemblyDirectCost,
  deleteCompanyAssembly,
  duplicateCompanyAssembly,
  groupAssemblyItems,
  searchAssemblies,
  toggleAssemblyFavorite,
  type AssemblyCatalogCategory,
  type EstimateAssembly,
} from "@/lib/estimates/assembly-catalogs";
import type { AssemblyLineItemTemplate } from "@/lib/estimates/assembly-catalogs/types";
import { isAssemblyFavorite } from "@/lib/estimates/assembly-catalogs/favorites";
import { formatCurrency } from "@/lib/estimates/calculations";
import { ESTIMATE_CATEGORY_LABELS } from "@/lib/estimates/types";
import { cn } from "@/lib/utils";

type LibraryTab = AssemblyCatalogCategory | "all" | "favorites" | "recent";

type AssembliesLibraryPanelProps = {
  onInsert: (assembly: EstimateAssembly) => void;
};

const TABS: { id: LibraryTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "residential", label: "Residential" },
  { id: "commercial", label: "Commercial" },
  { id: "low_voltage", label: "Low Voltage" },
  { id: "company", label: "Company" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recent" },
];

const GROUP_LABELS = {
  labor: "Labor",
  materials: "Materials",
  equipment: "Equipment",
  subcontractors: "Subcontractors",
  miscellaneous: "Miscellaneous",
} as const;

export function AssembliesLibraryPanel({ onInsert }: AssembliesLibraryPanelProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<LibraryTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favoriteVersion, setFavoriteVersion] = useState(0);
  const [companyVersion, setCompanyVersion] = useState(0);
  const [editorAssembly, setEditorAssembly] = useState<EstimateAssembly | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const confirm = useConfirm();
  const { success } = useToast();

  const results = useMemo(() => {
    void favoriteVersion;
    void companyVersion;
    return searchAssemblies(query, { category: tab });
  }, [query, tab, favoriteVersion, companyVersion]);

  const selectedAssembly =
    results.find((result) => result.assembly.id === selectedId)?.assembly ??
    results[0]?.assembly ??
    null;

  const handleInsert = useCallback(
    (assembly: EstimateAssembly) => {
      onInsert(assembly);
      success(`${assembly.name} added to estimate.`);
    },
    [onInsert, success]
  );

  useEffect(() => {
    if (results.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !results.some((result) => result.assembly.id === selectedId)) {
      setSelectedId(results[0].assembly.id);
    }
  }, [results, selectedId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (results.length === 0 || !selectedAssembly) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      const index = results.findIndex(
        (result) => result.assembly.id === selectedAssembly.id
      );

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = results[Math.min(index + 1, results.length - 1)];
        if (next) setSelectedId(next.assembly.id);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const next = results[Math.max(index - 1, 0)];
        if (next) setSelectedId(next.assembly.id);
      }

      if (event.key === "Enter" && index >= 0) {
        event.preventDefault();
        handleInsert(selectedAssembly);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [results, selectedAssembly, handleInsert]);

  function refreshCompany() {
    setCompanyVersion((value) => value + 1);
  }

  function handleFavoriteToggle(assemblyId: string) {
    toggleAssemblyFavorite(assemblyId);
    setFavoriteVersion((value) => value + 1);
  }

  function handleDuplicate(assembly: EstimateAssembly) {
    const copy = duplicateCompanyAssembly(assembly);
    refreshCompany();
    setTab("company");
    setSelectedId(copy.id);
    success("Assembly duplicated to company library.");
  }

  async function handleDelete(assembly: EstimateAssembly) {
    const confirmed = await confirm({
      title: `Delete ${assembly.name}?`,
      description: "This removes the assembly from your company library.",
      confirmLabel: "Delete assembly",
      variant: "destructive",
    });

    if (!confirmed) return;

    deleteCompanyAssembly(assembly.id);
    refreshCompany();
    success("Assembly deleted.");
  }

  function openEditor(assembly?: EstimateAssembly) {
    setEditorAssembly(
      assembly ?? {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        category: "company",
        isCompany: true,
        items: [
          {
            category: "labor",
            description: "Journeyman Electrician",
            quantity: 1,
            unit: "hrs",
            unit_cost: 88,
          },
        ],
      }
    );
    setEditorOpen(true);
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-r from-primary/5 via-card to-card px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Layers className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight">Assemblies</h2>
                <p className="text-xs text-muted-foreground">
                  Insert labor, materials, equipment, and subs in one click.
                </p>
              </div>
            </div>

            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search assemblies…"
                className="h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  tab === item.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
            {tab === "company" ? (
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => openEditor()}>
                <Plus data-icon="inline-start" />
                New assembly
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid min-h-[320px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="max-h-[420px] overflow-y-auto border-b border-border lg:border-b-0 lg:border-r">
            {results.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No assemblies match your search.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {results.map((result) => {
                  const assembly = result.assembly;
                  const active = assembly.id === selectedAssembly?.id;

                  return (
                    <li key={assembly.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(assembly.id)}
                        className={cn(
                          "flex w-full items-start gap-3 px-5 py-3 text-left transition-colors",
                          active ? "bg-primary/5" : "hover:bg-muted/30"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              <HighlightMatch text={assembly.name} query={query} />
                            </p>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {ASSEMBLY_CATEGORY_LABELS[assembly.category]}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {assembly.items.length} lines · {formatCurrency(assemblyDirectCost(assembly))}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleFavoriteToggle(assembly.id);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Toggle favorite"
                        >
                          <Star
                            className={cn(
                              "size-4",
                              isAssemblyFavorite(assembly.id) && "fill-amber-400 text-amber-500"
                            )}
                          />
                        </button>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col">
            {selectedAssembly ? (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">
                        {selectedAssembly.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedAssembly.description}
                      </p>
                    </div>
                    {selectedAssembly.isCompany ? (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEditor(selectedAssembly)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Edit assembly"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(selectedAssembly)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Duplicate assembly"
                        >
                          <Copy className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedAssembly)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete assembly"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDuplicate(selectedAssembly)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Save copy to company library"
                        title="Save copy to company library"
                      >
                        <Copy className="size-4" />
                      </button>
                    )}
                  </div>

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Includes
                  </p>

                  <div className="mt-3 space-y-4">
                    {(
                      Object.entries(groupAssemblyItems(selectedAssembly.items)) as [
                        keyof ReturnType<typeof groupAssemblyItems>,
                        AssemblyLineItemTemplate[],
                      ][]
                    ).map(([group, items]) =>
                      items.length > 0 ? (
                        <div key={group}>
                          <p className="text-sm font-medium">
                            {GROUP_LABELS[group]}
                          </p>
                          <ul className="mt-1.5 space-y-1">
                            {items.map((item, index) => (
                              <li
                                key={`${item.description}-${index}`}
                                className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
                              >
                                <span>{item.description}</span>
                                <span className="shrink-0 tabular-nums">
                                  {item.quantity} {item.unit ?? ESTIMATE_CATEGORY_LABELS[item.category]}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>

                <div className="border-t border-border px-5 py-4">
                  <p className="mb-2 text-center text-xs text-muted-foreground">
                    ↑ ↓ to browse · Enter to add
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => handleInsert(selectedAssembly)}
                  >
                    <Plus data-icon="inline-start" />
                    Add Assembly
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-5 py-10 text-sm text-muted-foreground">
                Select an assembly to preview included lines.
              </div>
            )}
          </div>
        </div>
      </section>

      <AssemblyFormDialog
        open={editorOpen}
        assembly={editorAssembly}
        onClose={() => {
          setEditorOpen(false);
          setEditorAssembly(null);
        }}
        onSaved={(savedId) => {
          refreshCompany();
          setTab("company");
          if (savedId) {
            setSelectedId(savedId);
          }
          success("Company assembly saved.");
        }}
      />
    </>
  );
}
