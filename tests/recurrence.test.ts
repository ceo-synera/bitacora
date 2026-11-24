import { describe, expect, it } from "vitest";
import { nextOccurrence } from "@/lib/recurrence";
import { montevideoInstant, today } from "@/lib/dates";

describe("repeticiones", () => {
  it("diaria", () => expect(nextOccurrence("FREQ=DAILY", "2026-11-24")).toBe("2026-11-25"));
  it("semanal, mismo día de la semana", () => expect(nextOccurrence("FREQ=WEEKLY", "2026-11-23")).toBe("2026-11-30"));
  it("días hábiles saltea el fin de semana", () => expect(nextOccurrence("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", "2026-11-27")).toBe("2026-11-30"));
  it("mensual", () => expect(nextOccurrence("FREQ=MONTHLY", "2026-11-24")).toBe("2026-12-24"));
  it("si estaba atrasada, la próxima es después de hoy", () => expect(nextOccurrence("FREQ=WEEKLY", "2026-11-02", "2026-11-24")).toBe("2026-11-30"));
});

describe("fechas en Uruguay", () => {
  it("hoy en Montevideo aunque en UTC ya sea mañana", () => {
    expect(today(new Date("2026-11-25T02:30:00Z"))).toBe("2026-11-24");
  });
  it("08:00 de Montevideo son las 11:00 UTC", () => {
    expect(montevideoInstant("2026-11-24", "08:00").toISOString()).toBe("2026-11-24T11:00:00.000Z");
  });
});
