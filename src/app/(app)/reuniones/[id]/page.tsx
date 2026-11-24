"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Presentation, ScrollText, Trash2, FileUp } from "lucide-react";
import { remove, update, useFiles, useMeetings, useTasks } from "@/lib/db";
import { longDate } from "@/lib/dates";
import { uploadMeetingPdfs } from "@/lib/meetings";
import { uploadFile } from "@/lib/files";
import { toast } from "@/lib/toast";
import { Empty, Section } from "@/components/ui";
import { FileDrop } from "@/components/dropzone";
import { FileList } from "@/components/file-list";
import { FileOpenButton } from "@/components/file-open";
import { AddLinkButton } from "@/components/add-link";
import { TaskList } from "@/components/task-row";
import { QuickAdd } from "@/components/quick-add";
import { MarkdownField } from "@/components/markdown";
import { ProjectSelect } from "@/components/pickers";
import { classifyMeetingPdf } from "@/lib/meeting-pdf";

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: meetings, isFetched } = useMeetings();
  const { data: files } = useFiles();
  const { data: tasks } = useTasks();
  const [busy, setBusy] = useState(false);
  const m = meetings.find((x) => x.id === id);

  if (!m) return <Empty>{isFetched ? "No encontré esa reunión." : "Cargando…"}</Empty>;

  const mf = files.filter((f) => f.meeting_id === m.id);
  const byRole = (r: string) => mf.find((f) => f.role === r);
  const mt = tasks.filter((t) => t.meeting_id === m.id && !t.parent_id).sort((a, b) => a.sort - b.sort);

  async function onFiles(list: File[]) {
    setBusy(true);
    try {
      // Los PDF con nombre reconocible se clasifican; el resto se adjunta tal cual.
      const known = list.filter((f) => classifyMeetingPdf(f.name)?.date === m!.date);
      const rest = list.filter((f) => !known.includes(f));
      if (known.length) await uploadMeetingPdfs(known, m);
      for (const f of rest) await uploadFile(f, { project_id: m!.project_id, meeting_id: m!.id });
      toast("Subido");
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-3xl">
      <Link href="/reuniones" className="text-sm text-muted hover:text-ink">
        ← Reuniones
      </Link>
      <div className="mb-4 mt-1">
        <p className="text-sm text-muted">{longDate(m.date)}</p>
        <input
          className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none"
          defaultValue={m.title}
          placeholder="Título"
          onBlur={(e) => e.target.value !== m.title && update("meetings", m.id, { title: e.target.value })}
        />
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <input type="date" className="input w-auto py-1.5" value={m.date} onChange={(e) => e.target.value && update("meetings", m.id, { date: e.target.value })} />
          <ProjectSelect value={m.project_id} onChange={(v) => update("meetings", m.id, { project_id: v })} className="input w-auto py-1.5" />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {byRole("agenda") && <FileOpenButton file={byRole("agenda")!} icon={<FileText className="size-4" />} label="Agenda" />}
        {byRole("presentation") && <FileOpenButton file={byRole("presentation")!} icon={<Presentation className="size-4" />} label="Presentación" primary />}
        {byRole("minutes") && <FileOpenButton file={byRole("minutes")!} icon={<ScrollText className="size-4" />} label="Minuta" />}
      </div>

      <Section title="Archivos" count={mf.length}>
        {mf.length > 0 && (
          <div className="mb-2">
            <FileList files={mf} showProject={false} />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <div className="flex-1">
            <FileDrop onFiles={onFiles} busy={busy} compact label="Subir agenda, presentación, minuta u otro archivo" />
          </div>
          <AddLinkButton meta={{ project_id: m.project_id, meeting_id: m.id }} />
        </div>
      </Section>

      <Section title="Notas">
        <MarkdownField value={m.notes_md} onChange={(v) => update("meetings", m.id, { notes_md: v })} placeholder="Lo que se habló…" rows={8} />
        <input
          className="input mt-2 text-sm"
          placeholder="Link de la grabación (opcional)"
          defaultValue={m.recording_url ?? ""}
          onBlur={(e) => e.target.value !== (m.recording_url ?? "") && update("meetings", m.id, { recording_url: e.target.value || null })}
        />
        {m.recording_url && (
          <a href={m.recording_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-accent underline">
            Abrir grabación
          </a>
        )}
      </Section>

      <Section title="Tareas que salieron" count={mt.length}>
        {mt.length > 0 ? <TaskList tasks={mt} /> : <Empty>Todavía ninguna.</Empty>}
        <div className="mt-2 flex flex-wrap gap-2">
          <div className="min-w-60 flex-1">
            <QuickAdd defaults={{ meeting_id: m.id, project_id: m.project_id }} />
          </div>
          <Link href={`/ajustes/importar?reunion=${m.id}`} className="btn-outline">
            <FileUp className="size-4" /> Importar CSV
          </Link>
        </div>
      </Section>

      <button
        className="btn-ghost text-danger"
        onClick={() => {
          if (confirm("¿Borrar la reunión? Las tareas y archivos quedan, pero sueltos.")) {
            remove("meetings", m.id);
            router.replace("/reuniones");
          }
        }}
      >
        <Trash2 className="size-4" /> Borrar reunión
      </button>
    </div>
  );
}
