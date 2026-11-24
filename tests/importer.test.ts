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
