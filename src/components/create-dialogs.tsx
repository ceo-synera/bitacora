"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckSquare, FolderKanban, Inbox, Link2, NotebookPen, Plus, UserPlus, Users2, X } from "lucide-react";
import { insert, ready, snapshot, useProjects } from "@/lib/db";
import { addLink, linkName, normalizeUrl, uploadFile } from "@/lib/files";
import { capture } from "@/lib/actions";
import { culebroId, meetingFor } from "@/lib/meetings";
import { addDaysISO, isMonday, mondayOf, today } from "@/lib/dates";
import { toast } from "@/lib/toast";
import { COLORS, type Person, type Project, type Task } from "@/lib/types";
import { closeCreate, openCreate, useCreateStack, type CreateState } from "./create-store";
import { Field, TaskFields } from "./task-fields";
import { ProjectSelect } from "./pickers";
import { Dialog } from "./ui";
import { t } from "@/lib/i18n";

/** Monta los formularios de crear que estén abiertos (pueden ser varios apilados). */
export function CreateDialogs() {
  const stack = useCreateStack();
  return (
    <>
      {stack.map((s, i) => (
        <CreateDialog key={i} state={s} />
      ))}
    </>
  );
}

function CreateDialog({ state }: { state: CreateState }) {
  if (!state) return null;
  if (state.kind === "menu") return <CreateMenu />;
  if (state.kind === "task") return <NewTask defaults={state.defaults} />;
  if (state.kind === "person") return <NewPerson state={state} />;
  if (state.kind === "project") return <NewProject state={state} />;
  return null;
}

function CreateMenu() {
  const router = useRouter();
  const [v, setV] = useState("");
  const go = (fn: () => void) => {
    closeCreate();
    fn();
  };
  const items = [
    { icon: CheckSquare, label: t("Tarea", "Task"), hint: t("con responsable, fecha, links…", "with owner, date, links…"), run: () => openCreate({ kind: "task" }) },
    { icon: UserPlus, label: t("Persona", "Person"), hint: t("ficha y proyectos", "profile and projects"), run: () => openCreate({ kind: "person" }) },
    { icon: FolderKanban, label: t("Proyecto", "Project"), hint: t("descripción y equipo", "description and team"), run: () => openCreate({ kind: "project" }) },
    {
      icon: NotebookPen,
      label: t("Nota", "Note"),
      hint: "Markdown",
      run: () => go(() => router.push(`/notas/${insert("notes", { title: "" }).id}`)),
    },
    {
      icon: Users2,
      label: t("Reunión", "Meeting"),
      hint: t("la del próximo lunes", "next Monday's"),
      run: () =>
        go(async () => {
          await Promise.all([ready("projects"), ready("meetings")]);
          const d = today();
          router.push(`/reuniones/${meetingFor(isMonday(d) ? d : addDaysISO(mondayOf(d), 7), culebroId()).id}`);
        }),
    },
    { icon: Link2, label: t("Link o archivo", "Link or file"), hint: t("a un proyecto", "to a project"), run: () => go(() => router.push("/archivos?nuevo=1")) },
  ];

  return (
    <Dialog open onClose={closeCreate} title={t("Crear", "Create")}>
      <form
        className="mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (capture(v)) {
            toast(t("Guardado en la Bandeja", "Saved to Inbox"));
            closeCreate();
          }
        }}
      >
        <label className="mb-1 flex items-center gap-1.5 text-xs text-muted">
          <Inbox className="size-3.5" /> {t("Captura rápida a la Bandeja", "Quick capture to Inbox")}
        </label>
        <input className="input" autoFocus placeholder={t("Escribí y Enter…", "Type and press Enter…")} value={v} onChange={(e) => setV(e.target.value)} />
      </form>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ icon: Icon, label, hint, run }) => (
          <button key={label} onClick={run} className="card flex items-start gap-3 p-3 text-left hover:border-muted">
            <Icon className="mt-0.5 size-5 shrink-0 text-accent" />
            <span>
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-muted">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </Dialog>
  );
}

