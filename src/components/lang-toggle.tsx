"use client";

import { setLang, useLang } from "@/lib/i18n";

/** Botón ES / EN para cambiar el idioma de la interfaz. */
export function LangToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <div className={`flex rounded-lg bg-soft p-0.5 text-xs font-medium ${className}`} role="group" aria-label="Idioma / Language">
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-md px-2 py-1 uppercase ${lang === l ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
