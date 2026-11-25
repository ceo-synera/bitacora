"use client";

import Link from "next/link";
import { FileText, Presentation, Upload, Clock } from "lucide-react";
import { useFiles, useMeetings, usePeople, useTasks } from "@/lib/db";
import { addDaysISO, isMonday, longDate, shortTime, today } from "@/lib/dates";
import { TaskList } from "@/components/task-row";
import { QuickAdd } from "@/components/quick-add";
import { Empty, Section } from "@/components/ui";
import { openTask } from "@/components/open-task";
import { FileOpenButton } from "@/components/file-open";
import type { Task } from "@/lib/types";

const open = (t: Task) => !t.parent_id && t.status !== "done" && t.status !== "inbox";
const byTime = (a: Task, b: Task) => (a.due_time ?? "99").localeCompare(b.due_time ?? "99") || a.sort - b.sort;

export default function HoyPage() {
  const { data: tasks } = useTasks();
  const { data: people } = usePeople();
  const d = today();
  const tomorrow = addDaysISO(d, 1);

  const overdue = tasks.filter((t) => open(t) && t.due_date && t.due_date < d && !t.assignee_id).sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  const todays = tasks.filter((t) => open(t) && t.due_date === d && !t.assignee_id && t.status !== "waiting").sort(byTime);
  const waiting = tasks.filter((t) => open(t) && (t.status === "waiting" || t.assignee_id));
  const agenda = tasks.filter((t) => !t.parent_id && t.status !== "done" && t.due_time && (t.due_date === d || t.due_date === tomorrow)).sort((a, b) => (a.due_date! + a.due_time!).localeCompare(b.due_date! + b.due_time!));
  const doneToday = tasks.filter((t) => !t.parent_id && t.status === "done" && t.done_at && t.done_at.slice(0, 10) >= d).length;

  const waitingByPerson = new Map<string, Task[]>();
  for (const t of waiting) {
    // Sin responsable = tuya: la marcaste "Esperando" porque dependés de otro.
    const k = people.find((p) => p.id === t.assignee_id)?.name ?? "Yo (esperando respuesta)";
    waitingByPerson.set(k, [...(waitingByPerson.get(k) ?? []), t]);
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-muted">{longDate(d)}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hoy</h1>
      </div>

      {isMonday(d) && <MondayCard date={d} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {overdue.length > 0 && (
            <Section title="Vencidas" count={overdue.length}>
              <TaskList tasks={overdue} />
            </Section>
          )}
          <Section title="Para hoy" count={todays.length}>
            {todays.length ? <TaskList tasks={todays} showDate={false} /> : <Empty>Nada para hoy{doneToday ? ` · ya completaste ${doneToday}` : ""}.</Empty>}
            <div className="mt-2">
              <QuickAdd defaults={{ due_date: d }} placeholder="Agregar para hoy" />
            </div>
          </Section>
          <Section title="Esperando de otros" count={waiting.length}>
            {waiting.length === 0 ? (
              <Empty>No estás esperando nada de nadie.</Empty>
            ) : (
              [...waitingByPerson.entries()].map(([name, ts]) => (
                <div key={name} className="mb-3">
                  <div className="mb-1 text-sm font-medium">{name}</div>
                  <TaskList tasks={ts} />
                </div>
              ))
            )}
          </Section>
        </div>

        <aside>
          <Section title="Con hora · hoy y mañana">
            {agenda.length === 0 ? (
              <Empty>Sin tareas con hora.</Empty>
            ) : (
              <ol className="card divide-y divide-line">
                {agenda.map((t) => (
                  <li key={t.id}>
                    <button onClick={() => openTask(t.id)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-soft">
                      <span className="w-14 shrink-0 text-xs text-muted">
                        {t.due_date === tomorrow ? "mañana" : ""}
                        <span className="flex items-center gap-1 font-medium text-ink">
                          <Clock className="size-3" />
                          {shortTime(t.due_time)}
                        </span>
                      </span>
                      <span className="text-sm">{t.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}

function MondayCard({ date }: { date: string }) {
  const { data: meetings } = useMeetings();
  const { data: files } = useFiles();
  const meeting = meetings.find((m) => m.date === date);
  const mf = files.filter((f) => meeting && f.meeting_id === meeting.id);
  const agenda = mf.find((f) => f.role === "agenda");
  const pres = mf.find((f) => f.role === "presentation");

  return (
    <div className="card mb-6 flex flex-wrap items-center gap-3 border-accent/40 p-4">
      <div className="mr-auto">
        <div className="text-xs font-semibold uppercase tracking-wide text-accent">Reunión de hoy</div>
        <div className="font-medium">{meeting?.title || "AI Funnels Weekly"}</div>
      </div>
      {agenda && <FileOpenButton file={agenda} icon={<FileText className="size-4" />} label="Agenda" />}
      {pres && <FileOpenButton file={pres} icon={<Presentation className="size-4" />} label="Presentación" primary />}
      {(!agenda || !pres) && (
        <Link href={meeting ? `/reuniones/${meeting.id}` : "/reuniones?subir=1"} className="btn-outline">
          <Upload className="size-4" /> Subir {!agenda && !pres ? "agenda y presentación" : !agenda ? "agenda" : "presentación"}
        </Link>
      )}
      {meeting && (
        <Link href={`/reuniones/${meeting.id}`} className="btn-ghost">
          Abrir reunión
        </Link>
      )}
    </div>
  );
}
