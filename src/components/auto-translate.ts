"use client";

import { useEffect, useRef } from "react";
import { mergeLocal, useTasks } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/lib/use-lang";
import { needsTranslation } from "@/lib/translation";

/**
 * Traduce en segundo plano las tareas que están en el otro idioma.
 * Manda tandas de 40 al servidor (que usa Claude) y guarda el resultado en el caché.
 */
export function useAutoTranslate() {
  const lang = useLang();
  const { data: tasks } = useTasks();
  const busy = useRef(false);
  const failed = useRef(new Map<string, number>()); // id -> cuándo falló (para no reintentar enseguida)
  const disabled = useRef(false);

  useEffect(() => {
    if (busy.current || disabled.current || typeof navigator === "undefined" || !navigator.onLine) return;
    const now = Date.now();
    const pending = tasks.filter((t) => t.title && needsTranslation(t, lang) && now - (failed.current.get(t.id) ?? 0) > 5 * 60_000).slice(0, 40);
    if (!pending.length) return;
    busy.current = true;
    let fired = false;
    const timer = setTimeout(async () => {
      fired = true;
      try {
        const { data } = await supabase.auth.getSession();
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
          body: JSON.stringify({ to: lang, ids: pending.map((t) => t.id) }),
        });
        if (res.status === 503) disabled.current = true; // el servidor no tiene la clave de Claude
        if (!res.ok) throw new Error(String(res.status));
        const { results } = (await res.json()) as { results: { id: string; lang: "es" | "en"; translations: object }[] };
        mergeLocal("tasks", results);
        const got = new Set(results.map((r) => r.id));
        pending.filter((t) => !got.has(t.id)).forEach((t) => failed.current.set(t.id, Date.now()));
      } catch {
        pending.forEach((t) => failed.current.set(t.id, Date.now()));
      } finally {
        busy.current = false;
      }
    }, 1500); // espera un poco: si estás escribiendo, no traduce cada letra
    return () => {
      // Si todavía no salió el pedido, se cancela; si ya salió, lo dejamos terminar.
      if (!fired) {
        clearTimeout(timer);
        busy.current = false;
      }
    };
  }, [tasks, lang]);
}
