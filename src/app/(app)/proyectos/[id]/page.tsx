"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArchiveRestore, Trash2, UserPlus, Users, X } from "lucide-react";
import { insert, remove, update, useFiles, useMeetings, useMembers, usePeople, useProjects, useTasks } from "@/lib/db";
import { addDaysISO, longDate, today } from "@/lib/dates";
import { uploadFile } from "@/lib/files";
import { toast } from "@/lib/toast";
import { Empty, Section, Tabs } from "@/components/ui";
import { TaskViews } from "@/components/task-views";
import { NotesList } from "@/components/notes-list";
import { FileList } from "@/components/file-list";
import { FileDrop } from "@/components/dropzone";
import { AddLinkButton } from "@/components/add-link";
import { Attachments } from "@/components/attachments";
import { Avatar } from "@/components/avatar";
import { MarkdownField } from "@/components/markdown";
import { QuickAdd } from "@/components/quick-add";
import { TaskList } from "@/components/task-row";
import { openCreate } from "@/components/create-store";
import { COLORS, type Project } from "@/lib/types";

type Tab = "resumen" | "tareas" | "reuniones" | "archivos" | "notas" | "equipo";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: projects, isFetched } = useProjects();
  const [tab, setTab] = useState<Tab>("resumen");
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
          { value: "resumen", label: "Resumen" },
          { value: "tareas", label: "Tareas" },
          { value: "reuniones", label: "Reuniones" },
          { value: "archivos", label: "Archivos" },
          { value: "notas", label: "Notas" },
          { value: "equipo", label: "Equipo" },
        ]}
      />
      {tab === "resumen" && <ProjectSummary project={p} goTo={setTab} />}
      {tab === "tareas" && <TaskViews projectId={p.id} storageKey={`proyecto-${p.id}`} />}
      {tab === "reuniones" && <ProjectMeetings projectId={p.id} />}
      {tab === "archivos" && <ProjectFiles projectId={p.id} />}
      {tab === "notas" && <NotesList projectId={p.id} />}
      {tab === "equipo" && <ProjectTeam projectId={p.id} />}
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