function NewTask({ defaults = {} }: { defaults?: Partial<Task> }) {
  const [draft, setDraft] = useState<Partial<Task>>({ status: "todo", priority: "normal", ...defaults });
  const [subs, setSubs] = useState<string[]>([]);
  const [sub, setSub] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [again, setAgain] = useState(false);
  const set = (p: Partial<Task>) => setDraft((x) => ({ ...x, ...p }));

  async function save() {
    if (!draft.title?.trim()) return toast(t("Ponele un título.", "Give it a title."), "error");
    const pending = normalizeUrl(link);
    const task = insert("tasks", { ...draft, title: draft.title.trim() });
    [...subs, ...(sub.trim() ? [sub.trim()] : [])].forEach((s, i) =>
      insert("tasks", { title: s, parent_id: task.id, project_id: task.project_id, status: "todo", sort: Date.now() + i }),
    );
    [...links, ...(pending ? [pending] : [])].forEach((u) => addLink(u, linkName(u), { task_id: task.id, project_id: task.project_id }));
    try {
      for (const f of files) await uploadFile(f, { task_id: task.id, project_id: task.project_id });
    } catch (e) {
      toast(t(`La tarea se creó, pero no se subió un archivo: ${(e as Error).message}`, `The task was created, but a file failed to upload: ${(e as Error).message}`), "error");
    }
    toast(t("Tarea creada", "Task created"));
    if (again) {
      setDraft({ status: "todo", priority: "normal", ...defaults, project_id: draft.project_id, assignee_id: draft.assignee_id, due_date: draft.due_date });
      setSubs([]);
      setLinks([]);
      setFiles([]);
      setSub("");
      setLink("");
    } else closeCreate();
  }

  return (
    <Dialog open onClose={closeCreate} title={t("Nueva tarea", "New task")} wide>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input className="input text-lg font-medium" autoFocus placeholder={t("¿Qué hay que hacer?", "What needs to be done?")} value={draft.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
        <TaskFields value={draft} onChange={set} />
        <Field label={t("Detalles", "Details")}>
          <textarea className="input font-mono text-sm" rows={4} placeholder={t("Contexto, criterios, links… (Markdown)", "Context, criteria, links… (Markdown)")} value={draft.notes_md ?? ""} onChange={(e) => set({ notes_md: e.target.value })} />
        </Field>

        <div>
          <div className="mb-1 text-xs text-muted">{t("Subtareas", "Subtasks")}</div>
          {subs.map((s, i) => (
            <Chip key={i} onRemove={() => setSubs(subs.filter((_, j) => j !== i))}>
              {s}
            </Chip>
          ))}
          <input
            className="input py-1.5 text-sm"
            placeholder={t("Agregar subtarea y Enter", "Add subtask and press Enter")}
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (sub.trim()) setSubs([...subs, sub.trim()]);
                setSub("");
              }
            }}
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-muted">{t("Links y archivos", "Links and files")}</div>
          {links.map((u, i) => (
            <Chip key={u} onRemove={() => setLinks(links.filter((_, j) => j !== i))}>
              <Link2 className="size-3.5" /> {linkName(u)}
            </Chip>
          ))}
          {files.map((f, i) => (
            <Chip key={f.name + i} onRemove={() => setFiles(files.filter((_, j) => j !== i))}>
              📎 {f.name}
            </Chip>
          ))}
          <div className="flex gap-2">
            <input
              className="input py-1.5 text-sm"
              inputMode="url"
              placeholder={t("Pegá un link y Enter", "Paste a link and press Enter")}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const u = normalizeUrl(link);
                  if (u) setLinks([...links, u]);
                  else if (link.trim()) toast(t("Eso no parece un link.", "That doesn't look like a link."), "error");
                  setLink("");
                }
              }}
            />
            <label className="btn-outline shrink-0 cursor-pointer px-2.5 py-1.5 text-sm">
              {t("Adjuntar", "Attach")}
              <input type="file" multiple className="hidden" onChange={(e) => (setFiles([...files, ...(e.target.files ?? [])]), (e.target.value = ""))} />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={again} onChange={(e) => setAgain(e.target.checked)} /> {t("Crear otra después", "Create another")}
          </label>
          <button type="button" className="btn-ghost ml-auto" onClick={closeCreate}>
            {t("Cancelar", "Cancel")}
          </button>
          <button className="btn-primary">
            <Plus className="size-4" /> {t("Crear tarea", "Create task")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="mb-1 flex items-center gap-2 rounded-lg bg-soft px-2 py-1 text-sm">
      <span className="flex min-w-0 flex-1 items-center gap-1 truncate">{children}</span>
      <button type="button" onClick={onRemove} className="text-muted hover:text-danger" aria-label={t("Quitar", "Remove")}>
        <X className="size-4" />
      </button>
    </div>
  );
}

