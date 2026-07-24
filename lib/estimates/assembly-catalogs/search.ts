import { getFavoriteAssemblyIds } from "@/lib/estimates/assembly-catalogs/favorites";
import { getRecentAssemblyIds } from "@/lib/estimates/assembly-catalogs/recents";
import { listCompanyAssemblies } from "@/lib/estimates/assembly-catalogs/company-assemblies";
import { STANDARD_ASSEMBLIES } from "@/lib/estimates/assembly-catalogs/catalog";
import type {
  AssemblyCatalogCategory,
  AssemblySearchResult,
  EstimateAssembly,
} from "@/lib/estimates/assembly-catalogs/types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreAssembly(assembly: EstimateAssembly, query: string) {
  const q = normalize(query);
  const name = normalize(assembly.name);
  const description = normalize(assembly.description);

  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (description.includes(q)) return 40;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.every((token) => name.includes(token) || description.includes(token))) {
    return 35;
  }

  return 0;
}

function allAssemblies(): EstimateAssembly[] {
  return [...STANDARD_ASSEMBLIES, ...listCompanyAssemblies()];
}

export function getAssemblyById(id: string): EstimateAssembly | undefined {
  return allAssemblies().find((assembly) => assembly.id === id);
}

export function searchAssemblies(
  query: string,
  options?: { category?: AssemblyCatalogCategory | "favorites" | "recent" | "all" }
): AssemblySearchResult[] {
  const trimmed = query.trim();
  const category = options?.category ?? "all";
  const favorites = new Set(getFavoriteAssemblyIds());
  const recents = getRecentAssemblyIds();
  const results: AssemblySearchResult[] = [];
  const seen = new Set<string>();

  function push(assembly: EstimateAssembly, source: AssemblySearchResult["source"], score: number) {
    if (seen.has(assembly.id)) return;
    seen.add(assembly.id);
    results.push({ assembly, source, score });
  }

  if (category === "favorites") {
    for (const id of favorites) {
      const assembly = getAssemblyById(id);
      if (!assembly) continue;
      const score = trimmed ? scoreAssembly(assembly, trimmed) : 50;
      if (!trimmed || score > 0) push(assembly, "favorite", score + 20);
    }
    return results.sort((left, right) => right.score - left.score);
  }

  if (category === "recent") {
    for (const [index, id] of recents.entries()) {
      const assembly = getAssemblyById(id);
      if (!assembly) continue;
      const score = trimmed ? scoreAssembly(assembly, trimmed) : 45 - index;
      if (!trimmed || score > 0) push(assembly, "recent", score + 15);
    }
    return results.sort((left, right) => right.score - left.score);
  }

  if (!trimmed) {
    for (const id of favorites) {
      const assembly = getAssemblyById(id);
      if (assembly) push(assembly, "favorite", 60);
    }

    for (const [index, id] of recents.entries()) {
      const assembly = getAssemblyById(id);
      if (assembly) push(assembly, "recent", 50 - index);
    }
  }

  const pool = allAssemblies().filter((assembly) => {
    if (category === "all" || category === "company") {
      return category === "all" ? true : assembly.category === "company";
    }
    return assembly.category === category;
  });

  for (const assembly of pool) {
    const source = assembly.isCompany ? "company" : "catalog";
    const score = trimmed ? scoreAssembly(assembly, trimmed) : source === "company" ? 30 : 20;
    if (!trimmed || score > 0) {
      push(assembly, source, score + (favorites.has(assembly.id) ? 10 : 0));
    }
  }

  return results.sort((left, right) => right.score - left.score);
}

export function listBrowseAssemblies(category: AssemblyCatalogCategory | "all") {
  return searchAssemblies("", { category });
}
