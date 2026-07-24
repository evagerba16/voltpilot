"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import {
  deleteCustomEquipmentItem,
  exportEquipmentCsv,
  importEquipmentCsv,
  migrateLocalEquipmentLibrary,
  resetEquipmentOverride,
  saveEquipmentCatalogItem,
  toggleEquipmentHidden,
} from "@/app/(dashboard)/settings/equipment/actions";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast-provider";
import { formatCurrency } from "@/lib/analytics/format";
import type { EquipmentCatalogRow } from "@/lib/estimates/org-catalog/types";
import { getUnitOptionsForCategory } from "@/lib/estimates/units";
import {
  cardClassName,
  inputClassName,
  labelClassName,
  selectClassName,
  textareaClassName,
} from "@/lib/ui/form-classes";
import { cn } from "@/lib/utils";

type EquipmentManagementPanelProps = {
  rows: EquipmentCatalogRow[];
  canEdit: boolean;
  readOnlyMessage?: string;
};

type FilterMode = "all" | "enabled" | "disabled" | "custom" | "overridden";

type EditState = {
  row: EquipmentCatalogRow | null;
  isNew: boolean;
};

const UNIT_LABELS: Record<string, string> = {
  hrs: "Hour",
  day: "Day",
  wk: "Week",
  mo: "Month",
  ea: "Each",
  ls: "Lump sum",
};

const LOCAL_LIBRARY_KEY = "voltpilot:company-line-items:equipment";

function formatUnit(unit: string | null) {
  if (!unit) return "—";
  return UNIT_LABELS[unit] ?? unit;
}

function sourceLabel(source: EquipmentCatalogRow["source"]) {
  if (source === "custom") return "Company";
  if (source === "override") return "Customized";
  return "Default";
}

