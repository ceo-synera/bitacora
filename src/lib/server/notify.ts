import "server-only";
import { supabaseAdmin } from "../supabase-admin";
import { montevideoInstant, nowTime, shortTime, today } from "../dates";
import { sendToUser } from "./push";

type T = { id: string; owner_id: string; title: string; status: string; due_date: string | null; due_time: string | null; assignee_id: string | null; parent_id: string | null };

/** Arma el texto del aviso de la mañana. Exportado para testearlo. */
export function morningSummary(tasks: T[], d: string): { title: string; body: string } | null {
  const mine = tasks.filter((t) => !t.parent_id && !t.assignee_id && t.status !== "done" && t.status !== "inbox" && t.status !== "waiting");
  const overdue = mine.filter((t) => t.due_date && t.due_date < d);
  const todays = mine.filter((t) => t.due_date === d).sort((a, b) => (a.due_time ?? "99").localeCompare(b.due_time ?? "99"));
  if (!overdue.length && !todays.length) return { title: "Buen día ☀️", body: "Nada vence hoy. Revisá la Bandeja y planificá." };
  const parts: string[] = [];
  if (todays.length) parts.push(`Hoy (${todays.length}): ${todays.slice(0, 4).map((t) => (t.due_time ? `${shortTime(t.due_time)} ${t.title}` : t.title)).join(" · ")}${todays.length > 4 ? "…" : ""}`);
  if (overdue.length) parts.push(`Vencidas: ${overdue.length}`);
  return { title: `Buen día · ${todays.length} para hoy`, body: parts.join("\n") };
}

/**
 * Lo llama Supabase Cron cada 5 minutos.
 * - 08:00–08:59 de Uruguay: el resumen del día (una vez por día).
 * - Tareas con hora que empiezan en los próximos 10 minutos (una vez por tarea).
 */
export async function runNotifications(now: Date = new Date()) {
  const db = supabaseAdmin();
  const d = today(now);
  const result = { morning: 0, reminders: 0 };

  const { data: tasks, error } = await db
    .from("tasks")
    .select("id, owner_id, title, status, due_date, due_time, assignee_id, parent_id, reminded_at")
    .neq("status", "done")
    .lte("due_date", d);
  if (error) throw new Error(error.message);

  const owners = new Set((tasks ?? []).map((t) => t.owner_id));
  const { data: subOwners } = await db.from("push_subscriptions").select("owner_id");
  (subOwners ?? []).forEach((s) => owners.add(s.owner_id));

  // Resumen de la mañana
  if (nowTime(now) >= "08:00" && nowTime(now) < "09:00") {
    for (const owner of owners) {
      const key = `morning:${d}`;
      const { error: dup } = await db.from("notification_log").insert({ owner_id: owner, key });
      if (dup) continue; // ya se mandó hoy
      const s = morningSummary((tasks ?? []).filter((t) => t.owner_id === owner), d);
      if (s) result.morning += await sendToUser(owner, { ...s, url: "/", tag: key });
    }
  }

  // 10 minutos antes de cada tarea con hora
  for (const t of tasks ?? []) {
    if (t.due_date !== d || !t.due_time || t.reminded_at || t.parent_id) continue;
    const start = montevideoInstant(t.due_date, t.due_time).getTime();
    const mins = (start - now.getTime()) / 60000;
    if (mins > 10 || mins < -5) continue;
    const { data: claimed } = await db
      .from("tasks")
      .update({ reminded_at: now.toISOString() })
      .eq("id", t.id)
      .is("reminded_at", null)
      .select("id");
    if (!claimed?.length) continue;
    result.reminders += await sendToUser(t.owner_id, {
      title: `${shortTime(t.due_time)} · ${t.title}`,
      body: mins > 1 ? `Empieza en ${Math.round(mins)} minutos` : "Empieza ahora",
      url: "/",
      tag: `task:${t.id}`,
    });
  }
  return result;
}
