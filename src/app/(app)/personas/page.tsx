"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { useMembers, usePeople, useProjects, useTasks } from "@/lib/db";
import { today } from "@/lib/dates";
import { Empty, PageHeader, Section } from "@/components/ui";
import { ProjectDot } from "@/components/pickers";
import { openCreate } from "@/components/create-store";
import { Avatar } from "@/components/avatar";
import { t } from "@/lib/i18n";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function PersonasPage() {
  const { data: people } = usePeople();
  const { data: tasks } = useTasks();
  const { data: members } = useMembers();
  const { data: projects } = useProjects();
  const [q, setQ] = useState("");
  const d = today();

  const shown = people.filter((p) => fold(`${p.name} ${p.role ?? ""} ${p.team ?? ""} ${p.email ?? ""}`).includes(fold(q)));
  const teams = new Map<string, typeof shown>();
  const noTeam = t("Sin equipo", "No team");
  for (const p of shown) teams.set(p.team || noTeam, [...(teams.get(p.team || noTeam) ?? []), p]);

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("Personas", "People")}>
        <button className="btn-primary" onClick={() => openCreate({ kind: "person" })}>
          <UserPlus className="size-4" /> {t("Persona", "Person")}
        </button>
      </PageHeader>
      <input className="input mb-4" placeholder={t("Buscar por nombre, rol, equipo o mail", "Search by name, role, team or email")} value={q} onChange={(e) => setQ(e.target.value)} />
      {shown.length === 0 && <Empty>{q ? t("No hay personas con esa búsqueda.", "No people match that search.") : t("No hay personas.", "No people yet.")}</Empty>}
      {[...teams.entries()].map(([team, ps]) => (
        <Section key={team} title={team} count={ps.length}>
          <ul className="card divide-y divide-line">
            {ps.map((p) => {
              const open = tasks.filter((task) => task.assignee_id === p.id && !task.parent_id && task.status !== "done");
              const late = open.filter((task) => task.due_date && task.due_date < d).length;
              const projs = members.filter((m) => m.person_id === p.id).map((m) => projects.find((x) => x.id === m.project_id)).filter(Boolean);
              return (
                <li key={p.id}>
                  <Link href={`/personas/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-soft">
                    <Avatar name={p.name} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                        {p.role && <span>{p.role}</span>}
                        {projs.map((x) => (
                          <span key={x!.id} className="inline-flex items-center gap-1">
                            <ProjectDot color={x!.color} />
                            {x!.name}
                          </span>
                        ))}
                        {p.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="size-3" />
                            {p.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div>{open.length} {t("abiertas", "open")}</div>
                      {late > 0 && <div className="text-danger">{late} {t("vencidas", "overdue")}</div>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
    </div>
  );
}
