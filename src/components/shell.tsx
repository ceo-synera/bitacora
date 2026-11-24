"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Sun,
  Inbox,
  ListTodo,
  Users2,
  FolderOpen,
  NotebookPen,
  Settings,
  Search,
  Plus,
  Menu,
  CloudOff,
  FolderKanban,
  Contact,
} from "lucide-react";
import { useFiles, useMembers, useMeetings, useNotes, usePendingCount, usePeople, useProjects, useTasks } from "@/lib/db";
import { Logo } from "./logo";
import { ProjectDot } from "./pickers";
import { TaskSheet } from "./task-sheet";
import { CommandPalette, openPalette } from "./command-palette";
import { Dialog } from "./ui";
import { CreateDialogs } from "./create-dialogs";
import { openCreate } from "./create-store";

const NAV = [
  { href: "/", label: "Hoy", icon: Sun },
  { href: "/bandeja", label: "Bandeja", icon: Inbox },
  { href: "/tareas", label: "Tareas", icon: ListTodo },
  { href: "/reuniones", label: "Reuniones", icon: Users2 },
  { href: "/archivos", label: "Archivos", icon: FolderOpen },
  { href: "/notas", label: "Notas", icon: NotebookPen },
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/personas", label: "Personas", icon: Contact },
];

function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Shell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Tecla "c" (fuera de un campo de texto): abrir Crear.
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        openCreate({ kind: "menu" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const path = usePathname();
  const { data: tasks } = useTasks();
  const { data: projects } = useProjects();
  // Todas las tablas quedan cargadas (y en caché para usar sin conexión), se abra la pantalla que se abra.
  usePeople();
  useMeetings();
  useNotes();
  useFiles();
  useMembers();
  const inboxCount = tasks.filter((t) => t.status === "inbox").length;
  const online = useOnline();
  const pending = usePendingCount();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      {/* Barra lateral (compu) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-panel md:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <Logo className="size-7" />
          <span className="font-semibold">Bitácora</span>
        </div>
        <button onClick={openPalette} className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:bg-soft">
          <Search className="size-4" /> Buscar
          <kbd className="ml-auto text-xs">⌘K</kbd>
        </button>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm ${
                isActive(path, href) ? "bg-soft font-medium" : "text-muted hover:bg-soft hover:text-ink"
              }`}
            >
              <Icon className="size-4" />
              {label}
              {href === "/bandeja" && inboxCount > 0 && <span className="ml-auto text-xs">{inboxCount}</span>}
            </Link>
          ))}
          <div className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-muted">Proyectos</div>
          {projects
            .filter((p) => p.status === "active")
            .map((p) => (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm ${
                  path === `/proyectos/${p.id}` ? "bg-soft font-medium" : "text-muted hover:bg-soft hover:text-ink"
                }`}
              >
                <ProjectDot color={p.color} />
                <span className="truncate">{p.name}</span>
              </Link>
            ))}
        </nav>
        <div className="border-t border-line p-2">
          <Link href="/ajustes" className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-soft hover:text-ink">
            <Settings className="size-4" /> Ajustes
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (celular) */}
        <header className="pt-safe sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/90 px-4 py-2 backdrop-blur md:hidden">
          <Logo className="size-6" />
          <span className="font-semibold">Bitácora</span>
          <button onClick={openPalette} className="btn-ghost ml-auto p-2" aria-label="Buscar">
            <Search className="size-5" />
          </button>
        </header>

        {(!online || pending > 0) && (
          <div className="flex items-center justify-center gap-2 bg-soft px-4 py-1.5 text-xs text-muted">
            <CloudOff className="size-3.5" />
            {!online ? "Sin conexión. " : ""}
            {pending > 0 ? `${pending} ${pending === 1 ? "cambio" : "cambios"} sin subir` : "Mostrando lo último que cargaste"}
          </div>
        )}

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">{children}</main>
      </div>

      {/* Botón de captura */}
      <button
        onClick={() => openCreate({ kind: "menu" })}
        className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg md:bottom-6 md:right-6"
        aria-label="Crear"
      >
        <Plus className="size-6" />
      </button>

      {/* Navegación inferior (celular) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-panel md:hidden">
        {NAV.slice(0, 4).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(path, href) ? "text-accent" : "text-muted"}`}
          >
            <Icon className="size-5" />
            {label}
            {href === "/bandeja" && inboxCount > 0 && (
              <span className="absolute right-[22%] top-1 rounded-full bg-accent px-1.5 text-[10px] text-accent-ink">{inboxCount}</span>
            )}
          </Link>
        ))}
        <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted">
          <Menu className="size-5" />
          Más
        </button>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="Más">
        <div className="grid gap-1">
          {[...NAV.slice(4), { href: "/ajustes", label: "Ajustes", icon: Settings }].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-soft">
              <Icon className="size-5 text-muted" /> {label}
            </Link>
          ))}
          <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">Proyectos</div>
          {projects
            .filter((p) => p.status === "active")
            .map((p) => (
              <Link key={p.id} href={`/proyectos/${p.id}`} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-soft">
                <ProjectDot color={p.color} className="size-2.5" /> {p.name}
              </Link>
            ))}
        </div>
      </Dialog>

      <CreateDialogs />
      <TaskSheet />
      <CommandPalette />
    </div>
  );
}
