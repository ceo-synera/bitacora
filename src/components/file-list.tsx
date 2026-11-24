"use client";

import Link from "next/link";
import { ExternalLink, FileSpreadsheet, FileText, Image as ImageIcon, Link2, File as FileIcon, Trash2 } from "lucide-react";
import { useProjects } from "@/lib/db";
import { deleteFile, fileKind, formatSize } from "@/lib/files";
import { ROLE_LABEL } from "@/lib/meeting-pdf";
import { humanDate } from "@/lib/dates";
import type { FileRow } from "@/lib/types";
import { ProjectDot } from "./pickers";

const ICONS = { pdf: FileText, sheet: FileSpreadsheet, image: ImageIcon, link: Link2, other: FileIcon };

export function FileList({ files, showProject = true }: { files: FileRow[]; showProject?: boolean }) {
  const { data: projects } = useProjects();
  return (
    <ul className="card divide-y divide-line">
      {files.map((f) => {
        const Icon = ICONS[fileKind(f)];
        const project = projects.find((p) => p.id === f.project_id);
        return (
          <li key={f.id} className="group flex items-center gap-3 px-3 py-2.5">
            <Icon className="size-5 shrink-0 text-muted" />
            <Link href={f.kind === "link" ? f.url! : `/archivos/${f.id}`} target={f.kind === "link" ? "_blank" : undefined} className="min-w-0 flex-1">
              <div className="truncate text-sm">{f.name}</div>
              <div className="flex flex-wrap gap-x-3 text-xs text-muted">
                {f.role && <span className="font-medium text-accent">{ROLE_LABEL[f.role]}</span>}
                {showProject && project && (
                  <span className="inline-flex items-center gap-1">
                    <ProjectDot color={project.color} />
                    {project.name}
                  </span>
                )}
                <span>{humanDate(f.created_at.slice(0, 10))}</span>
                {f.size_bytes ? <span>{formatSize(f.size_bytes)}</span> : null}
              </div>
            </Link>
            {f.kind === "link" && <ExternalLink className="size-4 text-muted" />}
            <button
              className="p-1.5 text-muted opacity-60 hover:text-danger hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"
              onClick={() => confirm(`¿Borrar "${f.name}"?`) && deleteFile(f)}
              aria-label="Borrar"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
