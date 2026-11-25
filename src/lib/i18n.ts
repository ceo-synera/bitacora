
import { useSyncExternalStore } from "react";

/*
 * Idioma de la interfaz (español / inglés).
 * Uso: t("Hoy", "Today"). El idioma se guarda en el dispositivo; al cambiarlo, la app se vuelve a dibujar entera.
 */

export type Lang = "es" | "en";
const KEY = "bitacora-lang";
const ls = new Set<() => void>();

function initial(): Lang {
  if (typeof window === "undefined") return "es";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "es" || v === "en") return v;
  } catch {}
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "es";
}

let lang: Lang = initial();

export function getLang(): Lang {
  return lang;
}

export function setLang(l: Lang) {
  lang = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = l === "es" ? "es-UY" : "en";
  ls.forEach((f) => f());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      ls.add(cb);
      return () => ls.delete(cb);
    },
    () => lang,
    () => "es",
  );
}

/** Texto según el idioma de la interfaz. */
export function t(es: string, en: string): string {
  return lang === "en" ? en : es;
}
