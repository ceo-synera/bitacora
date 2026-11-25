"use client";

import Link from "next/link";
import { UserPlus, X } from "lucide-react";
import { insert, remove, useAttendees, useMembers, usePeople } from "@/lib/db";
import { t } from "@/lib/i18n";
import { Avatar } from "./avatar";
import { openCreate } from "./create-store";

/** Quiénes participan en una reunión. Primero se ofrece el equipo del proyecto. */
export function Attendees({ meetingId, projectId }: { meetingId: string; projectId: string | null }) {
  const { data: attendees } = useAttendees();
  const { data: people } = usePeople();
  const { data: members } = useMembers();
  const here = attendees.filter((a) => a.meeting_id === meetingId);
  const hereIds = new Set(here.map((a) => a.person_id));
  const team = members.filter((m) => m.project_id === projectId && !hereIds.has(m.person_id)).map((m) => m.person_id);
  const teamPeople = people.filter((p) => team.includes(p.id));
  const others = people.filter((p) => !hereIds.has(p.id) && !team.includes(p.id));
  const add = (personId: string) => insert("meeting_attendees", { meeting_id: meetingId, person_id: personId });

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <span className="chip py-1 text-sm text-ink">{t("Yo", "Me")}</span>
        {here.map((a) => {
          const p = people.find((x) => x.id === a.person_id);
          if (!p) return null;
          return (
            <span key={a.id} className="group inline-flex items-center gap-1.5 rounded-full bg-soft py-0.5 pl-0.5 pr-2 text-sm">
              <Avatar name={p.name} className="size-6 text-[10px]" />
              <Link href={`/personas/${p.id}`} className="hover:underline">
                {p.name}
              </Link>
              <button className="text-muted hover:text-danger" onClick={() => remove("meeting_attendees", a.id)} aria-label={t("Quitar", "Remove")}>
                <X className="size-3.5" />
              </button>
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {teamPeople.length > 1 && (
          <button className="btn-outline py-1 text-xs" onClick={() => teamPeople.forEach((p) => add(p.id))}>
            {t("Sumar a todo el equipo", "Add the whole team")} ({teamPeople.length})
          </button>
        )}
        {(teamPeople.length > 0 || others.length > 0) && (
          <select className="input w-auto py-1 text-sm" value="" onChange={(e) => e.target.value && add(e.target.value)}>
            <option value="">{t("Sumar a alguien…", "Add someone…")}</option>
            {teamPeople.length > 0 && (
              <optgroup label={t("Equipo del proyecto", "Project team")}>
                {teamPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
            {others.length > 0 && (
              <optgroup label={t("Otras personas", "Other people")}>
                {others.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
        <button
          className="btn-ghost py-1 text-xs"
          onClick={() => openCreate({ kind: "person", defaults: { project_id: projectId }, onCreated: (p) => add(p.id) })}
        >
          <UserPlus className="size-3.5" /> {t("Persona nueva", "New person")}
        </button>
      </div>
    </div>
  );
}

/** Caritas de los asistentes (para listas). */
export function AttendeeFaces({ meetingId }: { meetingId: string }) {
  const { data: attendees } = useAttendees();
  const { data: people } = usePeople();
  const ps = attendees
    .filter((a) => a.meeting_id === meetingId)
    .map((a) => people.find((p) => p.id === a.person_id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  if (!ps.length) return null;
  return (
    <span className="flex -space-x-1.5" title={ps.map((p) => p.name).join(", ")}>
      {ps.slice(0, 5).map((p) => (
        <Avatar key={p.id} name={p.name} className="size-5 text-[9px] ring-2 ring-panel" />
      ))}
      {ps.length > 5 && <span className="pl-2 text-xs text-muted">+{ps.length - 5}</span>}
    </span>
  );
}