export function EquipmentManagementPanel({
  rows,
  canEdit,
  readOnlyMessage,
}: EquipmentManagementPanelProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const { success } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [editState, setEditState] = useState<EditState>({ row: null, isNew: false });

  useEffect(() => {
    if (!canEdit || typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(LOCAL_LIBRARY_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Array<{
        name: string;
        defaultUnit?: string;
        defaultUnitCost?: number;
      }>;

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return;
      }

      void migrateLocalEquipmentLibrary(parsed).then((result) => {
        if (result.success && result.imported > 0) {
          window.localStorage.removeItem(LOCAL_LIBRARY_KEY);
          success(`Imported ${result.imported} items from your saved equipment library.`);
          router.refresh();
        }
      });
    } catch {
      // Ignore invalid legacy storage payloads.
    }
  }, [canEdit, router, success]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      if (filter === "enabled" && !row.isActive) return false;
      if (filter === "disabled" && row.isActive) return false;
      if (filter === "custom" && !row.isCustom) return false;
      if (filter === "overridden" && row.source !== "override") return false;

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        row.name,
        row.category,
        row.description ?? "",
        row.keywords.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [filter, query, rows]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      enabled: rows.filter((row) => row.isActive).length,
      custom: rows.filter((row) => row.isCustom).length,
      overridden: rows.filter((row) => row.source === "override").length,
    }),
    [rows]
  );

  function openCreateModal() {
    setEditState({
      isNew: true,
      row: {
        id: "new",
        source: "custom",
        catalogItemId: null,
        orgItemId: null,
        name: "",
        category: "Company Equipment",
        description: null,
        defaultUnit: "day",
        defaultUnitCost: null,
        keywords: [],
        isHidden: false,
        isCustom: true,
        isActive: true,
      },
    });
  }

  function openEditModal(row: EquipmentCatalogRow) {
    setEditState({ row, isNew: false });
  }

  function closeEditModal() {
    setEditState({ row: null, isNew: false });
  }

  function handleSaveEdit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const name = String(formData.get("name") ?? "").trim();
      const unit = String(formData.get("default_unit") ?? "").trim();
      const costRaw = String(formData.get("default_unit_cost") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim();
      const keywordsRaw = String(formData.get("keywords") ?? "").trim();
      const cost = costRaw ? Number(costRaw) : null;

      const result = await saveEquipmentCatalogItem({
        id: editState.row?.orgItemId ?? undefined,
        catalog_item_id: editState.row?.catalogItemId ?? null,
        name,
        default_unit: unit || null,
        default_unit_cost: Number.isFinite(cost) ? cost : null,
        description: description || null,
        keywords: keywordsRaw
          ? keywordsRaw.split(",").map((value) => value.trim()).filter(Boolean)
          : [],
        is_custom: editState.isNew || editState.row?.isCustom,
        is_hidden: editState.row?.isHidden ?? false,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      success(editState.isNew ? "Equipment item added." : "Equipment item updated.");
      closeEditModal();
      router.refresh();
    });
  }

  function handleToggleVisibility(row: EquipmentCatalogRow) {
    setError(null);

    startTransition(async () => {
      const hidden = !row.isHidden;

      const result = row.isCustom
        ? await saveEquipmentCatalogItem({
            id: row.orgItemId ?? undefined,
            name: row.name,
            default_unit: row.defaultUnit,
            default_unit_cost: row.defaultUnitCost,
            description: row.description,
            keywords: row.keywords,
            is_hidden: hidden,
            is_custom: true,
          })
        : row.catalogItemId
          ? await toggleEquipmentHidden(row.catalogItemId, hidden)
          : { error: "Unable to update this item." };

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      success(hidden ? "Equipment disabled." : "Equipment enabled.");
      router.refresh();
    });
  }

  function handleReset(row: EquipmentCatalogRow) {
    if (!row.catalogItemId) return;

    setError(null);

    startTransition(async () => {
      const result = await resetEquipmentOverride(row.catalogItemId!);
      if (result.error) {
        setError(result.error);
        return;
      }

      success("Restored default equipment settings.");
      router.refresh();
    });
  }

  async function handleDelete(row: EquipmentCatalogRow) {
    if (!row.orgItemId || !row.isCustom) return;

    const confirmed = await confirm({
      title: "Delete equipment item",
      description: `Remove "${row.name}" from your company equipment library?`,
      confirmLabel: "Delete",
      variant: "destructive",
    });

    if (!confirmed) return;

    setError(null);

    startTransition(async () => {
      const result = await deleteCustomEquipmentItem(row.orgItemId!);
      if (result.error) {
        setError(result.error);
        return;
      }

      success("Equipment item deleted.");
      router.refresh();
    });
  }

  function handleImport(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await importEquipmentCsv(formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      success(`Imported ${result.imported} equipment item${result.imported === 1 ? "" : "s"}.`);
      if (result.errors?.length) {
        setError(result.errors.join(" "));
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      router.refresh();
    });
  }

  function handleExport() {
    setError(null);

    startTransition(async () => {
      const result = await exportEquipmentCsv();
      const blob = new Blob([result.content], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      success("Equipment catalog exported.");
    });
  }

  return (
    <div className={cn(cardClassName, "overflow-hidden")}>
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Equipment library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize rental rates, hide equipment you don&apos;t use, and add company-specific
          items. Estimates use your catalog first, then fall back to VoltPilot defaults.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{stats.total} items</span>
          <span>{stats.enabled} enabled</span>
          <span>{stats.custom} company items</span>
          <span>{stats.overridden} customized defaults</span>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        {readOnlyMessage ? (
          <AlertBanner variant="info">{readOnlyMessage}</AlertBanner>
        ) : null}
        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search equipment…"
                className={cn(inputClassName, "pl-9")}
              />
            </div>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as FilterMode)}
              className={cn(selectClassName, "sm:w-44")}
            >
              <option value="all">All items</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
              <option value="custom">Company only</option>
              <option value="overridden">Customized defaults</option>
            </select>
          </div>

          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={openCreateModal} disabled={pending}>
                <Plus className="size-4" />
                Add equipment
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" />
                Import CSV
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={handleExport}
              >
                <Download className="size-4" />
                Export CSV
              </Button>
            </div>
          ) : null}
        </div>

        {canEdit ? (
          <form action={handleImport}>
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const form = event.currentTarget.form;
                if (form && event.currentTarget.files?.length) {
                  form.requestSubmit();
                }
              }}
            />
          </form>
        ) : null}

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Equipment</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canEdit ? <th className="px-4 py-3 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 7 : 6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No equipment matches your search.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.name}</div>
                      {row.description ? (
                        <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {row.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.category}</td>
                    <td className="px-4 py-3">{formatUnit(row.defaultUnit)}</td>
                    <td className="px-4 py-3">
                      {row.defaultUnitCost != null
                        ? formatCurrency(row.defaultUnitCost)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          row.source === "custom"
                            ? "bg-primary/10 text-primary"
                            : row.source === "override"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {sourceLabel(row.source)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          row.isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {row.isActive ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => openEditModal(row)}
                            aria-label={`Edit ${row.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => handleToggleVisibility(row)}
                            aria-label={row.isHidden ? `Enable ${row.name}` : `Disable ${row.name}`}
                          >
                            {row.isHidden ? (
                              <Eye className="size-4" />
                            ) : (
                              <EyeOff className="size-4" />
                            )}
                          </Button>
                          {row.source === "override" && row.catalogItemId ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={pending}
                              onClick={() => handleReset(row)}
                              aria-label={`Reset ${row.name}`}
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          ) : null}
                          {row.isCustom && row.orgItemId ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={pending}
                              onClick={() => void handleDelete(row)}
                              aria-label={`Delete ${row.name}`}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(editState.row)}
        onClose={closeEditModal}
        title={editState.isNew ? "Add company equipment" : "Edit equipment"}
        description={
          editState.isNew
            ? "Create a company-specific equipment item for your estimates."
            : editState.row?.isCustom
              ? "Update this company equipment item."
              : "Override the default rental rate and details for this built-in item."
        }
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeEditModal} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="equipment-edit-form"
              disabled={pending || !canEdit}
            >
              Save
            </Button>
          </div>
        }
      >
        {editState.row ? (
          <form id="equipment-edit-form" action={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="equipment_name" className={labelClassName}>
                Name
              </label>
              <input
                id="equipment_name"
                name="name"
                required
                readOnly={!editState.isNew && !editState.row.isCustom}
                defaultValue={editState.row.name}
                className={inputClassName}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="equipment_unit" className={labelClassName}>
                  Rental unit
                </label>
                <select
                  id="equipment_unit"
                  name="default_unit"
                  defaultValue={editState.row.defaultUnit ?? "day"}
                  className={selectClassName}
                >
                  {getUnitOptionsForCategory("equipment").map((unit) => (
                    <option key={unit} value={unit}>
                      {formatUnit(unit)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="equipment_rate" className={labelClassName}>
                  Default rate
                </label>
                <input
                  id="equipment_rate"
                  name="default_unit_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    editState.row.defaultUnitCost != null
                      ? String(editState.row.defaultUnitCost)
                      : ""
                  }
                  className={inputClassName}
                  placeholder="650"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="equipment_description" className={labelClassName}>
                Description
              </label>
              <textarea
                id="equipment_description"
                name="description"
                rows={3}
                defaultValue={editState.row.description ?? ""}
                className={textareaClassName}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="equipment_keywords" className={labelClassName}>
                Search keywords
              </label>
              <input
                id="equipment_keywords"
                name="keywords"
                defaultValue={editState.row.keywords.join(", ")}
                className={inputClassName}
                placeholder="bucket, boom truck, aerial"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated aliases used when searching in estimates.
              </p>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
