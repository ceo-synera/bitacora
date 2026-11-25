"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pin, Plus } from "lucide-react";
import { insert, useNotes, useProjects } from "@/lib/db";
import { humanDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { Empty } from "./ui";
import { ProjectDot } from "./pickers";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function NotesList({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const { data: notes } = useNotes();
  const { data: projects } = useProjects();
  const [q, setQ] = useState("");
  const words = fold(q).split(/\s+/).filter(Boolean);
  const shown = notes
    .filter((n) => !projectId || n.project_id === projectId)
    .filter((n) => words.every((w) => fold(`${n.title} ${n.body_md}`).includes(w)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at));

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input className="input" placeholder={t("Buscar en las notas", "Search notes")} value={q} onChange={(e) => setQ(e.target.value)} />
        <button
          className="btn-primary shrink-0"
          onClick={() => {
            const n = insert("notes", { project_id: projectId ?? null, title: "" });
            router.push(`/notas/${n.id}`);
          }}
        >
          <Plus className="size-4" /> {t("Nota", "Note")}
        </button>
      </div>
      {shown.length === 0 ? (
        <Empty>{q ? t("Nada coincide.", "Nothing matches.") : t("Sin notas todavía.", "No notes yet.")}</Empty>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {shown.map((n) => {
            const p = projects.find((x) => x.id === n.project_id);
            return (
              <li key={n.id}>
                <Link href={`/notas/${n.id}`} className="card block h-full p-3 hover:border-muted">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {n.pinned && <Pin className="size-3.5 text-accent" />}
                    <span className="truncate">{n.title || t("Sin título", "Untitled")}</span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs text-muted">{n.body_md.replace(/[#*_>`\-\[\]]/g, "").slice(0, 240)}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    {!projectId && p && (
                      <span className="inline-flex items-center gap-1">
                        <ProjectDot color={p.color} />
                        {p.name}
                      </span>
                    )}
                    <span>{humanDate(n.updated_at.slice(0, 10))}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
