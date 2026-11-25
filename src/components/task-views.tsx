"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { update, usePeople, useTasks } from "@/lib/db";
import { addDaysISO, fmt, mondayOf, today } from "@/lib/dates";
import { t } from "@/lib/i18n";
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
    (task) =>
      !task.parent_id &&
      task.status !== "inbox" &&
      (!project || task.project_id === project) &&
      (person === "" || (person === "yo" ? !task.assignee_id : task.assignee_id === person)) &&
      (!priority || task.priority === priority),
  );
  const defaults: Partial<Task> = { project_id: project, ...(person && person !== "yo" ? { assignee_id: person } : {}) };

  return (
    <div>
      <Tabs
        value={view}
        onChange={changeView}
        items={[
          { value: "lista", label: t("Lista", "List") },
          { value: "tablero", label: t("Tablero", "Board") },
          { value: "semana", label: t("Semana", "Week") },
        ]}
      />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {!projectId && <ProjectSelect value={project} onChange={setProject} emptyLabel={t("Todos los proyectos", "All projects")} includeArchived className="input w-auto py-1.5" />}
        <PersonFilter value={person} onChange={setPerson} />
        <select className="input w-auto py-1.5" value={priority} onChange={(e) => setPriority(e.target.value as Priority | "")}>
          <option value="">{t("Cualquier prioridad", "Any priority")}</option>
          <option value="high">{t("Alta", "High")}</option>
          <option value="normal">{t("Normal", "Normal")}</option>
          <option value="low">{t("Baja", "Low")}</option>
        </select>
        {view === "lista" && (
          <label className="flex items-center gap-2 px-2 text-muted">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> {t("Ver hechas", "Show done")}
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
      <option value="">{t("Cualquier responsable", "Anyone")}</option>
      <option value="yo">{t("Yo", "Me")}</option>
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
  const pending = tasks.filter((task) => task.status !== "done");
  const sortFn = (a: Task, b: Task) =>
    (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || (a.due_time ?? "99").localeCompare(b.due_time ?? "99") || a.sort - b.sort;
  const groups: [string, Task[]][] = [
    [t("Vencidas", "Overdue"), pending.filter((task) => task.due_date && task.due_date < d)],
    [t("Hoy", "Today"), pending.filter((task) => task.due_date === d)],
    [t("Mañana", "Tomorrow"), pending.filter((task) => task.due_date === addDaysISO(d, 1))],
    [t("Próximos 7 días", "Next 7 days"), pending.filter((task) => task.due_date && task.due_date > addDaysISO(d, 1) && task.due_date <= week)],
    [t("Más adelante", "Later"), pending.filter((task) => task.due_date && task.due_date > week)],
    [t("Sin fecha", "No date"), pending.filter((task) => !task.due_date)],
  ];
  const done = tasks.filter((task) => task.status === "done").sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));

  return (
    <div>
      <div className="mb-5">
        <QuickAdd defaults={defaults} />
      </div>
      {pending.length === 0 && <Empty>{t("No hay tareas pendientes con estos filtros.", "No pending tasks with these filters.")}</Empty>}
      {groups
        .filter(([, ts]) => ts.length)
        .map(([title, ts]) => (
          <Section key={title} title={title} count={ts.length}>
            <TaskList tasks={ts.sort(sortFn)} showProject={showProject} />
          </Section>
        ))}
      {showDone && done.length > 0 && (
        <Section title={t("Hechas", "Done")} count={done.length}>
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
  const recentDone = (task: Task) => task.status !== "done" || (task.done_at ?? "") >= addDaysISO(today(), -7);
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:px-0">
      {BOARD.map((s) => {
        const col = tasks.filter((task) => task.status === s && recentDone(task)).sort((a, b) => a.sort - b.sort);
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
              {col.map((task) => (
                <div key={task.id} className="card">
                  <TaskRow task={task} draggable showProject={showProject} />
                </div>
              ))}
              {s === "done" && <p className="px-1 text-xs text-muted">{t("Últimos 7 días", "Last 7 days")}</p>}
            </div>
            {s !== "done" && (
              <div className="mt-2">
                <QuickAdd defaults={{ ...defaults, status: s }} placeholder={t("Agregar", "Add")} />
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
  const noDate = tasks.filter((task) => !task.due_date && task.status !== "done");
  const overdue = tasks.filter((task) => task.due_date && task.due_date < d && task.status !== "done" && monday <= d);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button className="btn-outline p-2" onClick={() => setMonday(addDaysISO(monday, -7))} aria-label={t("Semana anterior", "Previous week")}>
          <ChevronLeft className="size-4" />
        </button>
        <button className="btn-outline" onClick={() => setMonday(mondayOf(today()))}>
          {t("Esta semana", "This week")}
        </button>
        <button className="btn-outline p-2" onClick={() => setMonday(addDaysISO(monday, 7))} aria-label={t("Semana siguiente", "Next week")}>
          <ChevronRight className="size-4" />
        </button>
        <span className="ml-2 text-sm text-muted">
          {fmt(monday, "d MMM")} – {fmt(days[6], "d MMM")}
        </span>
      </div>
      <p className="mb-3 hidden text-xs text-muted md:block">{t("Arrastrá una tarea a un día para cambiarle la fecha.", "Drag a task to a day to change its date.")}</p>
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const col = tasks
            .filter((task) => task.due_date === day && (task.status !== "done" || day < d || day === d))
            .sort((a, b) => (a.due_time ?? "99").localeCompare(b.due_time ?? "99") || a.sort - b.sort);
          return (
            <DropZone key={day} onDrop={(id) => update("tasks", id, { due_date: day, reminded_at: null })} className={`min-h-24 rounded-xl p-2 ${day === d ? "bg-accent/10" : "bg-soft"}`}>
              <div className={`mb-1 px-1 text-xs font-medium capitalize ${day === d ? "text-accent" : "text-muted"}`}>
                {fmt(day, "EEE d")}
              </div>
              <div className="-mx-1">
                {col.map((task) => (
                  <TaskRow key={task.id} task={task} draggable showDate={false} showProject={showProject} />
                ))}
              </div>
              <div className="mt-1 md:hidden">
                <QuickAdd defaults={{ ...defaults, due_date: day }} placeholder={t("Agregar", "Add")} />
              </div>
            </DropZone>
          );
        })}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {overdue.length > 0 && (
          <Section title={t("Vencidas (arrastralas a un día)", "Overdue (drag them to a day)")} count={overdue.length}>
            <TaskList tasks={overdue} draggable showProject={showProject} />
          </Section>
        )}
        <Section title={t("Sin fecha", "No date")} count={noDate.length}>
          {noDate.length ? <TaskList tasks={noDate} draggable showProject={showProject} /> : <Empty>{t("Todas tienen fecha.", "All have a date.")}</Empty>}
        </Section>
      </div>
    </div>
  );
}
