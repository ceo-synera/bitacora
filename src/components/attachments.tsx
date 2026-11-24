"use client";

import { ExternalLink, FileText, Link2, Paperclip, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useFiles } from "@/lib/db";
import { addLink, deleteFile, linkName, normalizeUrl, uploadFile } from "@/lib/files";
import { toast } from "@/lib/toast";

/** Links y archivos de una tarea (o de lo que se pase en `meta`). Pegás un link y Enter. */
export function Attachments({ meta, filter, limit }: { limit?: number; meta: { task_id?: string; project_id?: string | null; meeting_id?: string | null }; filter: (f: { task_id: string | null; meeting_id: string | null; project_id: string | null }) => boolean }) {
  const { data: files } = useFiles();
  const all = files.filter(filter);
  const [showAll, setShowAll] = useState(false);
  const list = limit && !showAll ? all.slice(0, limit) : all;
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div>
      {list.length > 0 && (
        <ul className="mb-2 space-y-1">
          {list.map((f) => (
            <li key={f.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-soft">
              {f.kind === "link" ? <Link2 className="size-4 shrink-0 text-muted" /> : <FileText className="size-4 shrink-0 text-muted" />}
              {f.kind === "link" ? (
                <a href={f.url!} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-accent hover:underline">
                  {f.name}
                </a>
              ) : (
                <Link href={`/archivos/${f.id}`} className="min-w-0 flex-1 truncate text-accent hover:underline">
                  {f.name}
                </Link>
              )}
              {f.kind === "link" && <ExternalLink className="size-3.5 text-muted" />}
              <button className="p-1 text-muted opacity-60 hover:text-danger hover:opacity-100 md:opacity-0 md:group-hover:opacity-100" onClick={() => deleteFile(f)} aria-label="Quitar">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {limit && all.length > limit && (
        <button className="mb-2 px-2 text-sm text-muted hover:text-ink" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Ver menos" : `Ver los ${all.length}`}
        </button>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const url = normalizeUrl(v);
          if (!url) return toast("Eso no parece un link.", "error");
          addLink(url, linkName(url), meta);
          setV("");
        }}
      >
        <input className="input py-1.5 text-sm" placeholder="Pegá un link y Enter (Drive, Sheets, Claude, web…)" value={v} onChange={(e) => setV(e.target.value)} inputMode="url" />
        <button type="button" className="btn-outline shrink-0 px-2.5 py-1.5" onClick={() => input.current?.click()} disabled={busy} aria-label="Adjuntar archivo" title="Adjuntar archivo">
          <Paperclip className="size-4" />
        </button>
        <input
          ref={input}
          type="file"
          multiple
          className="hidden"
          onChange={async (e) => {
            const fs = [...(e.target.files ?? [])];
            e.target.value = "";
            setBusy(true);
            try {
              for (const f of fs) await uploadFile(f, meta);
            } catch (err) {
              toast((err as Error).message, "error");
            }
            setBusy(false);
          }}
        />
      </form>
    </div>
  );
}
