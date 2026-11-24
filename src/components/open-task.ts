"use client";

import { useSyncExternalStore } from "react";

// Qué tarea está abierta en el panel de edición (global, se abre desde cualquier pantalla).
let openId: string | null = null;
const ls = new Set<() => void>();

export function openTask(id: string | null) {
  openId = id;
  ls.forEach((l) => l());
}

export function useOpenTask() {
  return useSyncExternalStore(
    (cb) => {
      ls.add(cb);
      return () => ls.delete(cb);
    },
    () => openId,
    () => null,
  );
}
