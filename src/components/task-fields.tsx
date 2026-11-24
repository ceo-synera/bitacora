"use client";

import { RECURRENCE_PRESETS } from "@/lib/recurrence";
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type Status, type Task } from "@/lib/types";
import { PersonSelect, ProjectSelect } from "./pickers";

/** Los campos de una tarea (se usan al crear y al editar). */
export function TaskFields({ value, onChange }: { value: Partial<Task>; onChange: (patch: Partial<Task>) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
        <Field label="Proyecto">
          <ProjectSelect value={value.project_id ?? null} onChange={(v) => onChange({ project_id: v })} allowCreate />
        </Field>
        <Field label="Responsable">
          <PersonSelect value={value.assignee_id ?? null} onChange={(v) => onChange({ assignee_id: v })} allowCreate projectId={value.project_id ?? null} />
        </Field>
        <Field label="Estado">
          <select
            className="input"
            value={value.status ?? "todo"}
            onChange={(e) => onChange({ status: e.target.value as Status, done_at: e.target.value === "done" ? new Date().toISOString() : null })}
          >
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prioridad">
          <select className="input" value={value.priority ?? "normal"} onChange={(e) => onChange({ priority: e.target.value as Priority })}>
            {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha">
          <input className="input" type="date" value={value.due_date ?? ""} onChange={(e) => onChange({ due_date: e.target.value || null, reminded_at: null })} />
        </Field>
        <Field label="Hora">
          <input className="input" type="time" value={value.due_time?.slice(0, 5) ?? ""} onChange={(e) => onChange({ due_time: e.target.value || null, reminded_at: null })} />
        </Field>
        <Field label="Repetir" className="col-span-2 md:col-span-1">
          <select className="input" value={value.recurrence ?? ""} onChange={(e) => onChange({ recurrence: e.target.value || null })}>
            {RECURRENCE_PRESETS.map((p) => (
              <option key={p.label} value={p.value ?? ""}>
                {p.label}
              </option>
            ))}
            {value.recurrence && !RECURRENCE_PRESETS.some((p) => p.value === value.recurrence) && <option value={value.recurrence}>{value.recurrence}</option>}
          </select>
        </Field>
      </div>
      {value.recurrence && !value.due_date && <p className="text-xs text-danger">Para que se repita, ponele una fecha.</p>}
      {value.due_time && !value.due_date && <p className="text-xs text-danger">Con hora pero sin fecha no te llega el aviso.</p>}
    </>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
