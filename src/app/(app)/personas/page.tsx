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
  for (const p of shown) teams.set(p.team || "Sin equipo", [...(teams.get(p.team || "Sin equipo") ?? []), p]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Personas">
        <button className="btn-primary" onClick={() => openCreate({ kind: "person" })}>
          <UserPlus className="size-4" /> Persona
        </button>
      </PageHeader>
      <input className="input mb-4" placeholder="Buscar por nombre, rol, equipo o mail" value={q} onChange={(e) => setQ(e.target.value)} />
      {shown.length === 0 && <Empty>No hay personas{q ? " con esa búsqueda" : ""}.</Empty>}
      {[...teams.entries()].map(([team, ps]) => (
        <Section key={team} title={team} count={ps.length}>
          <ul className="card divide-y divide-line">
            {ps.map((p) => {
              const open = tasks.filter((t) => t.assignee_id === p.id && !t.parent_id && t.status !== "done");
              const late = open.filter((t) => t.due_date && t.due_date < d).length;
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
                      <div>{open.length} abiertas</div>
                      {late > 0 && <div className="text-danger">{late} vencidas</div>}
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
