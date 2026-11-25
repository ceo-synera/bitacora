import type { Lang } from "./i18n";

export type TaskTranslation = { title: string; notes: string; h: string };
export type Translations = Partial<Record<Lang, TaskTranslation>>;

/** Hash corto (FNV-1a) del texto original: si cambia, la traducción guardada ya no vale. */
export function sourceHash(title: string, notes: string): string {
  let h = 0x811c9dc5;
  const s = `${title}\n${notes}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

type Translatable = { title: string; notes_md: string; lang?: "es" | "en" | null; translations?: Translations | null };

/** ¿Hay que traducir esta tarea al idioma `to`? */
export function needsTranslation(task: Translatable, to: Lang): boolean {
  if (task.lang === to) return false;
  const tr = task.translations?.[to];
  return !tr || tr.h !== sourceHash(task.title, task.notes_md);
}

/** Título y notas para mostrar en el idioma `to` (si hay traducción vigente). */
export function shown(task: Translatable, to: Lang): { title: string; notes: string; translated: boolean } {
  if (task.lang && task.lang !== to) {
    const tr = task.translations?.[to];
    if (tr && tr.h === sourceHash(task.title, task.notes_md)) return { title: tr.title, notes: tr.notes, translated: true };
  }
  return { title: task.title, notes: task.notes_md, translated: false };
}
