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
  Eye,
} from "lucide-react";
import { useAttendees, useFiles, useMembers, useMeetings, useNotes, usePendingCount, usePeople, useProjects, useTasks } from "@/lib/db";
import { Logo } from "./logo";
import { ProjectDot } from "./pickers";
import { TaskSheet } from "./task-sheet";
import { CommandPalette, openPalette } from "./command-palette";
import { Dialog } from "./ui";
import { CreateDialogs } from "./create-dialogs";
import { openCreate } from "./create-store";
import { isReadOnly } from "@/lib/role";
import { useReadOnly } from "@/lib/use-role";
import { useAutoTranslate } from "./auto-translate";
import { LangToggle } from "./lang-toggle";
import { t } from "@/lib/i18n";

// Las etiquetas se calculan al dibujar, para que respeten el idioma actual.
const NAV = [
  { href: "/", get label() { return t("Hoy", "Today"); }, icon: Sun },
  { href: "/bandeja", get label() { return t("Bandeja", "Inbox"); }, icon: Inbox },
  { href: "/tareas", get label() { return t("Tareas", "Tasks"); }, icon: ListTodo },
  { href: "/reuniones", get label() { return t("Reuniones", "Meetings"); }, icon: Users2 },
  { href: "/archivos", get label() { return t("Archivos", "Files"); }, icon: FolderOpen },
  { href: "/notas", get label() { return t("Notas", "Notes"); }, icon: NotebookPen },
  { href: "/proyectos", get label() { return t("Proyectos", "Projects"); }, icon: FolderKanban },
  { href: "/personas", get label() { return t("Personas", "People"); }, icon: Contact },
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
  const readOnly = useReadOnly();
  useEffect(() => {
    // Tecla "c" (fuera de un campo de texto): abrir Crear.
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "c" && !isReadOnly() && !e.metaKey && !e.ctrlKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && !el.isContentEditable) {
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
  useAttendees();
  useAutoTranslate();
  const inboxCount = tasks.filter((task) => task.status === "inbox").length;
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
          <Search className="size-4" /> {t("Buscar", "Search")}
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
          <div className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-muted">{t("Proyectos", "Projects")}</div>
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
          <div className="flex items-center gap-1">
            <Link href="/ajustes" className="flex flex-1 items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-soft hover:text-ink">
              <Settings className="size-4" /> {t("Ajustes", "Settings")}
            </Link>
            <LangToggle />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (celular) */}
        <header className="pt-safe sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/90 px-4 py-2 backdrop-blur md:hidden">
          <Logo className="size-6" />
          <span className="font-semibold">Bitácora</span>
          <LangToggle className="ml-auto" />
          <button onClick={openPalette} className="btn-ghost p-2" aria-label={t("Buscar", "Search")}>
            <Search className="size-5" />
          </button>
        </header>

        {readOnly && (
          <div className="flex items-center justify-center gap-2 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent">
            <Eye className="size-3.5" />
            {t("Solo lectura: podés mirar todo, pero no se guardan cambios.", "Read-only: you can look around, but changes aren't saved.")}
          </div>
        )}

        {(!online || pending > 0) && (
          <div className="flex items-center justify-center gap-2 bg-soft px-4 py-1.5 text-xs text-muted">
            <CloudOff className="size-3.5" />
            {!online ? t("Sin conexión. ", "Offline. ") : ""}
            {pending > 0
              ? pending === 1
                ? t("1 cambio sin subir", "1 change not synced")
                : t(`${pending} cambios sin subir`, `${pending} changes not synced`)
              : t("Mostrando lo último que cargaste", "Showing what you last loaded")}
          </div>
        )}

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">{children}</main>
      </div>

      {/* Botón de captura */}
      {!readOnly && (
      <button
        onClick={() => openCreate({ kind: "menu" })}
        className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg md:bottom-6 md:right-6"
        aria-label={t("Crear", "Create")}
      >
        <Plus className="size-6" />
      </button>
      )}

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
          {t("Más", "More")}
        </button>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title={t("Más", "More")}>
        <div className="grid gap-1">
          {[...NAV.slice(4), { href: "/ajustes", label: t("Ajustes", "Settings"), icon: Settings }].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-soft">
              <Icon className="size-5 text-muted" /> {label}
            </Link>
          ))}
          <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">{t("Proyectos", "Projects")}</div>
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
