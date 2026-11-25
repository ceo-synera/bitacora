"use client";

import { ArrowRight, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { remove, useTasks } from "@/lib/db";
import { capture, promote } from "@/lib/actions";
import { toast } from "@/lib/toast";
import { Empty, PageHeader } from "@/components/ui";
import { openTask } from "@/components/open-task";
import { getLang, t } from "@/lib/i18n";
import { shown } from "@/lib/translation";

export default function BandejaPage() {
  const { data: tasks } = useTasks();
  const inbox = tasks.filter((task) => task.status === "inbox").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const [v, setV] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("capturar")) input.current?.focus();
  }, []);

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("Bandeja", "Inbox")} />
      <p className="-mt-2 mb-4 text-sm text-muted">{t("Lo que se te cruza, en una línea. Después lo convertís en tarea o lo tachás.", "Whatever comes up, in one line. Later you turn it into a task or cross it off.")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (capture(v)) setV("");
        }}
        className="mb-4"
      >
        <input ref={input} className="input" placeholder={t("Capturar algo…", "Capture something…")} value={v} onChange={(e) => setV(e.target.value)} />
      </form>
      {inbox.length === 0 ? (
        <Empty>{t("Bandeja vacía. 🎉", "Inbox zero. 🎉")}</Empty>
      ) : (
        <ul className="card divide-y divide-line">
          {inbox.map((task) => (
            <li key={task.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 text-[15px] md:text-sm">{shown(task, getLang()).title}</span>
              <button
                className="btn-ghost p-2 text-muted"
                onClick={() => {
                  promote(task);
                  openTask(task.id);
                }}
                aria-label={t("Convertir y editar", "Convert and edit")}
                title={t("Convertir y editar", "Convert and edit")}
              >
                <Pencil className="size-4" />
              </button>
              <button
                className="btn-outline px-2.5 py-1.5 text-xs"
                onClick={() => {
                  promote(task);
                  toast(t("Pasó a Tareas", "Moved to Tasks"));
                }}
              >
                <ArrowRight className="size-3.5" /> {t("Tarea", "Task")}
              </button>
              <button className="btn-ghost p-2 text-muted" onClick={() => remove("tasks", task.id)} aria-label={t("Tachar", "Cross off")}>
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
