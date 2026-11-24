"use client";

import { usePeople, useProjects } from "@/lib/db";

export function ProjectSelect({
  value,
  onChange,
  includeArchived = false,
  emptyLabel = "Sin proyecto",
  className = "input",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  includeArchived?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const { data: projects } = useProjects();
  return (
    <select className={className} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{emptyLabel}</option>
      {projects
        .filter((p) => includeArchived || p.status === "active" || p.id === value)
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
    </select>
  );
}

export function PersonSelect({
  value,
  onChange,
  emptyLabel = "Yo",
  className = "input",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  emptyLabel?: string;
  className?: string;
}) {
  const { data: people } = usePeople();
  return (
    <select className={className} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{emptyLabel}</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export function ProjectDot({ color, className = "size-2" }: { color: string; className?: string }) {
  return <span className={`inline-block shrink-0 rounded-full ${className}`} style={{ background: color }} />;
}
