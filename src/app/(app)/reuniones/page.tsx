"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, FileText, Presentation, ScrollText, ChevronRight } from "lucide-react";
import { ready, useFiles, useMeetings, useProjects, useTasks } from "@/lib/db";
import { addDaysISO, isMonday, longDate, mondayOf, today } from "@/lib/dates";
import { culebroId, meetingFor, uploadMeetingPdfs } from "@/lib/meetings";
import { toast } from "@/lib/toast";
import { Empty, PageHeader } from "@/components/ui";
import { FileDrop } from "@/components/dropzone";
import { ProjectDot } from "@/components/pickers";

export default function ReunionesPage() {
  const router = useRouter();
  const { data: meetings } = useMeetings();
  const { data: files } = useFiles();
  const { data: tasks } = useTasks();
  const { data: projects } = useProjects();
  const [busy, setBusy] = useState(false);
  const [showUpload, setShowUpload] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("subir"));

  async function onFiles(list: File[]) {
    setBusy(true);
    try {
      const { done, skipped } = await uploadMeetingPdfs(list);
      if (done.length) toast(`Listo: ${done.join(", ")}`);
      if (skipped.length) toast(`No reconocí: ${skipped.join(", ")}`, "error");
    } catch (e) {
      toast(String((e as Error).message), "error");
    }
    setBusy(false);
  }

  async function newMeeting() {
    await Promise.all([ready("projects"), ready("meetings")]);
    const d = today();
    const date = isMonday(d) ? d : addDaysISO(mondayOf(d), 7);
    const m = meetingFor(date, culebroId());
    router.push(`/reuniones/${m.id}`);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Reuniones">
        <button className="btn-outline" onClick={() => setShowUpload((v) => !v)}>
          Subir PDFs
        </button>
        <button className="btn-primary" onClick={newMeeting}>
          <Plus className="size-4" /> Reunión del lunes
        </button>
      </PageHeader>

      {showUpload && (
        <div className="mb-6">
          <FileDrop onFiles={onFiles} busy={busy} accept="application/pdf" label="Soltá la agenda, la presentación o la minuta" />
          <p className="mt-2 text-xs text-muted">
            Reconozco «AAAA-MM-DD Agenda AI Funnels Weekly.pdf», «AAAA-MM-DD Presentacion AI Funnels Weekly.pdf» y los que digan «Minuta». Creo la reunión de esa
            fecha si no existe. Los que empiezan con «OBSOLETA» se ignoran.
          </p>
        </div>
      )}

      {meetings.length === 0 ? (
        <Empty>Todavía no hay reuniones. Subí los PDF de un lunes y se arma sola.</Empty>
      ) : (
        <ul className="card divide-y divide-line">
          {meetings.map((m) => {
            const mf = files.filter((f) => f.meeting_id === m.id);
            const mt = tasks.filter((t) => t.meeting_id === m.id && !t.parent_id);
            const project = projects.find((p) => p.id === m.project_id);
            return (
              <li key={m.id}>
                <Link href={`/reuniones/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-soft">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{longDate(m.date)}</div>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                      <span>{m.title || "Reunión"}</span>
                      {project && (
                        <span className="inline-flex items-center gap-1">
                          <ProjectDot color={project.color} />
                          {project.name}
                        </span>
                      )}
                      {mt.length > 0 && <span>{mt.length} tareas</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 text-muted">
                    {mf.some((f) => f.role === "agenda") && <FileText className="size-4" aria-label="Agenda" />}
                    {mf.some((f) => f.role === "presentation") && <Presentation className="size-4" aria-label="Presentación" />}
                    {mf.some((f) => f.role === "minutes") && <ScrollText className="size-4" aria-label="Minuta" />}
                  </div>
                  <ChevronRight className="size-4 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