function NewPerson({ state }: { state: Extract<CreateState, { kind: "person" }> }) {
  const d = state.defaults ?? {};
  const [p, setP] = useState<Partial<Person>>({ name: d.name ?? "", role: d.role ?? null, team: d.team ?? null, email: null, phone: null, notes_md: "" });
  const [projectId, setProjectId] = useState<string | null>(d.project_id ?? null);
  const [projectRole, setProjectRole] = useState(d.project_role ?? "");
  const set = (x: Partial<Person>) => setP((o) => ({ ...o, ...x }));

  function save() {
    const name = p.name?.trim();
    if (!name) return toast(t("Ponele un nombre.", "Give it a name."), "error");
    if (snapshot("people").some((x) => x.name.trim().toLowerCase() === name.toLowerCase()) && !confirm(t(`Ya hay alguien que se llama ${name}. ¿Crear igual?`, `There's already someone named ${name}. Create anyway?`))) return;
    const person = insert("people", { ...p, name, email: p.email?.trim() || null, phone: p.phone?.trim() || null, role: p.role?.trim() || null, team: p.team?.trim() || null });
    if (projectId) insert("project_members", { project_id: projectId, person_id: person.id, role: projectRole.trim() || person.role });
    toast(t(`${name} agregada`, `${name} added`));
    closeCreate();
    state.onCreated?.(person);
  }

  return (
    <Dialog open onClose={closeCreate} title={t("Nueva persona", "New person")}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label={t("Nombre *", "Name *")}>
          <input className="input" autoFocus value={p.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Rol", "Role")}>
            <input className="input" placeholder={t("Ingeniero, cliente…", "Engineer, client…")} value={p.role ?? ""} onChange={(e) => set({ role: e.target.value })} />
          </Field>
          <Field label={t("Equipo / empresa", "Team / company")}>
            <input className="input" list="equipos" placeholder="PainPoint…" value={p.team ?? ""} onChange={(e) => set({ team: e.target.value })} />
            <TeamOptions />
          </Field>
          <Field label={t("Mail", "Email")}>
            <input className="input" type="email" value={p.email ?? ""} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label={t("Teléfono / WhatsApp", "Phone / WhatsApp")}>
            <input className="input" type="tel" value={p.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Proyecto", "Project")}>
            <ProjectSelect value={projectId} onChange={setProjectId} emptyLabel={t("Ninguno", "None")} />
          </Field>
          <Field label={t("Rol en el proyecto", "Role in the project")}>
            <input className="input" placeholder={t("Igual que su rol", "Same as their role")} value={projectRole} onChange={(e) => setProjectRole(e.target.value)} disabled={!projectId} />
          </Field>
        </div>
        <Field label={t("Notas", "Notes")}>
          <textarea className="input text-sm" rows={3} placeholder={t("Zona horaria, cómo prefiere que le escriban…", "Time zone, how they prefer to be contacted…")} value={p.notes_md ?? ""} onChange={(e) => set({ notes_md: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <button type="button" className="btn-ghost" onClick={closeCreate}>
            {t("Cancelar", "Cancel")}
          </button>
          <button className="btn-primary">{t("Crear persona", "Create person")}</button>
        </div>
      </form>
    </Dialog>
  );
}

function TeamOptions() {
  const teams = [...new Set(snapshot("people").map((p) => p.team).filter(Boolean))] as string[];
  return (
    <datalist id="equipos">
      {teams.map((team) => (
        <option key={team} value={team} />
      ))}
    </datalist>
  );
}

function NewProject({ state }: { state: Extract<CreateState, { kind: "project" }> }) {
  const router = useRouter();
  const { data: projects } = useProjects();
  const [name, setName] = useState(state.defaults?.name ?? "");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState(COLORS[projects.length % COLORS.length]);
  const [links, setLinks] = useState("");

  function save() {
    if (!name.trim()) return toast(t("Ponele un nombre.", "Give it a name."), "error");
    const p: Project = insert("projects", { name: name.trim(), description_md: desc, color });
    links
      .split(/\s+/)
      .map(normalizeUrl)
      .filter((u): u is string => !!u)
      .forEach((u) => addLink(u, linkName(u), { project_id: p.id }));
    toast(t("Proyecto creado", "Project created"));
    closeCreate();
    if (state.onCreated) state.onCreated(p);
    else router.push(`/proyectos/${p.id}`);
  }

  return (
    <Dialog open onClose={closeCreate} title={t("Nuevo proyecto", "New project")}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label={t("Nombre *", "Name *")}>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button type="button" key={c} onClick={() => setColor(c)} className={`size-6 rounded-full ${color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-panel" : ""}`} style={{ background: c }} aria-label={`Color ${c}`} />
          ))}
        </div>
        <Field label={t("Descripción / objetivo", "Description / goal")}>
          <textarea className="input text-sm" rows={4} placeholder={t("Qué es, para quién, qué tiene que lograr…", "What it is, who it's for, what it must achieve…")} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <Field label={t("Links clave (uno por línea)", "Key links (one per line)")}>
          <textarea className="input text-sm" rows={3} placeholder={t("Carpeta de Drive, sitio, planilla…", "Drive folder, website, spreadsheet…")} value={links} onChange={(e) => setLinks(e.target.value)} />
        </Field>
        <p className="text-xs text-muted">{t("El equipo lo armás después en la pestaña Equipo del proyecto.", "You can set up the team later in the project's Team tab.")}</p>
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <button type="button" className="btn-ghost" onClick={closeCreate}>
            {t("Cancelar", "Cancel")}
          </button>
          <button className="btn-primary">{t("Crear proyecto", "Create project")}</button>
        </div>
      </form>
    </Dialog>
  );
}
