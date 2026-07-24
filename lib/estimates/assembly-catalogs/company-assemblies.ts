import type { EstimateAssembly } from "@/lib/estimates/assembly-catalogs/types";

const STORAGE_KEY = "voltpilot:company-assemblies";
const MAX_ASSEMBLIES = 40;

function readCompanyAssemblies(): EstimateAssembly[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EstimateAssembly[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCompanyAssemblies(assemblies: EstimateAssembly[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assemblies));
}

export function listCompanyAssemblies(): EstimateAssembly[] {
  return readCompanyAssemblies().sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

export function saveCompanyAssembly(assembly: EstimateAssembly): EstimateAssembly {
  const saved: EstimateAssembly = {
    ...assembly,
    category: "company",
    isCompany: true,
  };

  const existing = readCompanyAssemblies();
  const index = existing.findIndex((item) => item.id === saved.id);

  if (index >= 0) {
    existing[index] = saved;
    writeCompanyAssemblies(existing);
    return saved;
  }

  writeCompanyAssemblies([saved, ...existing].slice(0, MAX_ASSEMBLIES));
  return saved;
}

export function duplicateCompanyAssembly(assembly: EstimateAssembly): EstimateAssembly {
  return saveCompanyAssembly({
    ...assembly,
    id: crypto.randomUUID(),
    name: `${assembly.name} (Copy)`,
    category: "company",
    isCompany: true,
  });
}

export function deleteCompanyAssembly(assemblyId: string) {
  writeCompanyAssemblies(readCompanyAssemblies().filter((item) => item.id !== assemblyId));
}

export function createCompanyAssemblyFromTemplate(
  name: string,
  description: string,
  items: EstimateAssembly["items"]
): EstimateAssembly {
  return saveCompanyAssembly({
    id: crypto.randomUUID(),
    name: name.trim(),
    description: description.trim(),
    category: "company",
    isCompany: true,
    items: items.map((item) => ({ ...item })),
  });
}
