"use client";

import { useState } from "react";
import { useFiles } from "@/lib/db";
import { uploadFile, fileKind } from "@/lib/files";
import { toast } from "@/lib/toast";
import { Empty, PageHeader, Tabs } from "@/components/ui";
import { FileDrop } from "@/components/dropzone";
import { FileList } from "@/components/file-list";
import { AddLinkButton } from "@/components/add-link";
import { ProjectSelect } from "@/components/pickers";

type Filter = "todo" | "sheet" | "pdf" | "image" | "link";

export default function ArchivosPage() {
  const { data: files } = useFiles();
  const [project, setProject] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("todo");
  const [busy, setBusy] = useState(false);

  const shown = files.filter((f) => (!project || f.project_id === project) && (filter === "todo" || fileKind(f) === filter));

  async function onFiles(list: File[]) {
    setBusy(true);
    try {
      for (const f of list) await uploadFile(f, { project_id: project });
      toast(list.length === 1 ? "Archivo subido" : `${list.length} archivos subidos`);
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Archivos">
        <AddLinkButton meta={{ project_id: project }} />
      </PageHeader>
      <div className="mb-3">
        <ProjectSelect value={project} onChange={setProject} emptyLabel="Todos los proyectos" includeArchived className="input w-auto py-1.5 text-sm" />
      </div>
      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: "todo", label: "Todo" },
          { value: "sheet", label: "Planillas" },
          { value: "pdf", label: "PDF" },
          { value: "image", label: "Imágenes" },
          { value: "link", label: "Links" },
        ]}
      />
      <div className="mb-4">
        <FileDrop onFiles={onFiles} busy={busy} compact label={`Subir Excel, CSV, PDF o imágenes${project ? " a este proyecto" : ""}`} />
      </div>
      {shown.length ? <FileList files={shown} /> : <Empty>No hay archivos acá.</Empty>}
    </div>
  );
}
