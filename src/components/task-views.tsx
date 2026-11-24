"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { update, usePeople, useTasks } from "@/lib/db";
import { addDaysISO, mondayOf, today } from "@/lib/dates";
import { STATUS_LABEL, type Priority, type Status, type Task } from "@/lib/types";
import { TaskList, TaskRow } from "./task-row";
import { QuickAdd } from "./quick-add";
import { ProjectSelect } from "./pickers";
import { Empty, Section, Tabs } from "./ui";

type View = "lista" | "tablero" | "semana";

/** Las tres vistas de tareas (lista por fecha, tablero por estado, semana), con filtros. */
export function TaskViews({ projectId, storageKey = "tareas" }: { projectId?: string; storageKey?: string }) {
  const { data: all } = useTasks();
  const [view, setView] = useState<View>(() => {
    try {
      return (localStorage.getItem(`vista-${storageKey}`) as View | null) ?? "lista";
    } catch {
      return "lista";
    }
  });
  const [project, setProject] = useState<string | null>(projectId ?? null);
  const [person, setPerson] = useState<string>("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [showDone, setShowDone] = useState(false);

  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(`vista-${storageKey}`, v);
    } catch {}
  };

  const tasks = all.filter(
    (t) =>
      !t.parent_id &&
      t.status !== "inbox" &&
      (!project || t.project_id === project) &&
      (person === "" || (person === "yo" ? !t.assignee_id : t.assignee_id === person)) &&
      (!priority || t.priority === priority),
  );
  const defaults: Partial<Task> = { project_id: project, ...(person && person !== "yo" ? { assignee_id: person } : {}) };

  return (
    <div>
      <Tabs
        value={view}
        onChange={changeView}
        items={[
          { value: "lista", label: "Lista" },
          { value: "tablero", label: "Tablero" },
          { value: "semana", label: "Semana" },
        ]}
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {!projectId && <ProjectSelect value={project} onChange={setProject} emptyLabel="Todos los proyectos" includeArchived className="input w-auto py-1.5" />}
        <PersonFilter value={person} onChange={setPerson} />
        <select className="input w-auto py-1.5" value={priority} onChange={(e) => setPriority(e.target.value as Priority | "")}>
          <option value="">Cualquier prioridad</option>
          <option value="high">Alta</option>
          <option value="normal">Normal</option>
          <option value="low">Baja</option>
        </select>
        {view === "lista" && (
          <label className="flex items-center gap-2 px-2 text-muted">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Ver hechas
          </label>
        )}
      </div>

      {view === "lista" && <ListView tasks={tasks} showDone={showDone} defaults={defaults} showProject={!projectId} />}
      {view === "tablero" && <BoardView tasks={tasks} defaults={defaults} showProject={!projectId} />}
      {view === "semana" && <WeekView tasks={tasks} defaults={defaults} showProject={!projectId} />}
    </div>
  );
}

function PersonFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: people } = usePeople();
  return (
    <select className="input w-auto py-1.5" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Cualquier responsable</option>
      <option value="yo">Yo</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

function ListView({ tasks, showDone, defaults, showProject }: { tasks: Task[]; showDone: boolean; defaults: Partial<Task>; showProject: boolean }) {
  const d = today();
  const week = addDaysISO(d, 7);
  const pending = tasks.filter((t) => t.status !== "done");
  const sortFn = (a: Task, b: Task) =>
    (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || (a.due_time ?? "99").localeCompare(b.due_time ?? "99") || a.sort - b.sort;
  const groups: [string, Task[]][] = [
    ["Vencidas", pending.filter((t) => t.due_date && t.due_date < d)],
    ["Hoy", pending.filter((t) => t.due_date === d)],
    ["Mañana", pending.filter((t) => t.due_date === addDaysISO(d, 1))],
    ["Próximos 7 días", pending.filter((t) => t.due_date && t.due_date > addDaysISO(d, 1) && t.due_date <= week)],
    ["Más adelante", pending.filter((t) => t.due_date && t.due_date > week)],
    ["Sin fecha", pending.filter((t) => !t.due_date)],
  ];
  const done = tasks.filter((t) => t.status === "done").sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));

  return (
    <div>
      <div className="mb-5">
        <QuickAdd defaults={defaults} />
      </div>
      {pending.length === 0 && <Empty>No hay tareas pendientes con estos filtros.</Empty>}
      {groups
        .filter(([, ts]) => ts.length)
        .map(([title, ts]) => (
          <Section key={title} title={title} count={ts.length}>
            <TaskList tasks={ts.sort(sortFn)} showProject={showProject} />
          </Section>
        ))}
      {showDone && done.length > 0 && (
        <Section title="Hechas" count={done.length}>
          <TaskList tasks={done.slice(0, 200)} showProject={showProject} />
        </Section>
      )}
    </div>
  );
}

