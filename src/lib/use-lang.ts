"use client";

import { useSyncExternalStore } from "react";
import { getLang, subscribeLang, type Lang } from "./i18n";

/** Idioma actual de la interfaz, como hook de React. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, () => "es");
}
