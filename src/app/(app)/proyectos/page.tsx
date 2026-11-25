"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { insert, useProjects, useTasks } from "@/lib/db";
import { Empty, PageHeader } from "@/components/ui";
import { ProjectDot } from "@/components/pickers";
import { COLORS } from "@/lib/types";
import { t } from "@/lib/i18n";


export default function ProyectosPage() {
  const { data: projects } = useProjects();
  const { data: tasks } = useTasks();
  const [name, setName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const shown = projects.filter((p) => showArchived || p.status === "active");

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("Proyectos", "Projects")} />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          insert("projects", { name: name.trim(), color: COLORS[projects.length % COLORS.length] });
          setName("");
        }}
      >
        <input className="input" placeholder={t("Nuevo proyecto", "New project")} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary shrink-0">
          <Plus className="size-4" /> {t("Crear", "Create")}
        </button>
      </form>
      {shown.length === 0 ? (
        <Empty>{t("Sin proyectos.", "No projects.")}</Empty>
      ) : (
        <ul className="card divide-y divide-line">
          {shown.map((p) => {
            const open = tasks.filter((task) => task.project_id === p.id && !task.parent_id && task.status !== "done" && task.status !== "inbox").length;
            return (
              <li key={p.id}>
                <Link href={`/proyectos/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-soft">
                  <ProjectDot color={p.color} className="size-3" />
                  <span className={`flex-1 ${p.status === "archived" ? "text-muted" : ""}`}>{p.name}</span>
                  {p.status === "archived" ? <span className="chip">{t("archivado", "archived")}</span> : <span className="text-xs text-muted">{open} {t("abiertas", "open")}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <label className="mt-3 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> {t("Ver archivados", "Show archived")}
      </label>
    </div>
  );
}
