"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { insert, snapshot, useFiles, useMeetings } from "@/lib/db";
import { signedUrl, uploadFile } from "@/lib/files";
import { readSheet, rowsToObjects, type Workbook } from "@/lib/sheets";
import { findByName, guessMapping, IMPORT_FIELDS, mapRows, type Mapping } from "@/lib/importer";
import { humanDate, longDate } from "@/lib/dates";
import { COLORS, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/types";
import { toast } from "@/lib/toast";
import { PageHeader, Section } from "@/components/ui";
import { FileDrop } from "@/components/dropzone";
import { ProjectSelect } from "@/components/pickers";

export default function ImportarPage() {
  const router = useRouter();
  const { data: files } = useFiles();
  const { data: meetings } = useMeetings();
  const [source, setSource] = useState<{ name: string; file?: File } | null>(null);
  const [wb, setWb] = useState<Workbook | null>(null);
  const [sheet, setSheet] = useState("");
  const [headerRow, setHeaderRow] = useState(0);
  const [mappingOverride, setMapping] = useState<Mapping | null>(null);
  const [projectChoice, setProjectId] = useState<string | null | undefined>(undefined);
  const [meetingId] = useState<string | null>(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("reunion") : null));
  const [saveFile, setSaveFile] = useState(true);
  const [skipDone, setSkipDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadingFile = useRef(false);
  // ?archivo=<id> (planilla ya subida) o ?reunion=<id> (las tareas quedan ligadas a esa reunión)
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const fid = qs.get("archivo");
    const f = fid && files.find((x) => x.id === fid);
    if (f && !loadingFile.current) {
      loadingFile.current = true;
      signedUrl(f)
        .then((u) => fetch(u))
        .then((r) => r.arrayBuffer())
        .then((b) => readSheet(b, f.name))
        .then((w) => {
          setSource({ name: f.name });
          setSaveFile(false);
          if (f.project_id) setProjectId(f.project_id);
          load(w);
        })
        .catch((e) => toast(e.message, "error"));
    }
  }, [files]);  

  const meeting = meetings.find((m) => m.id === meetingId);
  // Proyecto por defecto: el que elegiste, si no el de la reunión.
  const projectId = projectChoice !== undefined ? projectChoice : (meeting?.project_id ?? null);

  function load(w: Workbook) {
    setWb(w);
    setSheet(w.sheetNames[0]);
    setHeaderRow(0);
    setMapping(null);
  }

  const table = useMemo(() => (wb ? rowsToObjects(wb.sheets[sheet] ?? [], headerRow) : null), [wb, sheet, headerRow]);
  const mapping = useMemo(() => mappingOverride ?? (table ? guessMapping(table.headers) : {}), [mappingOverride, table]);

  const mapped = useMemo(() => {
    const all = table && mapping.title ? mapRows(table.rows, mapping) : [];
    return skipDone ? all.filter((t) => t.status !== "done") : all;
  }, [table, mapping, skipDone]);
  const people = snapshot("people");
  const projects = snapshot("projects");
  const newPeople = [...new Set(mapped.map((t) => t.assignee).filter((a): a is string => !!a && !findByName(people, a)))];
  const newProjects = [...new Set(mapped.map((t) => t.project).filter((p): p is string => !!p && !findByName(projects, p)))];

  async function confirmImport() {
    setBusy(true);
    try {
      if (source?.file && saveFile) await uploadFile(source.file, { project_id: projectId, meeting_id: meetingId });
      const peopleIds = new Map<string, string>();
      for (const n of newPeople) peopleIds.set(n, insert("people", { name: n }).id);
      const projectIds = new Map<string, string>();
      newProjects.forEach((n, i) => projectIds.set(n, insert("projects", { name: n, color: COLORS[(projects.length + i) % COLORS.length] }).id));
      const base = Date.now();
      mapped.forEach((t, i) => {
        insert("tasks", {
          title: t.title,
          notes_md: t.notes,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          done_at: t.status === "done" ? new Date().toISOString() : null,
          assignee_id: t.assignee ? (findByName(people, t.assignee)?.id ?? peopleIds.get(t.assignee) ?? null) : null,
          project_id: t.project ? (findByName(projects, t.project)?.id ?? projectIds.get(t.project) ?? projectId) : projectId,
          meeting_id: meetingId,
          sort: base + i,
        });
      });
      toast(`Importé ${mapped.length} tareas`);
      router.push(meetingId ? `/reuniones/${meetingId}` : "/tareas");
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Importar tareas" />
      {meeting && <p className="-mt-2 mb-4 text-sm text-muted">Las tareas quedan ligadas a la reunión del {longDate(meeting.date)}.</p>}

      {!wb ? (
        <FileDrop
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          label={source ? "Leyendo…" : "Soltá un CSV o Excel de tareas"}
          onFiles={async ([f]) => {
            setSource({ name: f.name, file: f });
            try {
              load(await readSheet(await f.arrayBuffer(), f.name));
            } catch (e) {
              toast(`No pude leer el archivo: ${(e as Error).message}`, "error");
              setSource(null);
            }
          }}
        />
      ) : (
        <>
          <Section title={`1 · ${source?.name ?? "Planilla"}`}>
            <div className="flex flex-wrap gap-3 text-sm">
              {wb.sheetNames.length > 1 && (
                <label className="space-y-1">
                  <span className="block text-xs text-muted">Hoja</span>
                  <select className="input w-auto" value={sheet} onChange={(e) => (setSheet(e.target.value), setMapping(null))}>
                    {wb.sheetNames.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="space-y-1">
                <span className="block text-xs text-muted">Fila de encabezados</span>
                <input className="input w-24" type="number" min={1} value={headerRow + 1} onChange={(e) => (setHeaderRow(Math.max(0, Number(e.target.value) - 1)), setMapping(null))} />
              </label>
              <label className="space-y-1">
                <span className="block text-xs text-muted">Proyecto (si la planilla no dice)</span>
                <ProjectSelect value={projectId} onChange={setProjectId} />
              </label>
              <button className="btn-ghost self-end" onClick={() => (setWb(null), setSource(null))}>
                Elegir otro archivo
              </button>
            </div>
          </Section>

          <Section title="2 · Qué columna es cada cosa">
            <div className="grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-4">
              {IMPORT_FIELDS.map(({ field, label, required }) => (
                <label key={field} className="space-y-1">
                  <span className="block text-xs text-muted">
                    {label}
                    {required && " *"}
                  </span>
                  <select className="input" value={mapping[field] ?? ""} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || undefined })}>
                    <option value="">—</option>
                    {table?.headers.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={skipDone} onChange={(e) => setSkipDone(e.target.checked)} /> No importar las que ya están hechas
            </label>
          </Section>

          <Section title={`3 · Vista previa · ${mapped.length} tareas`}>
            {!mapping.title ? (
              <p className="text-sm text-danger">Elegí qué columna es el título.</p>
            ) : (
              <>
                {(newPeople.length > 0 || newProjects.length > 0) && (
                  <p className="mb-2 text-sm text-muted">
                    Se van a crear
                    {newPeople.length > 0 && ` ${newPeople.length} personas (${newPeople.join(", ")})`}
                    {newPeople.length > 0 && newProjects.length > 0 && " y"}
                    {newProjects.length > 0 && ` ${newProjects.length} proyectos (${newProjects.join(", ")})`}.
                  </p>
                )}
                <div className="card overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-soft text-left text-muted">
                      <tr>
                        {["Título", "Responsable", "Fecha", "Estado", "Prioridad", "Proyecto"].map((h) => (
                          <th key={h} className="px-3 py-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {mapped.slice(0, 100).map((t, i) => (
                        <tr key={i}>
                          <td className="max-w-80 px-3 py-1.5">{t.title}</td>
                          <td className="px-3 py-1.5">{t.assignee ?? "Yo"}</td>
                          <td className="whitespace-nowrap px-3 py-1.5">{t.due_date ? humanDate(t.due_date) : "—"}</td>
                          <td className="px-3 py-1.5">{STATUS_LABEL[t.status]}</td>
                          <td className="px-3 py-1.5">{PRIORITY_LABEL[t.priority]}</td>
                          <td className="px-3 py-1.5">{t.project ?? projects.find((p) => p.id === projectId)?.name ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mapped.length > 100 && <p className="mt-1 text-xs text-muted">Mostrando 100 de {mapped.length}.</p>}
              </>
            )}
          </Section>

          <div className="flex flex-wrap items-center gap-3">
            {source?.file && (
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={saveFile} onChange={(e) => setSaveFile(e.target.checked)} /> Guardar la planilla en Archivos
              </label>
            )}
            <button className="btn-primary ml-auto" disabled={busy || !mapped.length} onClick={confirmImport}>
              Importar {mapped.length} tareas
            </button>
          </div>
        </>
      )}
    </div>
  );
}
