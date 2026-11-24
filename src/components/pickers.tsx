"use client";

import { useMembers, usePeople, useProjects } from "@/lib/db";
import { openCreate } from "./create-store";

const NEW = "__nuevo__";

export function ProjectSelect({
  value,
  onChange,
  includeArchived = false,
  emptyLabel = "Sin proyecto",
  className = "input",
  allowCreate = false,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  includeArchived?: boolean;
  emptyLabel?: string;
  className?: string;
  allowCreate?: boolean;
}) {
  const { data: projects } = useProjects();
  return (
    <select
      className={className}
      value={value ?? ""}
      onChange={(e) => {
        if (e.target.value === NEW) openCreate({ kind: "project", onCreated: (p) => onChange(p.id) });
        else onChange(e.target.value || null);
      }}
    >
      <option value="">{emptyLabel}</option>
      {projects
        .filter((p) => includeArchived || p.status === "active" || p.id === value)
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      {allowCreate && <option value={NEW}>+ Nuevo proyecto…</option>}
    </select>
  );
}

/** Elegir persona. Si se pasa un proyecto, primero aparece su equipo. */
export function PersonSelect({
  value,
  onChange,
  emptyLabel = "Yo",
  className = "input",
  allowCreate = false,
  projectId = null,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  emptyLabel?: string;
  className?: string;
  allowCreate?: boolean;
  projectId?: string | null;
}) {
  const { data: people } = usePeople();
  const { data: members } = useMembers();
  const teamIds = new Set(members.filter((m) => m.project_id === projectId).map((m) => m.person_id));
  const team = people.filter((p) => teamIds.has(p.id));
  const others = people.filter((p) => !teamIds.has(p.id));
  const opt = (p: (typeof people)[number]) => (
    <option key={p.id} value={p.id}>
      {p.name}
      {p.role ? ` · ${p.role}` : ""}
    </option>
  );
  return (
    <select
      className={className}
      value={value ?? ""}
      onChange={(e) => {
        if (e.target.value === NEW)
          openCreate({ kind: "person", defaults: { project_id: projectId }, onCreated: (p) => onChange(p.id) });
        else onChange(e.target.value || null);
      }}
    >
      <option value="">{emptyLabel}</option>
      {team.length > 0 ? (
        <>
          <optgroup label="Equipo del proyecto">{team.map(opt)}</optgroup>
          {others.length > 0 && <optgroup label="Otras personas">{others.map(opt)}</optgroup>}
        </>
      ) : (
        people.map(opt)
      )}
      {allowCreate && <option value={NEW}>+ Nueva persona…</option>}
    </select>
  );
}

export function ProjectDot({ color, className = "size-2" }: { color: string; className?: string }) {
  return <span className={`inline-block shrink-0 rounded-full ${className}`} style={{ background: color }} />;
}
