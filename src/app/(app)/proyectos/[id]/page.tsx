"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { remove, update, useFiles, useMeetings, usePeople, useProjects, useTasks } from "@/lib/db";
import { longDate } from "@/lib/dates";
import { uploadFile } from "@/lib/files";
import { toast } from "@/lib/toast";
import { Empty, Tabs } from "@/components/ui";
import { TaskViews } from "@/components/task-views";
import { NotesList } from "@/components/notes-list";
import { FileList } from "@/components/file-list";
import { FileDrop } from "@/components/dropzone";
import { AddLinkButton } from "@/components/add-link";
import { COLORS } from "@/lib/types";

type Tab = "tareas" | "reuniones" | "archivos" | "notas" | "personas";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: projects, isFetched } = useProjects();
  const [tab, setTab] = useState<Tab>("tareas");
  const p = projects.find((x) => x.id === id);
  if (!p) return <Empty>{isFetched ? "No encontré ese proyecto." : "Cargando…"}</Empty>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => update("projects", p.id, { color: c })}
              className={`size-4 rounded-full ${p.color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-bg" : ""}`}
              style={{ background: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <input
          className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-tight outline-none"
          defaultValue={p.name}
          onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && update("projects", p.id, { name: e.target.value.trim() })}
        />
        <button className="btn-outline" onClick={() => update("projects", p.id, { status: p.status === "active" ? "archived" : "active" })}>
          {p.status === "active" ? (
            <>
              <Archive className="size-4" /> Archivar
            </>
          ) : (
            <>
              <ArchiveRestore className="size-4" /> Reactivar
            </>
          )}
        </button>
        {p.status === "archived" && (
          <button
            className="btn-ghost p-2 text-muted hover:text-danger"
            aria-label="Borrar proyecto"
            onClick={() => {
              if (confirm(`¿Borrar "${p.name}"? Sus tareas, notas y archivos quedan sin proyecto.`)) {
                remove("projects", p.id);
                router.replace("/proyectos");
              }
            }}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "tareas", label: "Tareas" },
          { value: "reuniones", label: "Reuniones" },
          { value: "archivos", label: "Archivos" },
          { value: "notas", label: "Notas" },
          { value: "personas", label: "Personas" },
        ]}
      />
      {tab === "tareas" && <TaskViews projectId={p.id} storageKey={`proyecto-${p.id}`} />}
      {tab === "reuniones" && <ProjectMeetings projectId={p.id} />}
      {tab === "archivos" && <ProjectFiles projectId={p.id} />}
      {tab === "notas" && <NotesList projectId={p.id} />}
      {tab === "personas" && <ProjectPeople projectId={p.id} />}
    </div>
  );
}

function ProjectMeetings({ projectId }: { projectId: string }) {
  const { data: meetings } = useMeetings();
  const ms = meetings.filter((m) => m.project_id === projectId);
  if (!ms.length) return <Empty>Sin reuniones en este proyecto.</Empty>;
  return (
    <ul className="card divide-y divide-line">
      {ms.map((m) => (
        <li key={m.id}>
          <Link href={`/reuniones/${m.id}`} className="block px-4 py-3 hover:bg-soft">
            <div className="text-sm font-medium">{longDate(m.date)}</div>
            <div className="text-xs text-muted">{m.title}</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ProjectFiles({ projectId }: { projectId: string }) {
  const { data: files } = useFiles();
  const [busy, setBusy] = useState(false);
  const fs = files.filter((f) => f.project_id === projectId);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <FileDrop
            compact
            busy={busy}
            onFiles={async (list) => {
              setBusy(true);
              try {
                for (const f of list) await uploadFile(f, { project_id: projectId });
              } catch (e) {
                toast((e as Error).message, "error");
              }
              setBusy(false);
            }}
          />
        </div>
        <AddLinkButton meta={{ project_id: projectId }} />
      </div>
      {fs.length ? <FileList files={fs} showProject={false} /> : <Empty>Sin archivos.</Empty>}
    </div>
  );
}

/** Personas con tareas en este proyecto, y cuántas tienen abiertas. */
function ProjectPeople({ projectId }: { projectId: string }) {
  const { data: tasks } = useTasks();
  const { data: people } = usePeople();
  const rows = people
    .map((p) => {
      const ts = tasks.filter((t) => t.project_id === projectId && t.assignee_id === p.id && !t.parent_id);
      return { p, open: ts.filter((t) => t.status !== "done").length, total: ts.length };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.open - a.open);
  if (!rows.length) return <Empty>Nadie tiene tareas asignadas en este proyecto. Las personas se cargan en Ajustes.</Empty>;
  return (
    <ul className="card divide-y divide-line">
      {rows.map(({ p, open, total }) => (
        <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
          <span>
            {p.name}
            {p.team && <span className="ml-2 text-xs text-muted">{p.team}</span>}
          </span>
          <span className="text-xs text-muted">
            {open} abiertas · {total} en total
          </span>
        </li>
      ))}
    </ul>
  );
}
