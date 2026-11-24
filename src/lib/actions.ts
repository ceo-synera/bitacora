"use client";

import { insert, snapshot, update } from "./db";
import { nextOccurrence } from "./recurrence";
import { today } from "./dates";
import type { Task } from "./types";

/** Completa (o reabre) una tarea. Si se repite, crea la próxima. */
export function toggleDone(task: Task) {
  if (task.status === "done") {
    update("tasks", task.id, { status: "todo", done_at: null });
    return;
  }
  update("tasks", task.id, { status: "done", done_at: new Date().toISOString() });
  if (task.recurrence && task.due_date) {
    const next = nextOccurrence(task.recurrence, task.due_date, task.due_date < today() ? today() : task.due_date);
    if (next) {
      const copy = insert("tasks", {
        title: task.title,
        notes_md: task.notes_md,
        project_id: task.project_id,
        assignee_id: task.assignee_id,
        priority: task.priority,
        recurrence: task.recurrence,
        due_date: next,
        due_time: task.due_time,
        status: "todo",
      });
      // Las subtareas se copian sin marcar.
      for (const sub of snapshot("tasks").filter((t) => t.parent_id === task.id)) {
        insert("tasks", { title: sub.title, parent_id: copy.id, status: "todo", project_id: task.project_id });
      }
    }
  }
}

/** Convierte un todo de la Bandeja en tarea. */
export function promote(task: Task, patch: Partial<Task> = {}) {
  update("tasks", task.id, { status: "todo", ...patch });
}

/** Captura rápida: una línea a la Bandeja. */
export function capture(title: string) {
  const t = title.trim();
  if (!t) return null;
  return insert("tasks", { title: t, status: "inbox" });
}
