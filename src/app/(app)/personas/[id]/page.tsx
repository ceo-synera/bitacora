"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, MessageCircle, Phone, Plus, Trash2, X } from "lucide-react";
import { insert, remove, update, useMembers, usePeople, useProjects, useTasks } from "@/lib/db";
import { today } from "@/lib/dates";
import type { Person } from "@/lib/types";
import { Empty, Section } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { ProjectDot } from "@/components/pickers";
import { TaskList } from "@/components/task-row";
import { QuickAdd } from "@/components/quick-add";
import { MarkdownField } from "@/components/markdown";
import { Field } from "@/components/task-fields";
import { t } from "@/lib/i18n";

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const { data: people, isFetched } = usePeople();
  const p = people.find((x) => x.id === id);
  if (!p) return <Empty>{isFetched ? t("No encontré a esa persona.", "Person not found.") : t("Cargando…", "Loading…")}</Empty>;
  return <PersonView key={p.id} p={p} />;
}

function PersonView({ p }: { p: Person }) {
  const router = useRouter();
  const { data: tasks } = useTasks();
  const { data: members } = useMembers();
  const { data: projects } = useProjects();
  const [showDone, setShowDone] = useState(false);
  const d = today();
  const set = (patch: Partial<Person>) => update("people", p.id, patch);

  const mine = tasks.filter((task) => task.assignee_id === p.id && !task.parent_id);
  const open = mine
    .filter((task) => task.status !== "done")
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.sort - b.sort);
  const done = mine.filter((task) => task.status === "done");
  const late = open.filter((task) => task.due_date && task.due_date < d).length;
  const myMembers = members.filter((m) => m.person_id === p.id);
  const free = projects.filter((x) => x.status === "active" && !myMembers.some((m) => m.project_id === x.id));
  const phoneDigits = p.phone?.replace(/[^\d]/g, "");

  return (
    <div className="max-w-3xl">
      <Link href="/personas" className="text-sm text-muted hover:text-ink">
        ← {t("Personas", "People")}
      </Link>
      <div className="mb-5 mt-2 flex items-center gap-3">
        <Avatar name={p.name} className="size-12 text-lg" />
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none"
            defaultValue={p.name}
            onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && set({ name: e.target.value.trim() })}
          />
          <div className="text-sm text-muted">
            {open.length} {t("abiertas", "open")}{late > 0 && <span className="text-danger"> · {late} {t("vencidas", "overdue")}</span>} · {done.length} {t("hechas", "done")}
          </div>
        </div>
        <div className="flex gap-1">
          {p.email && (
            <a className="btn-outline p-2" href={`mailto:${p.email}`} aria-label={t("Mandar mail", "Send email")}>
              <Mail className="size-4" />
            </a>
          )}
          {phoneDigits && (
            <>
              <a className="btn-outline p-2" href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <MessageCircle className="size-4" />
              </a>
              <a className="btn-outline p-2" href={`tel:${p.phone}`} aria-label={t("Llamar", "Call")}>
                <Phone className="size-4" />
              </a>
            </>
          )}
        </div>
      </div>

      <Section title={t("Ficha", "Details")}>
        <div className="card grid grid-cols-2 gap-3 p-4 text-sm">
          <Field label={t("Rol", "Role")}>
            <input className="input" defaultValue={p.role ?? ""} onBlur={(e) => e.target.value !== (p.role ?? "") && set({ role: e.target.value || null })} />
          </Field>
          <Field label={t("Equipo / empresa", "Team / company")}>
            <input className="input" defaultValue={p.team ?? ""} onBlur={(e) => e.target.value !== (p.team ?? "") && set({ team: e.target.value || null })} />
          </Field>
          <Field label={t("Mail", "Email")}>
            <input className="input" type="email" defaultValue={p.email ?? ""} onBlur={(e) => e.target.value !== (p.email ?? "") && set({ email: e.target.value || null })} />
          </Field>
          <Field label={t("Teléfono / WhatsApp", "Phone / WhatsApp")}>
            <input className="input" type="tel" placeholder="+598…" defaultValue={p.phone ?? ""} onBlur={(e) => e.target.value !== (p.phone ?? "") && set({ phone: e.target.value || null })} />
          </Field>
          <div className="col-span-2">
            <div className="mb-1 text-xs text-muted">{t("Notas", "Notes")}</div>
            <MarkdownField value={p.notes_md} onChange={(v) => set({ notes_md: v })} placeholder={t("Zona horaria, cómo prefiere que le escriban, contexto…", "Time zone, how they prefer to be contacted, context…")} rows={3} />
          </div>
        </div>
      </Section>

      <Section title={t("Proyectos", "Projects")} count={myMembers.length}>
        <ul className="card divide-y divide-line">
          {myMembers.map((m) => {
            const proj = projects.find((x) => x.id === m.project_id);
            if (!proj) return null;
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2">
                <ProjectDot color={proj.color} />
                <Link href={`/proyectos/${proj.id}`} className="text-sm font-medium hover:underline">
                  {proj.name}
                </Link>
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm text-muted outline-none"
                  placeholder={t("Rol en este proyecto", "Role in this project")}
                  defaultValue={m.role ?? ""}
                  onBlur={(e) => e.target.value !== (m.role ?? "") && update("project_members", m.id, { role: e.target.value || null })}
                />
                <button className="p-1 text-muted hover:text-danger" onClick={() => remove("project_members", m.id)} aria-label={t("Sacar del proyecto", "Remove from project")}>
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
          {free.length > 0 && (
            <li className="flex items-center gap-2 px-4 py-2">
              <Plus className="size-4 text-muted" />
              <select
                className="flex-1 bg-transparent py-1 text-sm text-muted outline-none"
                value=""
                onChange={(e) => e.target.value && insert("project_members", { project_id: e.target.value, person_id: p.id, role: p.role })}
              >
                <option value="">{t("Sumar a un proyecto…", "Add to a project…")}</option>
                {free.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </li>
          )}
        </ul>
      </Section>

      <Section title={t(`Lo que tiene ${p.name.split(" ")[0]}`, `${p.name.split(" ")[0]}'s tasks`)} count={open.length}>
        {open.length ? <TaskList tasks={open} /> : <Empty>{t("Nada pendiente.", "Nothing pending.")}</Empty>}
        <div className="mt-2">
          <QuickAdd defaults={{ assignee_id: p.id, project_id: myMembers.length === 1 ? myMembers[0].project_id : null }} placeholder={t(`Nueva tarea para ${p.name.split(" ")[0]}`, `New task for ${p.name.split(" ")[0]}`)} />
        </div>
        {done.length > 0 && (
          <button className="mt-3 text-sm text-muted hover:text-ink" onClick={() => setShowDone(!showDone)}>
            {showDone ? t("Ocultar", "Hide") : t("Ver", "Show")} {done.length} {t("hechas", "done")}
          </button>
        )}
        {showDone && <TaskList tasks={done} />}
      </Section>

      <button
        className="btn-ghost text-danger"
        onClick={() => {
          if (confirm(t(`¿Borrar a ${p.name}? Sus tareas quedan sin responsable.`, `Delete ${p.name}? Their tasks will be left unassigned.`))) {
            remove("people", p.id);
            router.replace("/personas");
          }
        }}
      >
        <Trash2 className="size-4" /> {t("Borrar persona", "Delete person")}
      </button>
    </div>
  );
}