function ProjectSummary({ project, goTo }: { project: Project; goTo: (t: Tab) => void }) {
  const { data: tasks } = useTasks();
  const { data: meetings } = useMeetings();
  const { data: members } = useMembers();
  const { data: people } = usePeople();
  const d = today();
  const ts = tasks.filter((t) => t.project_id === project.id && !t.parent_id && t.status !== "inbox");
  const open = ts.filter((t) => t.status !== "done");
  const late = open.filter((t) => t.due_date && t.due_date < d);
  const waiting = open.filter((t) => t.assignee_id || t.status === "waiting");
  const doneWeek = ts.filter((t) => t.status === "done" && (t.done_at ?? "") >= addDaysISO(d, -7));
  const next = open
    .filter((t) => !t.assignee_id && t.status !== "waiting")
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || (a.priority === "high" ? -1 : 0))
    .slice(0, 5);
  const ms = meetings.filter((m) => m.project_id === project.id);
  const upcoming = [...ms].filter((m) => m.date >= d).sort((a, b) => a.date.localeCompare(b.date))[0];
  const last = ms.filter((m) => m.date < d).sort((a, b) => b.date.localeCompare(a.date))[0];
  const team = members.filter((m) => m.project_id === project.id);

  const stat = (n: number, label: string, tone = "") => (
    <div className="card p-3">
      <div className={`text-2xl font-semibold ${tone}`}>{n}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <Section title="De qué se trata">
          <MarkdownField
            value={project.description_md}
            onChange={(v) => update("projects", project.id, { description_md: v })}
            placeholder="Objetivo, cliente, qué hay que entregar, decisiones importantes…"
            rows={5}
          />
        </Section>
        <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {stat(open.length, "abiertas")}
          {stat(late.length, "vencidas", late.length ? "text-danger" : "")}
          {stat(waiting.length, "esperando de otros")}
          {stat(doneWeek.length, "hechas esta semana")}
        </div>
        <Section title="Lo próximo tuyo">
          {next.length ? <TaskList tasks={next} showProject={false} /> : <Empty>Nada pendiente tuyo.</Empty>}
          <div className="mt-2">
            <QuickAdd defaults={{ project_id: project.id }} />
          </div>
        </Section>
        <Section title="Links clave">
          <Attachments limit={8} meta={{ project_id: project.id }} filter={(f) => f.project_id === project.id && !f.task_id && !f.meeting_id} />
        </Section>
      </div>
      <aside>
        <Section title="Reuniones">
          <div className="card divide-y divide-line text-sm">
            {upcoming && (
              <Link href={`/reuniones/${upcoming.id}`} className="block px-3 py-2 hover:bg-soft">
                <div className="text-xs text-muted">Próxima</div>
                {longDate(upcoming.date)}
              </Link>
            )}
            {last && (
              <Link href={`/reuniones/${last.id}`} className="block px-3 py-2 hover:bg-soft">
                <div className="text-xs text-muted">Última</div>
                {longDate(last.date)}
              </Link>
            )}
            {!upcoming && !last && <p className="px-3 py-2 text-muted">Sin reuniones.</p>}
          </div>
        </Section>
        <Section title="Equipo" count={team.length}>
          <div className="card divide-y divide-line">
            {team.map((m) => {
              const person = people.find((x) => x.id === m.person_id);
              if (!person) return null;
              const n = open.filter((t) => t.assignee_id === person.id).length;
              return (
                <Link key={m.id} href={`/personas/${person.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-soft">
                  <Avatar name={person.name} className="size-7 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{person.name}</div>
                    {m.role && <div className="truncate text-xs text-muted">{m.role}</div>}
                  </div>
                  {n > 0 && <span className="text-xs text-muted">{n}</span>}
                </Link>
              );
            })}
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted hover:bg-soft" onClick={() => goTo("equipo")}>
              <Users className="size-4" /> Armar equipo
            </button>
          </div>
        </Section>
      </aside>
    </div>
  );
}

function ProjectTeam({ projectId }: { projectId: string }) {
  const { data: members } = useMembers();
  const { data: people } = usePeople();
  const { data: tasks } = useTasks();
  const team = members.filter((m) => m.project_id === projectId);
  const outside = people.filter((p) => !team.some((m) => m.person_id === p.id));
  return (
    <div className="max-w-2xl space-y-3">
      {team.length === 0 && <Empty>Nadie en el equipo todavía.</Empty>}
      {team.length > 0 && (
        <ul className="card divide-y divide-line">
          {team.map((m) => {
            const person = people.find((x) => x.id === m.person_id);
            if (!person) return null;
            const open = tasks.filter((t) => t.project_id === projectId && t.assignee_id === person.id && !t.parent_id && t.status !== "done").length;
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={person.name} className="size-8 text-xs" />
                <div className="min-w-0 flex-1">
                  <Link href={`/personas/${person.id}`} className="text-sm font-medium hover:underline">
                    {person.name}
                  </Link>
                  <input
                    className="block w-full bg-transparent text-xs text-muted outline-none"
                    placeholder="Rol en el proyecto"
                    defaultValue={m.role ?? ""}
                    onBlur={(e) => e.target.value !== (m.role ?? "") && update("project_members", m.id, { role: e.target.value || null })}
                  />
                </div>
                <span className="text-xs text-muted">{open} abiertas</span>
                <button className="p-1 text-muted hover:text-danger" onClick={() => remove("project_members", m.id)} aria-label="Sacar del equipo">
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {outside.length > 0 && (
          <select
            className="input w-auto"
            value=""
            onChange={(e) => {
              const person = people.find((x) => x.id === e.target.value);
              if (person) insert("project_members", { project_id: projectId, person_id: person.id, role: person.role });
            }}
          >
            <option value="">Sumar a alguien que ya existe…</option>
            {outside.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.team ? ` · ${p.team}` : ""}
              </option>
            ))}
          </select>
        )}
        <button className="btn-primary" onClick={() => openCreate({ kind: "person", defaults: { project_id: projectId } })}>
          <UserPlus className="size-4" /> Nueva persona en el proyecto
        </button>
      </div>
    </div>
  );
}
