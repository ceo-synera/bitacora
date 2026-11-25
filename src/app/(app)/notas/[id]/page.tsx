"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Note } from "@/lib/types";
import { Eye, Pencil, Pin, Trash2 } from "lucide-react";
import { remove, update, useNotes } from "@/lib/db";
import { Empty } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { ProjectSelect } from "@/components/pickers";
import { t } from "@/lib/i18n";

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const { data: notes, isFetched } = useNotes();
  const note = notes.find((n) => n.id === id);
  if (!note) return <Empty>{isFetched ? t("No encontré esa nota.", "Note not found.") : t("Cargando…", "Loading…")}</Empty>;
  return <NoteEditor key={note.id} note={note} />;
}

function NoteEditor({ note }: { note: Note }) {
  const router = useRouter();
  const [body, setBody] = useState<string | null>(note.body_md);
  const [preview, setPreview] = useState(!!note.body_md);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = (v: string) => {
    setBody(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update("notes", note.id, { body_md: v }), 600);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => router.push("/notas")} className="text-sm text-muted hover:text-ink">
          ← {t("Notas", "Notes")}
        </button>
        <div className="ml-auto flex items-center gap-1">
          <ProjectSelect value={note.project_id} onChange={(v) => update("notes", note.id, { project_id: v })} className="input w-auto py-1 text-sm" />
          <button className={`btn-ghost p-2 ${note.pinned ? "text-accent" : "text-muted"}`} onClick={() => update("notes", note.id, { pinned: !note.pinned })} aria-label={t("Fijar", "Pin")}>
            <Pin className="size-4" />
          </button>
          <button className="btn-ghost p-2 text-muted" onClick={() => setPreview(!preview)} aria-label={preview ? t("Editar", "Edit") : t("Vista previa", "Preview")}>
            {preview ? <Pencil className="size-4" /> : <Eye className="size-4" />}
          </button>
          <button
            className="btn-ghost p-2 text-muted hover:text-danger"
            onClick={() => {
              if (confirm(t("¿Borrar la nota?", "Delete this note?"))) {
                remove("notes", note.id);
                router.replace("/notas");
              }
            }}
            aria-label={t("Borrar", "Delete")}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <input
        className="mb-3 w-full bg-transparent text-2xl font-semibold tracking-tight outline-none"
        placeholder={t("Título", "Title")}
        defaultValue={note.title}
        autoFocus={!note.title}
        onBlur={(e) => e.target.value !== note.title && update("notes", note.id, { title: e.target.value })}
      />
      {preview ? (
        <div onDoubleClick={() => setPreview(false)}>
          <Markdown>{body ?? ""}</Markdown>
        </div>
      ) : (
        <textarea
          className="min-h-[60dvh] w-full resize-none bg-transparent font-mono text-sm leading-relaxed outline-none"
          placeholder={t("Escribí en Markdown…", "Write in Markdown…")}
          value={body ?? ""}
          onChange={(e) => save(e.target.value)}
          onBlur={() => {
            clearTimeout(timer.current);
            if (body !== null && body !== note.body_md) update("notes", note.id, { body_md: body });
          }}
        />
      )}
    </div>
  );
}
