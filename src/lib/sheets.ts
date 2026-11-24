"use client";

export type Workbook = { sheetNames: string[]; sheets: Record<string, unknown[][]> };

/** Lee xlsx/xls/csv con SheetJS (se carga solo cuando hace falta). */
export async function readSheet(buf: ArrayBuffer, name: string): Promise<Workbook> {
  const XLSX = await import("xlsx");
  const isCsv = name.toLowerCase().endsWith(".csv");
  const wb = isCsv
    ? XLSX.read(new TextDecoder("utf-8").decode(buf), { type: "string", raw: false, cellDates: true })
    : XLSX.read(buf, { type: "array", cellDates: true });
  const sheets: Workbook["sheets"] = {};
  for (const n of wb.SheetNames) {
    sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "", blankrows: false }) as unknown[][];
  }
  return { sheetNames: wb.SheetNames, sheets };
}

/** Convierte una hoja (filas) a objetos usando la fila de encabezados. */
export function rowsToObjects(rows: unknown[][], headerRow = 0): { headers: string[]; rows: Record<string, unknown>[] } {
  const raw = (rows[headerRow] ?? []).map((h, i) => String(h ?? "").trim() || `Columna ${i + 1}`);
  // Encabezados repetidos: se numeran.
  const seen = new Map<string, number>();
  const headers = raw.map((h) => {
    const n = (seen.get(h) ?? 0) + 1;
    seen.set(h, n);
    return n > 1 ? `${h} (${n})` : h;
  });
  const out = rows.slice(headerRow + 1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
  return { headers, rows: out };
}
