import { describe, expect, it } from "vitest";
import { findByName, guessMapping, mapRows, parseDate, parsePriority, parseStatus } from "@/lib/importer";

describe("importador de planillas", () => {
  it("adivina las columnas por el encabezado", () => {
    expect(guessMapping(["Tarea", "Responsable", "Fecha límite", "Estado", "Notas", "Proyecto"])).toEqual({
      title: "Tarea",
      assignee: "Responsable",
      due_date: "Fecha límite",
      status: "Estado",
      notes: "Notas",
      project: "Proyecto",
    });
    expect(guessMapping(["Title", "Owner", "Due date", "Status"])).toMatchObject({ title: "Title", assignee: "Owner", due_date: "Due date", status: "Status" });
  });

  it("entiende fechas uruguayas, ISO y de Excel", () => {
    expect(parseDate("23/11/2026")).toBe("2026-11-23");
    expect(parseDate("3/2/26")).toBe("2026-02-03");
    expect(parseDate("2026-11-23")).toBe("2026-11-23");
    expect(parseDate("2026-11-23T10:00:00Z")).toBe("2026-11-23");
    expect(parseDate(46349)).toBe("2026-11-23"); // número de serie de Excel
    expect(parseDate(new Date(2026, 10, 23))).toBe("2026-11-23");
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate("cuando se pueda")).toBeNull();
  });

  it("traduce estados y prioridades", () => {
    expect(parseStatus("Hecho")).toBe("done");
    expect(parseStatus("Completada")).toBe("done");
    expect(parseStatus("En curso")).toBe("doing");
    expect(parseStatus("Esperando a Kevin")).toBe("waiting");
    expect(parseStatus("Bloqueado")).toBe("waiting");
    expect(parseStatus("Pendiente")).toBe("todo");
    expect(parseStatus("")).toBe("todo");
    expect(parsePriority("Alta")).toBe("high");
    expect(parsePriority("baja")).toBe("low");
    expect(parsePriority("")).toBe("normal");
  });

  it("convierte filas en tareas y saltea las que no tienen título", () => {
    const rows = [
      { Tarea: "Armar landing", Responsable: "Kevin", Fecha: "25/11/2026", Estado: "En curso", Notas: "v2" },
      { Tarea: "", Responsable: "Elsa" },
      { Tarea: "  Revisar funnels  ", Responsable: "", Fecha: "", Estado: "listo" },
    ];
    const out = mapRows(rows, { title: "Tarea", assignee: "Responsable", due_date: "Fecha", status: "Estado", notes: "Notas" });
    expect(out).toEqual([
      { title: "Armar landing", assignee: "Kevin", due_date: "2026-11-25", status: "doing", priority: "normal", notes: "v2", project: null },
      { title: "Revisar funnels", assignee: null, due_date: null, status: "done", priority: "normal", notes: "", project: null },
    ]);
  });

  it("encuentra personas sin importar tildes ni apellido", () => {
    const people = [{ name: "Kevin" }, { name: "Akash" }, { name: "Rossana" }];
    expect(findByName(people, "kevin")?.name).toBe("Kevin");
    expect(findByName(people, "Kevin P.")?.name).toBe("Kevin");
    expect(findByName(people, "Rossána")?.name).toBe("Rossana");
    expect(findByName(people, "Judith")).toBeUndefined();
  });
});

import { findDuplicate, isMe, type ExistingTask } from "@/lib/importer";

describe("duplicados al importar", () => {
  const existing: ExistingTask[] = [
    { id: "1", title: "Rotar la clave secreta de los callbacks de Darkroom", assignee: "Alex", due_date: null, done: false },
    { id: "2", title: "Integraciones con Circle, Stripe y Telegram", assignee: "Kevin", due_date: null, done: false },
    { id: "3", title: "Revisar las primeras piezas de Kevin", assignee: null, due_date: "2026-11-26", done: false },
    { id: "4", title: "Dar de alta a Akash como Operator", assignee: "Kevin", due_date: null, done: false },
    { id: "5", title: "Cargar los 2 libros con «chingao»", assignee: "Kevin", due_date: "2026-11-26", done: false },
  ];
  const t = (title: string, assignee: string | null, due_date: string | null = null) => ({
    title,
    assignee,
    due_date,
    status: "todo" as const,
    priority: "normal" as const,
    notes: "",
    project: null,
  });

  it("mismo título, sin importar mayúsculas ni tildes", () => {
    expect(findDuplicate(t("dar de alta a akash como operator", "Kevin"), existing)?.kind).toBe("igual");
  });
  it("la misma tarea en inglés", () => {
    expect(findDuplicate(t("Rotate the Darkroom callback secret", "Alex"), existing)?.title).toMatch(/Darkroom/);
    expect(findDuplicate(t("Integrations: Circle, Stripe, Telegram", "Kevin"), existing)?.title).toMatch(/Circle/);
    expect(findDuplicate(t("Give Akash access as Operator", "Kevin"), existing)?.title).toMatch(/Akash/);
    expect(findDuplicate(t('Load the 2 "chingao" books with their original titles', "Kevin", "2026-11-26"), existing)?.title).toMatch(/chingao/);
    expect(findDuplicate(t("Review Kevin's first pieces before they go to Elsa", "Nicolás", "2026-11-26"), existing)?.title).toMatch(/piezas/);
  });
  it("no confunde tareas distintas", () => {
    expect(findDuplicate(t("Approve the brand music", "Alex", "2026-11-27"), existing)).toBeNull();
    expect(findDuplicate(t("Definir rol y tareas de Akash", "Akash"), existing)).toBeNull();
    expect(findDuplicate(t("Rotate the Darkroom callback secret", "Kevin"), existing)).toBeNull(); // otro responsable
    // Caso real (25/11): no la confunde con "Mandar los mensajes a Kevin, Alex, Elsa…" por los nombres.
    const mine = [...existing, { id: "6", title: "Mandar los mensajes a Kevin, Alex, Elsa, Ricardo y Judith", assignee: null, due_date: "2026-11-24", done: true }];
    expect(findDuplicate(t("Forward Elsa's product batches to Kevin", "Nicolás", "2026-11-25"), mine, ["Kevin", "Elsa", "Alex"])).toBeNull();
  });
  it("Nicolás / yo / me son el dueño de la app", () => {
    expect(isMe("Nicolás")).toBe(true);
    expect(isMe("yo")).toBe(true);
    expect(isMe("Kevin")).toBe(false);
  });
});

describe("duplicados: tareas en inglés contra las de la app", () => {
  it("«Role and tasks to be assigned» = «Definir rol y tareas de Akash»", () => {
    const ex: ExistingTask[] = [{ id: "1", title: "Definir rol y tareas de Akash", assignee: "Akash", due_date: null, done: false }];
    const d = findDuplicate({ title: "Role and tasks to be assigned", assignee: "Akash", due_date: null, status: "todo", priority: "normal", notes: "", project: null }, ex, ["Akash"]);
    expect(d?.title).toBe("Definir rol y tareas de Akash");
  });
});
