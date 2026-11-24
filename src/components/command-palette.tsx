"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckSquare, FileText, FolderKanban, NotebookPen, Users2, ArrowRight, Contact, Plus } from "lucide-react";
import { useFiles, useMeetings, useNotes, usePeople, useProjects, useTasks } from "@/lib/db";
import { openCreate } from "./create-store";
import { longDate } from "@/lib/dates";
import { openTask } from "./open-task";

let open = false;
const ls = new Set<() => void>();
const setOpen = (v: boolean) => {
  open = v;
  ls.forEach((l) => l());
};
export const openPalette = () => setOpen(true);

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filtro sin tildes: todas las palabras tienen que aparecer. */
function filter(value: string, search: string, keywords?: string[]) {
  const hay = fold([value, ...(keywords ?? [])].join(" "));
  return fold(search)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
    ? 1
    : 0;
}

export function CommandPalette() {
  const isOpen = useSyncExternalStore(
    (cb) => {
      ls.add(cb);
      return () => ls.delete(cb);
    },
    () => open,
    () => false,
  );
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data: tasks } = useTasks();
  const { data: notes } = useNotes();
  const { data: meetings } = useMeetings();
  const { data: files } = useFiles();
  const { data: projects } = useProjects();
  const { data: people } = usePeople();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    setOpen(false);
    setQ("");
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };

  const item = "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm aria-selected:bg-soft";
  const heading = "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted";

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={(v) => (v ? setOpen(true) : close())}
      filter={filter}
      label="Buscar"
      overlayClassName="fixed inset-0 z-50 bg-black/40"
      contentClassName="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-xl md:top-[12vh]"
      className="overflow-hidden border border-line bg-panel shadow-2xl md:rounded-2xl"
    >
      <Command.Input
        value={q}
        onValueChange={setQ}
        placeholder="Buscar tareas, notas, reuniones, archivos…"
        className="pt-safe w-full border-b border-line bg-transparent px-4 py-3 text-base outline-none"
      />
      <Command.List className={`max-h-[70dvh] overflow-y-auto p-2 ${heading}`}>
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted">Nada por acá.</Command.Empty>
        <Command.Group heading="Crear">
          {(
            [
              ["Nueva tarea", () => openCreate({ kind: "task" })],
              ["Nueva persona", () => openCreate({ kind: "person" })],
              ["Nuevo proyecto", () => openCreate({ kind: "project" })],
            ] as const
          ).map(([label, run]) => (
            <Command.Item key={label} value={`crear ${label}`} onSelect={() => (close(), run())} className={item}>
              <Plus className="size-4 text-muted" /> {label}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Ir a">
          {[
            ["Hoy", "/"],
            ["Bandeja", "/bandeja"],
            ["Tareas", "/tareas"],
            ["Reuniones", "/reuniones"],
            ["Archivos", "/archivos"],
            ["Notas", "/notas"],
            ["Proyectos", "/proyectos"],
            ["Personas", "/personas"],
            ["Ajustes", "/ajustes"],
          ].map(([label, href]) => (
            <Command.Item key={href} value={`ir ${label}`} onSelect={() => go(href)} className={item}>
              <ArrowRight className="size-4 text-muted" /> {label}
            </Command.Item>
          ))}
        </Command.Group>
        {q.trim() && (
        <>
        <Command.Group heading="Proyectos">
          {projects.map((p) => (
            <Command.Item key={p.id} value={`proyecto ${p.id}`} keywords={[p.name]} onSelect={() => go(`/proyectos/${p.id}`)} className={item}>
              <FolderKanban className="size-4 text-muted" /> {p.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Personas">
          {people.map((p) => (
            <Command.Item key={p.id} value={`persona ${p.id}`} keywords={[p.name, p.role ?? "", p.team ?? "", p.email ?? ""]} onSelect={() => go(`/personas/${p.id}`)} className={item}>
              <Contact className="size-4 text-muted" /> {p.name}
              {p.role && <span className="truncate text-xs text-muted">{p.role}</span>}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Tareas">
          {tasks
            .filter((t) => !t.parent_id)
            .map((t) => (
              <Command.Item
                key={t.id}
                value={`tarea ${t.id}`}
                keywords={[t.title, t.notes_md]}
                onSelect={() => {
                  close();
                  openTask(t.id);
                }}
                className={item}
              >
                <CheckSquare className="size-4 shrink-0 text-muted" />
                <span className={`truncate ${t.status === "done" ? "text-muted line-through" : ""}`}>{t.title}</span>
              </Command.Item>
            ))}
        </Command.Group>
        <Command.Group heading="Notas">
          {notes.map((n) => (
            <Command.Item key={n.id} value={`nota ${n.id}`} keywords={[n.title, n.body_md]} onSelect={() => go(`/notas/${n.id}`)} className={item}>
              <NotebookPen className="size-4 shrink-0 text-muted" />
              <span className="truncate">{n.title || "Sin título"}</span>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Reuniones">
          {meetings.map((m) => (
            <Command.Item
              key={m.id}
              value={`reunion ${m.id}`}
              keywords={[m.title, m.notes_md, m.date, longDate(m.date)]}
              onSelect={() => go(`/reuniones/${m.id}`)}
              className={item}
            >
              <Users2 className="size-4 shrink-0 text-muted" />
              <span className="truncate">
                {m.title || "Reunión"} · {longDate(m.date)}
              </span>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Archivos">
          {files.map((f) => (
            <Command.Item key={f.id} value={`archivo ${f.id}`} keywords={[f.name]} onSelect={() => go(`/archivos/${f.id}`)} className={item}>
              <FileText className="size-4 shrink-0 text-muted" />
              <span className="truncate">{f.name}</span>
            </Command.Item>
          ))}
        </Command.Group>
        </>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
