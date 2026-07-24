import type { EquipmentCatalogExportRow, EquipmentCatalogRow } from "@/lib/estimates/org-catalog/types";

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function equipmentRowsToCsv(rows: EquipmentCatalogRow[]) {
  const header = [
    "name",
    "unit",
    "unit_cost",
    "description",
    "keywords",
    "catalog_item_id",
    "is_hidden",
    "source",
  ];

  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        escapeCsv(row.name),
        escapeCsv(row.defaultUnit ?? ""),
        escapeCsv(row.defaultUnitCost != null ? String(row.defaultUnitCost) : ""),
        escapeCsv(row.description ?? ""),
        escapeCsv(row.keywords.join("|")),
        escapeCsv(row.catalogItemId ?? ""),
        escapeCsv(row.isHidden ? "true" : "false"),
        escapeCsv(row.source),
      ].join(",")
    );
  }

  return lines.join("\n");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

export type EquipmentCsvImportRow = EquipmentCatalogExportRow;

export function parseEquipmentCsv(content: string): EquipmentCsvImportRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const header = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
  const rows: EquipmentCsvImportRow[] = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};

    header.forEach((key, index) => {
      record[key] = values[index]?.trim() ?? "";
    });

    if (!record.name) {
      continue;
    }

    rows.push({
      name: record.name,
      unit: record.unit ?? "",
      unit_cost: record.unit_cost ?? "",
      description: record.description ?? "",
      keywords: record.keywords ?? "",
      catalog_item_id: record.catalog_item_id ?? "",
      is_hidden: record.is_hidden ?? "false",
      source: record.source ?? "custom",
    });
  }

  return rows;
}
