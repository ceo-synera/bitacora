"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { insert, useFiles, useMeetings, usePeople, useProjects, useTasks } from "@/lib/db";
import { signedUrl, uploadFile } from "@/lib/files";
import { readSheet, rowsToObjects, type Workbook } from "@/lib/sheets";
import { findByName, findDuplicate, guessMapping, IMPORT_FIELDS, isMe, mapRows, type Mapping } from "@/lib/importer";
import { humanDate, longDate } from "@/lib/dates";
import { COLORS, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/types";
import { toast } from "@/lib/toast";
import { t } from "@/lib/i18n";
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
  const [includeSimilar, setIncludeSimilar] = useState<Set<number>>(new Set());
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
    setIncludeSimilar(new Set());
  }

  const table = useMemo(() => (wb ? rowsToObjects(wb.sheets[sheet] ?? [], headerRow) : null), [wb, sheet, headerRow]);
  const mapping = useMemo(() => mappingOverride ?? (table ? guessMapping(table.headers) : {}), [mappingOverride, table]);

  const { data: people } = usePeople();
  const { data: projects } = useProjects();
  const { data: tasks } = useTasks();
  const rows = useMemo(() => {
    const all = table && mapping.title ? mapRows(table.rows, mapping) : [];
    // "Nicolás", "yo", "me"… = vos: sin responsable.
    return (skipDone ? all.filter((task) => task.status !== "done") : all).map((task) => (isMe(task.assignee) ? { ...task, assignee: null } : task));
  }, [table, mapping, skipDone]);
  // Duplicados contra lo que ya está cargado (también la misma tarea escrita en otro idioma).
  const dups = useMemo(() => {
    const existing = tasks
      .filter((task) => !task.parent_id)
      .map((task) => ({ id: task.id, title: task.title, assignee: people.find((p) => p.id === task.assignee_id)?.name ?? null, due_date: task.due_date, done: task.status === "done" }));
    const names = people.map((p) => p.name);
    return rows.map((task) => findDuplicate(task, existing, names));
  }, [rows, tasks, people]);
  const mapped = rows.filter((_, i) => !dups[i] || (dups[i]!.kind === "parecida" && includeSimilar.has(i)));
  const nSkipped = rows.length - mapped.length;
  const newPeople = [...new Set(mapped.map((task) => task.assignee).filter((a): a is string => !!a && !findByName(people, a)))];
  const newProjects = [...new Set(mapped.map((task) => task.project).filter((p): p is string => !!p && !findByName(projects, p)))];

  async function confirmImport() {
    setBusy(true);
    try {
      if (source?.file && saveFile) await uploadFile(source.file, { project_id: projectId, meeting_id: meetingId });
      const peopleIds = new Map<string, string>();
      for (const n of newPeople) peopleIds.set(n, insert("people", { name: n }).id);
      const projectIds = new Map<string, string>();
      newProjects.forEach((n, i) => projectIds.set(n, insert("projects", { name: n, color: COLORS[(projects.length + i) % COLORS.length] }).id));
      const base = Date.now();
      mapped.forEach((task, i) => {
        insert("tasks", {
          title: task.title,
          notes_md: task.notes,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          done_at: task.status === "done" ? new Date().toISOString() : null,
          assignee_id: task.assignee ? (findByName(people, task.assignee)?.id ?? peopleIds.get(task.assignee) ?? null) : null,
          project_id: task.project ? (findByName(projects, task.project)?.id ?? projectIds.get(task.project) ?? projectId) : projectId,
          meeting_id: meetingId,
          sort: base + i,
        });
      });
      toast(t(`Importé ${mapped.length} tareas`, `Imported ${mapped.length} tasks`));
      router.push(meetingId ? `/reuniones/${meetingId}` : "/tareas");
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title={t("Importar tareas", "Import tasks")} />
      {meeting && <p className="-mt-2 mb-4 text-sm text-muted">{t("Las tareas quedan ligadas a la reunión del", "Tasks will be linked to the meeting on")} {longDate(meeting.date)}.</p>}

      {!wb ? (
        <FileDrop
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          label={source ? t("Leyendo…", "Reading…") : t("Soltá un CSV o Excel de tareas", "Drop a CSV or Excel file of tasks")}
          onFiles={async ([f]) => {
            setSource({ name: f.name, file: f });
            try {
              load(await readSheet(await f.arrayBuffer(), f.name));
            } catch (e) {
              toast(t(`No pude leer el archivo: ${(e as Error).message}`, `Couldn't read the file: ${(e as Error).message}`), "error");
              setSource(null);
            }
          }}
        />
      ) : (
        <>
          <Section title={`1 · ${source?.name ?? t("Planilla", "Spreadsheet")}`}>
            <div className="flex flex-wrap gap-3 text-sm">
              {wb.sheetNames.length > 1 && (
                <label className="space-y-1">
                  <span className="block text-xs text-muted">{t("Hoja", "Sheet")}</span>
                  <select className="input w-auto" value={sheet} onChange={(e) => (setSheet(e.target.value), setMapping(null))}>
                    {wb.sheetNames.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="space-y-1">
                <span className="block text-xs text-muted">{t("Fila de encabezados", "Header row")}</span>
                <input className="input w-24" type="number" min={1} value={headerRow + 1} onChange={(e) => (setHeaderRow(Math.max(0, Number(e.target.value) - 1)), setMapping(null))} />
              </label>
              <label className="space-y-1">
                <span className="block text-xs text-muted">{t("Proyecto (si la planilla no dice)", "Project (if the sheet doesn't say)")}</span>
                <ProjectSelect value={projectId} onChange={setProjectId} />
              </label>
              <button className="btn-ghost self-end" onClick={() => (setWb(null), setSource(null))}>
                {t("Elegir otro archivo", "Choose another file")}
              </button>
            </div>
          </Section>

          <Section title={t("2 · Qué columna es cada cosa", "2 · Which column is what")}>
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
              <input type="checkbox" checked={skipDone} onChange={(e) => setSkipDone(e.target.checked)} /> {t("No importar las que ya están hechas", "Skip tasks that are already done")}
            </label>
          </Section>

          <Section title={t(`3 · Vista previa · ${mapped.length} para importar${nSkipped ? ` · ${nSkipped} ya existen` : ""}`, `3 · Preview · ${mapped.length} to import${nSkipped ? ` · ${nSkipped} already exist` : ""}`)}>
            {!mapping.title ? (
              <p className="text-sm text-danger">{t("Elegí qué columna es el título.", "Choose which column is the title.")}</p>
            ) : (
              <>
                {(newPeople.length > 0 || newProjects.length > 0) && (
                  <p className="mb-2 text-sm text-muted">
                    {t("Se van a crear", "Will create")}
                    {newPeople.length > 0 && ` ${newPeople.length} ${t("personas", "people")} (${newPeople.join(", ")})`}
                    {newPeople.length > 0 && newProjects.length > 0 && t(" y", " and")}
                    {newProjects.length > 0 && ` ${newProjects.length} ${t("proyectos", "projects")} (${newProjects.join(", ")})`}.
                  </p>
                )}
                <div className="card overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-soft text-left text-muted">
                      <tr>
                        {["", t("Título", "Title"), t("Responsable", "Assignee"), t("Fecha", "Date"), t("Estado", "Status"), t("Prioridad", "Priority"), t("Proyecto", "Project")].map((h) => (
                          <th key={h} className="px-3 py-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rows.slice(0, 200).map((task, i) => {
                        const dup = dups[i];
                        const on = !dup || (dup.kind === "parecida" && includeSimilar.has(i));
                        return (
                        <tr key={i} className={on ? "" : "text-muted"}>
                          <td className="px-3 py-1.5">
                            <input
                              type="checkbox"
                              checked={on}
                              disabled={dup?.kind === "igual"}
                              title={dup ? `${t("Ya existe", "Already exists")}: ${dup.title}` : t("Importar", "Import")}
                              onChange={(e) => {
                                const s = new Set(includeSimilar);
                                if (e.target.checked) s.add(i);
                                else s.delete(i);
                                setIncludeSimilar(s);
                              }}
                            />
                          </td>
                          <td className="max-w-80 px-3 py-1.5">
                            <span className={on ? "" : "line-through"}>{task.title}</span>
                            {dup && (
                              <span className="block text-[11px] text-danger">
                                {dup.kind === "igual" ? t("Ya existe", "Already exists") : t("Parece la misma que", "Looks like the same as")}: {dup.title}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5">{task.assignee ?? t("Yo", "Me")}</td>
                          <td className="whitespace-nowrap px-3 py-1.5">{task.due_date ? humanDate(task.due_date) : "—"}</td>
                          <td className="px-3 py-1.5">{STATUS_LABEL[task.status]}</td>
                          <td className="px-3 py-1.5">{PRIORITY_LABEL[task.priority]}</td>
                          <td className="px-3 py-1.5">{task.project ?? projects.find((p) => p.id === projectId)?.name ?? "—"}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {rows.length > 200 && <p className="mt-1 text-xs text-muted">{t(`Mostrando 200 de ${rows.length}.`, `Showing 200 of ${rows.length}.`)}</p>}
                {nSkipped > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    {t("Las que ya existen no se importan. Si una marcada como «parecida» es en realidad otra tarea, tildala para importarla igual.", "Tasks that already exist aren't imported. If one marked as “similar” is actually a different task, check it to import it anyway.")}
                  </p>
                )}
              </>
            )}
          </Section>

          <div className="flex flex-wrap items-center gap-3">
            {source?.file && (
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={saveFile} onChange={(e) => setSaveFile(e.target.checked)} /> {t("Guardar la planilla en Archivos", "Save the spreadsheet in Files")}
              </label>
            )}
            <button className="btn-primary ml-auto" disabled={busy || !mapped.length} onClick={confirmImport}>
              {t(`Importar ${mapped.length} tareas`, `Import ${mapped.length} tasks`)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
