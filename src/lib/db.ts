"use client";

import { QueryClient, useQuery } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { toast } from "./toast";
import { t } from "./i18n";
import type { TableName, Tables } from "./types";

/*
 * Capa de datos.
 * - Cada tabla se trae entera (es un solo usuario, son pocos datos) y queda en caché en IndexedDB,
 *   así sin conexión se ve lo último que cargaste.
 * - Todo cambio se aplica al instante en pantalla y entra a una cola ("outbox") guardada en IndexedDB.
 *   La cola se manda en orden apenas hay red; si no hay, espera.
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 30,
      networkMode: "offlineFirst",
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (k) => (await get(k)) ?? null,
    setItem: (k, v) => set(k, v),
    removeItem: (k) => del(k),
  },
  key: "bitacora-cache",
  throttleTime: 1000,
});

const ORDER: Record<TableName, { column: string; ascending: boolean }> = {
  projects: { column: "created_at", ascending: true },
  people: { column: "name", ascending: true },
  tasks: { column: "created_at", ascending: true },
  meetings: { column: "date", ascending: false },
  notes: { column: "updated_at", ascending: false },
  files: { column: "created_at", ascending: false },
  project_members: { column: "created_at", ascending: true },
  meeting_attendees: { column: "created_at", ascending: true },
};

// ---------- outbox ----------

type Op<T extends TableName = TableName> =
  | { id: string; table: T; kind: "insert"; row: Partial<Tables[T]> & { id: string } }
  | { id: string; table: T; kind: "update"; rowId: string; patch: Partial<Tables[T]> }
  | { id: string; table: T; kind: "delete"; rowId: string };

const OUTBOX_KEY = "bitacora-outbox";
let outbox: Op[] = [];
let outboxLoaded: Promise<void> | null = null;
const outboxListeners = new Set<() => void>();

function loadOutbox() {
  outboxLoaded ??= get<Op[]>(OUTBOX_KEY).then((v) => {
    outbox = v ?? [];
    outboxListeners.forEach((l) => l());
  });
  return outboxLoaded;
}

async function saveOutbox() {
  await set(OUTBOX_KEY, outbox);
  outboxListeners.forEach((l) => l());
}

export function usePendingCount() {
  return useSyncExternalStore(
    (cb) => {
      outboxListeners.add(cb);
      return () => outboxListeners.delete(cb);
    },
    () => outbox.length,
    () => 0,
  );
}

function applyOp<T extends TableName>(rows: Tables[T][], op: Op<T>): Tables[T][] {
  switch (op.kind) {
    case "insert": {
      const exists = rows.some((r) => r.id === op.row.id);
      return exists
        ? rows.map((r) => (r.id === op.row.id ? ({ ...r, ...op.row } as Tables[T]) : r))
        : [...rows, op.row as Tables[T]];
    }
    case "update":
      return rows.map((r) => (r.id === op.rowId ? ({ ...r, ...op.patch } as Tables[T]) : r));
    case "delete":
      return rows.filter(
        (r) => r.id !== op.rowId && !(op.table === "tasks" && (r as Tables["tasks"]).parent_id === op.rowId),
      );
  }
}

const isNetworkError = (e: { message?: string; code?: string } | null, status?: number) =>
  status === 0 ||
  (typeof navigator !== "undefined" && !navigator.onLine) ||
  /fetch|network|load failed/i.test(e?.message ?? "");

let flushing: Promise<void> | null = null;

export function flush(): Promise<void> {
  flushing ??= (async () => {
    await loadOutbox();
    while (outbox.length) {
      const op = outbox[0];
      let res: { error: { message: string; code?: string } | null; status?: number };
      try {
        if (op.kind === "insert") res = await supabase.from(op.table).upsert(op.row as never);
        else if (op.kind === "update") res = await supabase.from(op.table).update(op.patch as never).eq("id", op.rowId);
        else res = await supabase.from(op.table).delete().eq("id", op.rowId);
      } catch (e) {
        res = { error: { message: String(e) }, status: 0 };
      }
      if (res.error && isNetworkError(res.error, res.status)) return; // sin red: queda en cola
      if (res.error) {
        toast(`${t("No se pudo guardar un cambio", "Couldn't save a change")}: ${res.error.message}`, "error");
        queryClient.invalidateQueries({ queryKey: [op.table] });
      }
      outbox.shift();
      await saveOutbox();
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => flush());
  loadOutbox().then(() => flush());
}

function enqueue(op: Op) {
  queryClient.setQueryData<Tables[TableName][]>([op.table], (rows = []) => applyOp(rows, op));
  outbox.push(op);
  saveOutbox().then(() => flush());
}

// ---------- lectura ----------

async function fetchTable<T extends TableName>(table: T): Promise<Tables[T][]> {
  await loadOutbox();
  const o = ORDER[table];
  const { data, error } = await supabase.from(table).select("*").order(o.column, { ascending: o.ascending });
  if (error) throw new Error(error.message);
  // Lo que todavía está en cola se aplica arriba de lo que vino del servidor.
  return outbox.filter((op) => op.table === table).reduce((rows, op) => applyOp(rows, op as Op<T>), data as Tables[T][]);
}

export function useTable<T extends TableName>(table: T) {
  const q = useQuery({ queryKey: [table], queryFn: () => fetchTable(table) });
  return { ...q, data: (q.data ?? []) as Tables[T][] };
}

export const useProjects = () => useTable("projects");
export const usePeople = () => useTable("people");
export const useTasks = () => useTable("tasks");
export const useMeetings = () => useTable("meetings");
export const useNotes = () => useTable("notes");
export const useFiles = () => useTable("files");
export const useMembers = () => useTable("project_members");
export const useAttendees = () => useTable("meeting_attendees");

// ---------- escritura ----------

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

const DEFAULTS: { [T in TableName]: () => Omit<Tables[T], "id"> } = {
  projects: () => ({ name: "", color: "#6366f1", status: "active", description_md: "", created_at: now() }),
  people: () => ({ name: "", email: null, team: null, role: null, phone: null, notes_md: "", created_at: now() }),
  project_members: () => ({ project_id: "", person_id: "", role: null, created_at: now() }),
  meeting_attendees: () => ({ meeting_id: "", person_id: "", created_at: now() }),
  tasks: () => ({
    project_id: null,
    meeting_id: null,
    parent_id: null,
    title: "",
    notes_md: "",
    assignee_id: null,
    status: "todo",
    priority: "normal",
    due_date: null,
    due_time: null,
    recurrence: null,
    sort: Date.now(),
    created_at: now(),
    updated_at: now(),
    done_at: null,
  }),
  meetings: () => ({ project_id: null, date: "", title: "", notes_md: "", recording_url: null, created_at: now() }),
  notes: () => ({ project_id: null, title: "", body_md: "", pinned: false, created_at: now(), updated_at: now() }),
  files: () => ({
    project_id: null,
    meeting_id: null,
    task_id: null,
    name: "",
    kind: "link",
    role: null,
    storage_path: null,
    url: null,
    mime: null,
    size_bytes: null,
    created_at: now(),
  }),
};

export function insert<T extends TableName>(table: T, values: Partial<Tables[T]>): Tables[T] {
  const row = { ...DEFAULTS[table](), id: newId(), ...values } as Tables[T];
  enqueue({ id: newId(), table, kind: "insert", row } as Op);
  return row;
}

export function update<T extends TableName>(table: T, rowId: string, patch: Partial<Tables[T]>) {
  const p = "updated_at" in DEFAULTS[table]() ? { ...patch, updated_at: now() } : patch;
  enqueue({ id: newId(), table, kind: "update", rowId, patch: p } as Op);
}

export function remove(table: TableName, rowId: string) {
  enqueue({ id: newId(), table, kind: "delete", rowId });
}

/** Espera a que una tabla esté cargada (del caché o de la red) y la devuelve. */
export async function ready<T extends TableName>(table: T): Promise<Tables[T][]> {
  try {
    return await queryClient.ensureQueryData({ queryKey: [table], queryFn: () => fetchTable(table) });
  } catch {
    return snapshot(table); // sin red y sin caché: lo que haya
  }
}

/** Lee una tabla del caché sin suscribirse (para usar dentro de acciones). */
export function snapshot<T extends TableName>(table: T): Tables[T][] {
  return (queryClient.getQueryData<Tables[T][]>([table]) ?? []) as Tables[T][];
}

/** Mezcla datos que vienen del servidor (por ejemplo, traducciones) en el caché, sin pasar por la cola. */
export function mergeLocal<T extends TableName>(table: T, rows: (Partial<Tables[T]> & { id: string })[]) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  queryClient.setQueryData<Tables[T][]>([table], (old = []) => old.map((r) => (byId.has(r.id) ? ({ ...r, ...byId.get(r.id) } as Tables[T]) : r)));
}
