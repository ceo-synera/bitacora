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
import { getLang, t } from "@/lib/i18n";
import { shown } from "@/lib/translation";

const open = (task: Task) => !task.parent_id && task.status !== "done" && task.status !== "inbox";
const byTime = (a: Task, b: Task) => (a.due_time ?? "99").localeCompare(b.due_time ?? "99") || a.sort - b.sort;

export default function HoyPage() {
  const { data: tasks } = useTasks();
  const { data: people } = usePeople();
  const d = today();
  const tomorrow = addDaysISO(d, 1);

  const overdue = tasks.filter((task) => open(task) && task.due_date && task.due_date < d && !task.assignee_id).sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  const todays = tasks.filter((task) => open(task) && task.due_date === d && !task.assignee_id && task.status !== "waiting").sort(byTime);
  const waiting = tasks.filter((task) => open(task) && (task.status === "waiting" || task.assignee_id));
  const agenda = tasks.filter((task) => !task.parent_id && task.status !== "done" && task.due_time && (task.due_date === d || task.due_date === tomorrow)).sort((a, b) => (a.due_date! + a.due_time!).localeCompare(b.due_date! + b.due_time!));
  const doneToday = tasks.filter((task) => !task.parent_id && task.status === "done" && task.done_at && task.done_at.slice(0, 10) >= d).length;

  const waitingByPerson = new Map<string, Task[]>();
  for (const task of waiting) {
    // Sin responsable = tuya: la marcaste "Esperando" porque dependés de otro.
    const k = people.find((p) => p.id === task.assignee_id)?.name ?? t("Yo (esperando respuesta)", "Me (awaiting reply)");
    waitingByPerson.set(k, [...(waitingByPerson.get(k) ?? []), task]);
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-muted">{longDate(d)}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Hoy", "Today")}</h1>
      </div>

      {isMonday(d) && <MondayCard date={d} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {overdue.length > 0 && (
            <Section title={t("Vencidas", "Overdue")} count={overdue.length}>
              <TaskList tasks={overdue} />
            </Section>
          )}
          <Section title={t("Para hoy", "Due today")} count={todays.length}>
            {todays.length ? <TaskList tasks={todays} showDate={false} /> : <Empty>{t("Nada para hoy", "Nothing for today")}{doneToday ? t(` · ya completaste ${doneToday}`, ` · ${doneToday} done already`) : ""}.</Empty>}
            <div className="mt-2">
              <QuickAdd defaults={{ due_date: d }} placeholder={t("Agregar para hoy", "Add for today")} />
            </div>
          </Section>
          <Section title={t("Esperando de otros", "Waiting on others")} count={waiting.length}>
            {waiting.length === 0 ? (
              <Empty>{t("No estás esperando nada de nadie.", "You're not waiting on anyone.")}</Empty>
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
          <Section title={t("Con hora · hoy y mañana", "Timed · today and tomorrow")}>
            {agenda.length === 0 ? (
              <Empty>{t("Sin tareas con hora.", "No timed tasks.")}</Empty>
            ) : (
              <ol className="card divide-y divide-line">
                {agenda.map((task) => (
                  <li key={task.id}>
                    <button onClick={() => openTask(task.id)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-soft">
                      <span className="w-14 shrink-0 text-xs text-muted">
                        {task.due_date === tomorrow ? t("mañana", "tomorrow") : ""}
                        <span className="flex items-center gap-1 font-medium text-ink">
                          <Clock className="size-3" />
                          {shortTime(task.due_time)}
                        </span>
                      </span>
                      <span className="text-sm">{shown(task, getLang()).title}</span>
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
        <div className="text-xs font-semibold uppercase tracking-wide text-accent">{t("Reunión de hoy", "Today's meeting")}</div>
        <div className="font-medium">{meeting?.title || "AI Funnels Weekly"}</div>
      </div>
      {agenda && <FileOpenButton file={agenda} icon={<FileText className="size-4" />} label={t("Agenda", "Agenda")} />}
      {pres && <FileOpenButton file={pres} icon={<Presentation className="size-4" />} label={t("Presentación", "Presentation")} primary />}
      {(!agenda || !pres) && (
        <Link href={meeting ? `/reuniones/${meeting.id}` : "/reuniones?subir=1"} className="btn-outline">
          <Upload className="size-4" /> {!agenda && !pres ? t("Subir agenda y presentación", "Upload agenda and presentation") : !agenda ? t("Subir agenda", "Upload agenda") : t("Subir presentación", "Upload presentation")}
        </Link>
      )}
      {meeting && (
        <Link href={`/reuniones/${meeting.id}`} className="btn-ghost">
          {t("Abrir reunión", "Open meeting")}
        </Link>
      )}
    </div>
  );
}
