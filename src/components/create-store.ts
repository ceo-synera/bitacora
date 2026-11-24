"use client";

import { useSyncExternalStore } from "react";
import type { Person, Project, Task } from "@/lib/types";

/* Qué formulario de "crear" está abierto (se abren desde cualquier pantalla). */

export type CreateState =
  | { kind: "menu" }
  | { kind: "task"; defaults?: Partial<Task> }
  | { kind: "person"; defaults?: Partial<Person> & { project_id?: string | null; project_role?: string }; onCreated?: (p: Person) => void }
  | { kind: "project"; defaults?: Partial<Project>; onCreated?: (p: Project) => void }
  | null;

// Se pueden apilar: por ejemplo, crear una persona desde el formulario de tarea.
let stack: CreateState[] = [];
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());

export function openCreate(s: NonNullable<CreateState>) {
  stack = [...stack.filter((x) => x?.kind !== "menu"), s];
  emit();
}

export function closeCreate() {
  stack = stack.slice(0, -1);
  emit();
}

export function useCreateStack() {
  return useSyncExternalStore(
    (cb) => {
      ls.add(cb);
      return () => ls.delete(cb);
    },
    () => stack,
    () => stack,
  );
}

export const newTask = (defaults?: Partial<Task>) => openCreate({ kind: "task", defaults });
