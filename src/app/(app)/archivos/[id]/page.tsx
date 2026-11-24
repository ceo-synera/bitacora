"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, ExternalLink, FileUp } from "lucide-react";
import { update, useFiles } from "@/lib/db";
import { fileKind, formatSize, signedUrl } from "@/lib/files";
import { Empty } from "@/components/ui";
import { ProjectSelect } from "@/components/pickers";
import { SheetPreview } from "@/components/sheet-preview";

export default function FilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: files, isFetched } = useFiles();
  const f = files.find((x) => x.id === id);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!f) return;
    signedUrl(f)
      .then(setUrl)
      .catch((e) => setError(e.message));
  }, [f?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!f) return <Empty>{isFetched ? "No encontré ese archivo." : "Cargando…"}</Empty>;
  const kind = fileKind(f);

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col md:h-[calc(100dvh-5rem)]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => history.back()} className="text-sm text-muted hover:text-ink">
          ← Volver
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{f.name}</h1>
        <span className="text-xs text-muted">{formatSize(f.size_bytes)}</span>
        <ProjectSelect value={f.project_id} onChange={(v) => update("files", f.id, { project_id: v })} className="input w-auto py-1 text-sm" />
        {url && (
          <a className="btn-outline" href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" /> Abrir
          </a>
        )}
        {f.kind === "upload" && (
          <button className="btn-outline" onClick={async () => (window.location.href = await signedUrl(f, true))}>
            <Download className="size-4" />
          </button>
        )}
        {kind === "sheet" && (
          <Link className="btn-primary" href={`/ajustes/importar?archivo=${f.id}`}>
            <FileUp className="size-4" /> Importar como tareas
          </Link>
        )}
      </div>
      <div className="card min-h-0 flex-1 overflow-hidden">
        {error && <p className="p-4 text-sm text-danger">{error}</p>}
        {!url && !error && <p className="p-4 text-sm text-muted">Cargando…</p>}
        {url && kind === "pdf" && <iframe src={url} title={f.name} className="size-full" />}
        {url && kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={f.name} className="size-full object-contain" />
        )}
        {url && kind === "sheet" && <SheetPreview url={url} name={f.name} />}
        {url && kind === "link" && (
          <div className="p-6 text-sm">
            <a href={url} target="_blank" rel="noreferrer" className="text-accent underline">
              {url}
            </a>
          </div>
        )}
        {url && kind === "other" && <p className="p-6 text-sm text-muted">No hay vista previa para este tipo de archivo. Usá «Abrir».</p>}
      </div>
    </div>
  );
}
