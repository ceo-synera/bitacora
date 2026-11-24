import { describe, expect, it } from "vitest";
import { morningSummary } from "@/lib/server/notify";

const t = (o: Partial<Parameters<typeof morningSummary>[0][number]>) => ({
  id: Math.random().toString(),
  owner_id: "u",
  title: "x",
  status: "todo",
  due_date: null,
  due_time: null,
  assignee_id: null,
  parent_id: null,
  ...o,
});

describe("aviso de las 08:00", () => {
  it("lista lo de hoy por hora y cuenta las vencidas", () => {
    const s = morningSummary(
      [
        t({ title: "Llamar a Elsa", due_date: "2026-11-24", due_time: "15:00:00" }),
        t({ title: "Weekly", due_date: "2026-11-24", due_time: "09:00:00" }),
        t({ title: "Vieja", due_date: "2026-11-20" }),
        t({ title: "De Kevin", due_date: "2026-11-24", assignee_id: "k" }),
        t({ title: "Hecha", due_date: "2026-11-24", status: "done" }),
      ],
      "2026-11-24",
    );
    expect(s?.title).toBe("Buen día · 2 para hoy");
    expect(s?.body).toBe("Hoy (2): 09:00 Weekly · 15:00 Llamar a Elsa\nVencidas: 1");
  });
  it("sin nada, igual saluda", () => {
    expect(morningSummary([], "2026-11-24")?.body).toMatch(/Nada vence hoy/);
  });
});