function DropZone({ onDrop, children, className = "" }: { onDrop: (id: string) => void; children: React.ReactNode; className?: string }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("text/task-id")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/task-id");
        if (id) onDrop(id);
      }}
      className={`${className} ${over ? "ring-2 ring-accent" : ""}`}
    >
      {children}
    </div>
  );
}

const BOARD: Status[] = ["todo", "doing", "waiting", "done"];

function BoardView({ tasks, defaults, showProject }: { tasks: Task[]; defaults: Partial<Task>; showProject: boolean }) {
  const recentDone = (t: Task) => t.status !== "done" || (t.done_at ?? "") >= addDaysISO(today(), -7);
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:px-0">
      {BOARD.map((s) => {
        const col = tasks.filter((t) => t.status === s && recentDone(t)).sort((a, b) => a.sort - b.sort);
        return (
          <DropZone
            key={s}
            onDrop={(id) => update("tasks", id, { status: s, done_at: s === "done" ? new Date().toISOString() : null })}
            className="w-[80vw] shrink-0 snap-start rounded-xl bg-soft p-2 md:w-auto"
          >
            <div className="mb-2 flex items-center justify-between px-1 text-sm font-medium">
              {STATUS_LABEL[s]}
              <span className="text-xs text-muted">{col.length}</span>
            </div>
            <div className="space-y-1.5">
              {col.map((t) => (
                <div key={t.id} className="card">
                  <TaskRow task={t} draggable showProject={showProject} />
                </div>
              ))}
              {s === "done" && <p className="px-1 text-xs text-muted">Últimos 7 días</p>}
            </div>
            {s !== "done" && (
              <div className="mt-2">
                <QuickAdd defaults={{ ...defaults, status: s }} placeholder="Agregar" />
              </div>
            )}
          </DropZone>
        );
      })}
    </div>
  );
}

function WeekView({ tasks, defaults, showProject }: { tasks: Task[]; defaults: Partial<Task>; showProject: boolean }) {
  const [monday, setMonday] = useState(() => mondayOf(today()));
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
  const d = today();
  const noDate = tasks.filter((t) => !t.due_date && t.status !== "done");
  const overdue = tasks.filter((t) => t.due_date && t.due_date < d && t.status !== "done" && monday <= d);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button className="btn-outline p-2" onClick={() => setMonday(addDaysISO(monday, -7))} aria-label="Semana anterior">
          <ChevronLeft className="size-4" />
        </button>
        <button className="btn-outline" onClick={() => setMonday(mondayOf(today()))}>
          Esta semana
        </button>
        <button className="btn-outline p-2" onClick={() => setMonday(addDaysISO(monday, 7))} aria-label="Semana siguiente">
          <ChevronRight className="size-4" />
        </button>
        <span className="ml-2 text-sm text-muted">
          {format(parseISO(monday), "d MMM", { locale: es })} – {format(parseISO(days[6]), "d MMM", { locale: es })}
        </span>
      </div>
      <p className="mb-3 hidden text-xs text-muted md:block">Arrastrá una tarea a un día para cambiarle la fecha.</p>
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const col = tasks
            .filter((t) => t.due_date === day && (t.status !== "done" || day < d || day === d))
            .sort((a, b) => (a.due_time ?? "99").localeCompare(b.due_time ?? "99") || a.sort - b.sort);
          return (
            <DropZone key={day} onDrop={(id) => update("tasks", id, { due_date: day, reminded_at: null })} className={`min-h-24 rounded-xl p-2 ${day === d ? "bg-accent/10" : "bg-soft"}`}>
              <div className={`mb-1 px-1 text-xs font-medium capitalize ${day === d ? "text-accent" : "text-muted"}`}>
                {format(parseISO(day), "EEE d", { locale: es })}
              </div>
              <div className="-mx-1">
                {col.map((t) => (
                  <TaskRow key={t.id} task={t} draggable showDate={false} showProject={showProject} />
                ))}
              </div>
              <div className="mt-1 md:hidden">
                <QuickAdd defaults={{ ...defaults, due_date: day }} placeholder="Agregar" />
              </div>
            </DropZone>
          );
        })}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {overdue.length > 0 && (
          <Section title="Vencidas (arrastralas a un día)" count={overdue.length}>
            <TaskList tasks={overdue} draggable showProject={showProject} />
          </Section>
        )}
        <Section title="Sin fecha" count={noDate.length}>
          {noDate.length ? <TaskList tasks={noDate} draggable showProject={showProject} /> : <Empty>Todas tienen fecha.</Empty>}
        </Section>
      </div>
    </div>
  );
}
