"use client";

import { ArrowRight, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { remove, useTasks } from "@/lib/db";
import { capture, promote } from "@/lib/actions";
import { toast } from "@/lib/toast";
import { Empty, PageHeader } from "@/components/ui";
import { openTask } from "@/components/open-task";

export default function BandejaPage() {
  const { data: tasks } = useTasks();
  const inbox = tasks.filter((t) => t.status === "inbox").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const [v, setV] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("capturar")) input.current?.focus();
  }, []);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Bandeja" />
      <p className="-mt-2 mb-4 text-sm text-muted">Lo que se te cruza, en una línea. Después lo convertís en tarea o lo tachás.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (capture(v)) setV("");
        }}
        className="mb-4"
      >
        <input ref={input} className="input" placeholder="Capturar algo…" value={v} onChange={(e) => setV(e.target.value)} />
      </form>
      {inbox.length === 0 ? (
        <Empty>Bandeja vacía. 🎉</Empty>
      ) : (
        <ul className="card divide-y divide-line">
          {inbox.map((t) => (
            <li key={t.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 text-[15px] md:text-sm">{t.title}</span>
              <button
                className="btn-ghost p-2 text-muted"
                onClick={() => {
                  promote(t);
                  openTask(t.id);
                }}
                aria-label="Convertir y editar"
                title="Convertir y editar"
              >
                <Pencil className="size-4" />
              </button>
              <button
                className="btn-outline px-2.5 py-1.5 text-xs"
                onClick={() => {
                  promote(t);
                  toast("Pasó a Tareas");
                }}
              >
                <ArrowRight className="size-3.5" /> Tarea
              </button>
              <button className="btn-ghost p-2 text-muted" onClick={() => remove("tasks", t.id)} aria-label="Tachar">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
