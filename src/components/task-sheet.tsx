"use client";

import { Trash2, Plus, X } from "lucide-react";
import { useState } from "react";
import { insert, remove, update, useMeetings, useTasks } from "@/lib/db";
import { toggleDone } from "@/lib/actions";
import { RECURRENCE_PRESETS } from "@/lib/recurrence";
import { longDate } from "@/lib/dates";
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type Status, type Task } from "@/lib/types";
import { Dialog } from "./ui";
import { openTask, useOpenTask } from "./open-task";
import { PersonSelect, ProjectSelect } from "./pickers";
import { Checkbox } from "./task-row";
import { MarkdownField } from "./markdown";

/** Panel global para ver y editar una tarea. */
export function TaskSheet() {
  const id = useOpenTask();
  const { data: tasks } = useTasks();
  const task = tasks.find((t) => t.id === id);
  return (
    <Dialog open={!!task} onClose={() => openTask(null)} title={task ? "Tarea" : ""} wide>
      {task && <TaskEditor key={task.id} task={task} />}
    </Dialog>
  );
}

function TaskEditor({ task }: { task: Task }) {
  const { data: tasks } = useTasks();
  const { data: meetings } = useMeetings();
  const [title, setTitle] = useState(task.title);
  const subs = tasks.filter((t) => t.parent_id === task.id).sort((a, b) => a.sort - b.sort);
  const meeting = meetings.find((m) => m.id === task.meeting_id);
  const set = (patch: Partial<Task>) => update("tasks", task.id, patch);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Checkbox done={task.status === "done"} onClick={() => toggleDone(task)} label="Completar" />
        <textarea
          className="w-full resize-none bg-transparent text-lg font-medium outline-none"
          rows={Math.max(1, Math.ceil(title.length / 50))}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== task.title && set({ title: title.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), (e.target as HTMLElement).blur())}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
        <Field label="Estado">
          <select className="input" value={task.status} onChange={(e) => set({ status: e.target.value as Status, done_at: e.target.value === "done" ? new Date().toISOString() : null })}>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prioridad">
          <select className="input" value={task.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
            {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Proyecto">
          <ProjectSelect value={task.project_id} onChange={(v) => set({ project_id: v })} />
        </Field>
        <Field label="Responsable">
          <PersonSelect value={task.assignee_id} onChange={(v) => set({ assignee_id: v })} />
        </Field>
        <Field label="Fecha">
          <input className="input" type="date" value={task.due_date ?? ""} onChange={(e) => set({ due_date: e.target.value || null, reminded_at: null })} />
        </Field>
        <Field label="Hora">
          <input
            className="input"
            type="time"
            value={task.due_time?.slice(0, 5) ?? ""}
            onChange={(e) => set({ due_time: e.target.value || null, reminded_at: null })}
          />
        </Field>
        <Field label="Repetir" className="col-span-2 md:col-span-1">
          <select className="input" value={task.recurrence ?? ""} onChange={(e) => set({ recurrence: e.target.value || null })}>
            {RECURRENCE_PRESETS.map((p) => (
              <option key={p.label} value={p.value ?? ""}>
                {p.label}
              </option>
            ))}
            {task.recurrence && !RECURRENCE_PRESETS.some((p) => p.value === task.recurrence) && (
              <option value={task.recurrence}>{task.recurrence}</option>
            )}
          </select>
        </Field>
      </div>
      {task.recurrence && !task.due_date && (
        <p className="text-xs text-danger">Para que se repita, ponele una fecha.</p>
      )}
      {meeting && <p className="text-xs text-muted">Salió de la reunión del {longDate(meeting.date)}.</p>}

      <div>
        <div className="mb-1 text-xs font-medium text-muted">Subtareas</div>
        <div className="-mx-2">
          {subs.map((s) => (
            <SubtaskRow key={s.id} task={s} />
          ))}
        </div>
        <AddSubtask parent={task} />
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-muted">Notas</div>
        <MarkdownField value={task.notes_md} onChange={(v) => set({ notes_md: v })} placeholder="Detalles, links, contexto…" rows={4} />
      </div>

      <div className="flex justify-between border-t border-line pt-3">
        <button
          className="btn-ghost text-danger"
          onClick={() => {
            if (confirm("¿Borrar esta tarea?")) {
              remove("tasks", task.id);
              openTask(null);
            }
          }}
        >
          <Trash2 className="size-4" /> Borrar
        </button>
        <button className="btn-primary" onClick={() => openTask(null)}>
          Listo
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function SubtaskRow({ task }: { task: Task }) {
  const done = task.status === "done";
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-soft">
      <Checkbox
        done={done}
        onClick={() => update("tasks", task.id, { status: done ? "todo" : "done", done_at: done ? null : new Date().toISOString() })}
        label="Completar subtarea"
      />
      <input
        className={`flex-1 bg-transparent text-sm outline-none ${done ? "text-muted line-through" : ""}`}
        defaultValue={task.title}
        onBlur={(e) => e.target.value.trim() && e.target.value !== task.title && update("tasks", task.id, { title: e.target.value.trim() })}
      />
      <button className="p-1 text-muted opacity-60 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100" onClick={() => remove("tasks", task.id)} aria-label="Borrar subtarea">
        <X className="size-4" />
      </button>
    </div>
  );
}

function AddSubtask({ parent }: { parent: Task }) {
  const [v, setV] = useState("");
  return (
    <form
      className="mt-1 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.trim()) return;
        insert("tasks", { title: v.trim(), parent_id: parent.id, project_id: parent.project_id, status: "todo" });
        setV("");
      }}
    >
      <Plus className="size-4 text-muted" />
      <input className="flex-1 bg-transparent py-1 text-sm outline-none" placeholder="Agregar subtarea" value={v} onChange={(e) => setV(e.target.value)} />
    </form>
  );
}
