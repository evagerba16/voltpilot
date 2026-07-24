"use client";

import { useEffect, useMemo, useState } from "react";

import { getLineItemCatalog } from "@/lib/estimates/line-item-catalogs";
import type { LineItemCatalog, PickerCatalogCategory } from "@/lib/estimates/line-item-catalogs/types";

export function useOrgLineItemCatalog(category: PickerCatalogCategory): LineItemCatalog {
  const fallback = useMemo(() => getLineItemCatalog(category), [category]);
  const [catalog, setCatalog] = useState<LineItemCatalog>(fallback);

  useEffect(() => {
    if (category !== "equipment") {
      setCatalog(fallback);
      return;
    }

    let cancelled = false;

    async function loadCatalog() {
      try {
        const response = await fetch("/api/catalog/equipment");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { catalog?: LineItemCatalog };
        if (!cancelled && payload.catalog) {
          setCatalog(payload.catalog);
        }
      } catch {
        // Keep the built-in catalog when the org catalog is unavailable.
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [category, fallback]);

  return category === "equipment" ? catalog : fallback;
}
