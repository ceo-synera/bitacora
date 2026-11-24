import type { Priority, Status } from "./types";

export type Row = Record<string, unknown>;

export type ImportField = "title" | "assignee" | "due_date" | "status" | "notes" | "project" | "priority";

export const IMPORT_FIELDS: { field: ImportField; label: string; required?: boolean }[] = [
  { field: "title", label: "Título", required: true },
  { field: "assignee", label: "Responsable" },
  { field: "due_date", label: "Fecha" },
  { field: "status", label: "Estado" },
  { field: "priority", label: "Prioridad" },
  { field: "notes", label: "Notas" },
  { field: "project", label: "Proyecto" },
];

export type Mapping = Partial<Record<ImportField, string>>;

export type ImportedTask = {
  title: string;
  assignee: string | null;
  due_date: string | null;
  status: Status;
  priority: Priority;
  notes: string;
  project: string | null;
};

const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

const GUESSES: Record<ImportField, string[]> = {
  title: ["titulo", "tarea", "title", "task", "nombre", "accion", "descripcion corta", "item"],
  assignee: ["responsable", "asignado", "assignee", "owner", "quien", "persona", "dueno"],
  due_date: ["fecha", "vence", "vencimiento", "due", "due date", "deadline", "fecha limite", "para cuando"],
  status: ["estado", "status", "situacion"],
  priority: ["prioridad", "priority", "urgencia"],
  notes: ["notas", "nota", "notes", "detalle", "descripcion", "comentarios", "observaciones"],
  project: ["proyecto", "project", "cliente"],
};

/** Adivina qué columna corresponde a cada campo, por el nombre del encabezado. */
export function guessMapping(headers: string[]): Mapping {
  const mapping: Mapping = {};
  const used = new Set<string>();
  for (const { field } of IMPORT_FIELDS) {
    const exact = headers.find((h) => !used.has(h) && GUESSES[field].includes(norm(h)));
    const partial = exact ?? headers.find((h) => !used.has(h) && GUESSES[field].some((g) => norm(h).includes(g)));
    if (partial) {
      mapping[field] = partial;
      used.add(partial);
    }
  }
  return mapping;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Convierte lo que venga en una celda de fecha a AAAA-MM-DD (o null). */
export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (typeof value === "number" && value > 20000 && value < 80000) {
    // Número de serie de Excel (días desde 1899-12-30)
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); // dd/mm/aaaa (formato uruguayo)
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return valid(y, +m[2], +m[1]);
  }
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})$/); // dd/mm sin año: el año en curso
  if (m) return valid(new Date().getFullYear(), +m[2], +m[1]);
  return null;
}

function valid(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

export function parseStatus(value: unknown): Status {
  const s = norm(value);
  if (!s) return "todo";
  if (/(hech|termin|complet|listo|done|cerrad|ok\b|finaliz)/.test(s)) return "done";
  if (/(curso|progreso|haciendo|doing|in progress|wip|empezad)/.test(s)) return "doing";
  if (/(esper|bloque|waiting|pendiente de|blocked|on hold)/.test(s)) return "waiting";
  return "todo";
}

export function parsePriority(value: unknown): Priority {
  const s = norm(value);
  if (/(alta|high|urgente|p1|importante)/.test(s)) return "high";
  if (/(baja|low|p3)/.test(s)) return "low";
  return "normal";
}

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

/** Convierte filas de una planilla en tareas, según el mapeo. Saltea filas sin título. */
export function mapRows(rows: Row[], mapping: Mapping): ImportedTask[] {
  const get = (row: Row, f: ImportField) => (mapping[f] ? row[mapping[f]!] : undefined);
  const out: ImportedTask[] = [];
  for (const row of rows) {
    const title = text(get(row, "title"));
    if (!title) continue;
    out.push({
      title,
      assignee: text(get(row, "assignee")) || null,
      due_date: parseDate(get(row, "due_date")),
      status: parseStatus(get(row, "status")),
      priority: parsePriority(get(row, "priority")),
      notes: text(get(row, "notes")),
      project: text(get(row, "project")) || null,
    });
  }
  return out;
}

/** Busca por nombre sin importar mayúsculas ni tildes; si hay "Kevin" y la celda dice "kevin p.", también matchea. */
export function findByName<T extends { name: string }>(items: T[], name: string): T | undefined {
  const n = norm(name);
  return (
    items.find((i) => norm(i.name) === n) ??
    items.find((i) => n.split(/\s+/)[0] === norm(i.name).split(/\s+/)[0] && n.length > 0)
  );
}
