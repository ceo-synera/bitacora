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
import { t } from "@/lib/i18n";

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
      toast(list.length === 1 ? t("Archivo subido", "File uploaded") : t(`${list.length} archivos subidos`, `${list.length} files uploaded`));
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("Archivos", "Files")}>
        <AddLinkButton meta={{ project_id: project }} defaultOpen={typeof window !== "undefined" && new URLSearchParams(window.location.search).has("nuevo")} />
      </PageHeader>
      <div className="mb-3">
        <ProjectSelect value={project} onChange={setProject} emptyLabel={t("Todos los proyectos", "All projects")} includeArchived className="input w-auto py-1.5 text-sm" />
      </div>
      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: "todo", label: t("Todo", "All") },
          { value: "sheet", label: t("Planillas", "Spreadsheets") },
          { value: "pdf", label: "PDF" },
          { value: "image", label: t("Imágenes", "Images") },
          { value: "link", label: t("Links", "Links") },
        ]}
      />
      <div className="mb-4">
        <FileDrop onFiles={onFiles} busy={busy} compact label={project ? t("Subir Excel, CSV, PDF o imágenes a este proyecto", "Upload Excel, CSV, PDF or images to this project") : t("Subir Excel, CSV, PDF o imágenes", "Upload Excel, CSV, PDF or images")} />
      </div>
      {shown.length ? <FileList files={shown} /> : <Empty>{t("No hay archivos acá.", "No files here.")}</Empty>}
    </div>
  );
}
