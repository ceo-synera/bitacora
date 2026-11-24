"use client";

import { useEffect, useState } from "react";
import { readSheet, type Workbook } from "@/lib/sheets";
import { Tabs } from "./ui";

/** Vista de una planilla (xlsx, xls o csv) en el navegador, con pestañas. */
export function SheetPreview({ url, name }: { url: string; name: string }) {
  const [wb, setWb] = useState<Workbook | null>(null);
  const [sheet, setSheet] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => readSheet(buf, name))
      .then((w) => {
        setWb(w);
        setSheet(w.sheetNames[0]);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, [url, name]);

  if (error) return <p className="p-4 text-sm text-danger">No pude leer la planilla: {error}</p>;
  if (!wb) return <p className="p-4 text-sm text-muted">Leyendo planilla…</p>;
  const rows = wb.sheets[sheet] ?? [];
  const width = Math.max(0, ...rows.map((r) => r.length));

  return (
    <div className="flex h-full flex-col">
      {wb.sheetNames.length > 1 && (
        <div className="px-2 pt-2">
          <Tabs value={sheet} onChange={setSheet} items={wb.sheetNames.map((n) => ({ value: n, label: n }))} />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="border-collapse text-xs">
          <thead className="sticky top-0 bg-soft">
            <tr>
              <th className="border border-line px-2 py-1 text-muted" />
              {Array.from({ length: width }, (_, i) => (
                <th key={i} className="border border-line px-2 py-1 font-normal text-muted">
                  {colName(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 2000).map((r, i) => (
              <tr key={i}>
                <td className="sticky left-0 border border-line bg-soft px-2 py-1 text-right text-muted">{i + 1}</td>
                {Array.from({ length: width }, (_, j) => (
                  <td key={j} className="max-w-72 truncate whitespace-nowrap border border-line px-2 py-1" title={String(r[j] ?? "")}>
                    {String(r[j] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 2000 && <p className="p-2 text-xs text-muted">Mostrando las primeras 2000 filas de {rows.length}.</p>}
      </div>
    </div>
  );
}

function colName(i: number): string {
  let s = "";
  i++;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}
