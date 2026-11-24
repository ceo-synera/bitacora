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
    { icon: CheckSquare, label: "Tarea", hint: "con responsable, fecha, links…", run: () => openCreate({ kind: "task" }) },
    { icon: UserPlus, label: "Persona", hint: "ficha y proyectos", run: () => openCreate({ kind: "person" }) },
    { icon: FolderKanban, label: "Proyecto", hint: "descripción y equipo", run: () => openCreate({ kind: "project" }) },
    {
      icon: NotebookPen,
      label: "Nota",
      hint: "Markdown",
      run: () => go(() => router.push(`/notas/${insert("notes", { title: "" }).id}`)),
    },
    {
      icon: Users2,
      label: "Reunión",
      hint: "la del próximo lunes",
      run: () =>
        go(async () => {
          await Promise.all([ready("projects"), ready("meetings")]);
          const d = today();
          router.push(`/reuniones/${meetingFor(isMonday(d) ? d : addDaysISO(mondayOf(d), 7), culebroId()).id}`);
        }),
    },
    { icon: Link2, label: "Link o archivo", hint: "a un proyecto", run: () => go(() => router.push("/archivos?nuevo=1")) },
  ];

  return (
    <Dialog open onClose={closeCreate} title="Crear">
      <form
        className="mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (capture(v)) {
            toast("Guardado en la Bandeja");
            closeCreate();
          }
        }}
      >
        <label className="mb-1 flex items-center gap-1.5 text-xs text-muted">
          <Inbox className="size-3.5" /> Captura rápida a la Bandeja
        </label>
        <input className="input" autoFocus placeholder="Escribí y Enter…" value={v} onChange={(e) => setV(e.target.value)} />
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
  const [t, setT] = useState<Partial<Task>>({ status: "todo", priority: "normal", ...defaults });
  const [subs, setSubs] = useState<string[]>([]);
  const [sub, setSub] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [again, setAgain] = useState(false);
  const set = (p: Partial<Task>) => setT((x) => ({ ...x, ...p }));

  async function save() {
    if (!t.title?.trim()) return toast("Ponele un título.", "error");
    const pending = normalizeUrl(link);
    const task = insert("tasks", { ...t, title: t.title.trim() });
    [...subs, ...(sub.trim() ? [sub.trim()] : [])].forEach((s, i) =>
      insert("tasks", { title: s, parent_id: task.id, project_id: task.project_id, status: "todo", sort: Date.now() + i }),
    );
    [...links, ...(pending ? [pending] : [])].forEach((u) => addLink(u, linkName(u), { task_id: task.id, project_id: task.project_id }));
    try {
      for (const f of files) await uploadFile(f, { task_id: task.id, project_id: task.project_id });
    } catch (e) {
      toast(`La tarea se creó, pero no se subió un archivo: ${(e as Error).message}`, "error");
    }
    toast("Tarea creada");
    if (again) {
      setT({ status: "todo", priority: "normal", ...defaults, project_id: t.project_id, assignee_id: t.assignee_id, due_date: t.due_date });
      setSubs([]);
      setLinks([]);
      setFiles([]);
      setSub("");
      setLink("");
    } else closeCreate();
  }

  return (
    <Dialog open onClose={closeCreate} title="Nueva tarea" wide>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input className="input text-lg font-medium" autoFocus placeholder="¿Qué hay que hacer?" value={t.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
        <TaskFields value={t} onChange={set} />
        <Field label="Detalles">
          <textarea className="input font-mono text-sm" rows={4} placeholder="Contexto, criterios, links… (Markdown)" value={t.notes_md ?? ""} onChange={(e) => set({ notes_md: e.target.value })} />
        </Field>

        <div>
          <div className="mb-1 text-xs text-muted">Subtareas</div>
          {subs.map((s, i) => (
            <Chip key={i} onRemove={() => setSubs(subs.filter((_, j) => j !== i))}>
              {s}
            </Chip>
          ))}
          <input
            className="input py-1.5 text-sm"
            placeholder="Agregar subtarea y Enter"
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
          <div className="mb-1 text-xs text-muted">Links y archivos</div>
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
              placeholder="Pegá un link y Enter"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const u = normalizeUrl(link);
                  if (u) setLinks([...links, u]);
                  else if (link.trim()) toast("Eso no parece un link.", "error");
                  setLink("");
                }
              }}
            />
            <label className="btn-outline shrink-0 cursor-pointer px-2.5 py-1.5 text-sm">
              Adjuntar
              <input type="file" multiple className="hidden" onChange={(e) => (setFiles([...files, ...(e.target.files ?? [])]), (e.target.value = ""))} />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={again} onChange={(e) => setAgain(e.target.checked)} /> Crear otra después
          </label>
          <button type="button" className="btn-ghost ml-auto" onClick={closeCreate}>
            Cancelar
          </button>
          <button className="btn-primary">
            <Plus className="size-4" /> Crear tarea
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
      <button type="button" onClick={onRemove} className="text-muted hover:text-danger" aria-label="Quitar">
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
    if (!name) return toast("Ponele un nombre.", "error");
    if (snapshot("people").some((x) => x.name.trim().toLowerCase() === name.toLowerCase()) && !confirm(`Ya hay alguien que se llama ${name}. ¿Crear igual?`)) return;
    const person = insert("people", { ...p, name, email: p.email?.trim() || null, phone: p.phone?.trim() || null, role: p.role?.trim() || null, team: p.team?.trim() || null });
    if (projectId) insert("project_members", { project_id: projectId, person_id: person.id, role: projectRole.trim() || person.role });
    toast(`${name} agregada`);
    closeCreate();
    state.onCreated?.(person);
  }

  return (
    <Dialog open onClose={closeCreate} title="Nueva persona">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Nombre *">
          <input className="input" autoFocus value={p.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rol">
            <input className="input" placeholder="Ingeniero, cliente…" value={p.role ?? ""} onChange={(e) => set({ role: e.target.value })} />
          </Field>
          <Field label="Equipo / empresa">
            <input className="input" list="equipos" placeholder="PainPoint…" value={p.team ?? ""} onChange={(e) => set({ team: e.target.value })} />
            <TeamOptions />
          </Field>
          <Field label="Mail">
            <input className="input" type="email" value={p.email ?? ""} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Teléfono / WhatsApp">
            <input className="input" type="tel" value={p.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Proyecto">
            <ProjectSelect value={projectId} onChange={setProjectId} emptyLabel="Ninguno" />
          </Field>
          <Field label="Rol en el proyecto">
            <input className="input" placeholder="Igual que su rol" value={projectRole} onChange={(e) => setProjectRole(e.target.value)} disabled={!projectId} />
          </Field>
        </div>
        <Field label="Notas">
          <textarea className="input text-sm" rows={3} placeholder="Zona horaria, cómo prefiere que le escriban…" value={p.notes_md ?? ""} onChange={(e) => set({ notes_md: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <button type="button" className="btn-ghost" onClick={closeCreate}>
            Cancelar
          </button>
          <button className="btn-primary">Crear persona</button>
        </div>
      </form>
    </Dialog>
  );
}

function TeamOptions() {
  const teams = [...new Set(snapshot("people").map((p) => p.team).filter(Boolean))] as string[];
  return (
    <datalist id="equipos">
      {teams.map((t) => (
        <option key={t} value={t} />
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
    if (!name.trim()) return toast("Ponele un nombre.", "error");
    const p: Project = insert("projects", { name: name.trim(), description_md: desc, color });
    links
      .split(/\s+/)
      .map(normalizeUrl)
      .filter((u): u is string => !!u)
      .forEach((u) => addLink(u, linkName(u), { project_id: p.id }));
    toast("Proyecto creado");
    closeCreate();
    if (state.onCreated) state.onCreated(p);
    else router.push(`/proyectos/${p.id}`);
  }

  return (
    <Dialog open onClose={closeCreate} title="Nuevo proyecto">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Nombre *">
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button type="button" key={c} onClick={() => setColor(c)} className={`size-6 rounded-full ${color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-panel" : ""}`} style={{ background: c }} aria-label={`Color ${c}`} />
          ))}
        </div>
        <Field label="Descripción / objetivo">
          <textarea className="input text-sm" rows={4} placeholder="Qué es, para quién, qué tiene que lograr…" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <Field label="Links clave (uno por línea)">
          <textarea className="input text-sm" rows={3} placeholder="Carpeta de Drive, sitio, planilla…" value={links} onChange={(e) => setLinks(e.target.value)} />
        </Field>
        <p className="text-xs text-muted">El equipo lo armás después en la pestaña Equipo del proyecto.</p>
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <button type="button" className="btn-ghost" onClick={closeCreate}>
            Cancelar
          </button>
          <button className="btn-primary">Crear proyecto</button>
        </div>
      </form>
    </Dialog>
  );
}
