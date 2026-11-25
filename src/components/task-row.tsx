"use client";

import { Check, Clock, Repeat, User, ListChecks, ArrowUp, Paperclip } from "lucide-react";
import { useFiles, usePeople, useProjects, useTasks } from "@/lib/db";
import { toggleDone } from "@/lib/actions";
import { humanDate, shortTime, today } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { useLang, t as tr } from "@/lib/i18n";
import { shown } from "@/lib/translation";
import { Languages } from "lucide-react";
import { openTask } from "./open-task";
import { ProjectDot } from "./pickers";

export function Checkbox({ done, onClick, label }: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
        done ? "border-accent bg-accent text-accent-ink" : "border-muted/60 hover:border-accent"
      }`}
    >
      {done && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}

export function TaskRow({
  task,
  showProject = true,
  showDate = true,
  draggable = false,
}: {
  task: Task;
  showProject?: boolean;
  showDate?: boolean;
  draggable?: boolean;
}) {
  const { data: projects } = useProjects();
  const { data: people } = usePeople();
  const { data: tasks } = useTasks();
  const { data: files } = useFiles();
  const nFiles = files.filter((f) => f.task_id === task.id).length;
  const project = projects.find((p) => p.id === task.project_id);
  const person = people.find((p) => p.id === task.assignee_id);
  const subs = tasks.filter((t) => t.parent_id === task.id);
  const subsDone = subs.filter((t) => t.status === "done").length;
  const lang = useLang();
  const view = shown(task, lang);
  const done = task.status === "done";
  const overdue = !done && task.due_date && task.due_date < today();

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => openTask(task.id)}
      className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-soft"
    >
      <Checkbox done={done} onClick={() => toggleDone(task)} label={done ? "Reabrir" : "Completar"} />
      <div className="min-w-0 flex-1">
        <div className={`text-[15px] leading-snug md:text-sm ${done ? "text-muted line-through" : ""}`}>
          {task.priority === "high" && !done && <ArrowUp className="mr-0.5 inline size-3.5 text-danger" />}
          {view.title}
          {view.translated && (
            <span title={`${tr("Original", "Original")}: ${task.title}`} className="ml-1 inline-flex align-middle text-muted">
              <Languages className="size-3" aria-label={tr("Traducida", "Translated")} />
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          {showDate && task.due_date && (
            <span className={overdue ? "font-medium text-danger" : ""}>
              {humanDate(task.due_date)}
              {task.due_time && ` ${shortTime(task.due_time)}`}
            </span>
          )}
          {!showDate && task.due_time && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {shortTime(task.due_time)}
            </span>
          )}
          {task.recurrence && <Repeat className="size-3" aria-label="Se repite" />}
          {showProject && project && (
            <span className="inline-flex items-center gap-1">
              <ProjectDot color={project.color} />
              {project.name}
            </span>
          )}
          {person && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3" />
              {person.name}
            </span>
          )}
          {task.status === "waiting" && <span className="chip">esperando</span>}
          {task.status === "doing" && <span className="chip">en curso</span>}
          {nFiles > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Paperclip className="size-3" />
              {nFiles}
            </span>
          )}
          {view.notes && <span className="max-w-60 truncate">{view.notes.split("\n")[0]}</span>}
          {subs.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-3" />
              {subsDone}/{subs.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TaskList({ tasks, ...rest }: { tasks: Task[] } & Omit<Parameters<typeof TaskRow>[0], "task">) {
  return (
    <div className="-mx-2">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} {...rest} />
      ))}
    </div>
  );
}
