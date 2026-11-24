import { describe, expect, it } from "vitest";
import { classifyMeetingPdf } from "@/lib/meeting-pdf";

describe("reconocimiento de los PDF de los lunes", () => {
  it("agenda", () => {
    expect(classifyMeetingPdf("2026-11-23 Agenda AI Funnels Weekly.pdf")).toEqual({ date: "2026-11-23", role: "agenda" });
  });
  it("presentación, con o sin tilde y mayúsculas", () => {
    expect(classifyMeetingPdf("2026-11-16 Presentacion AI Funnels Weekly.pdf")).toEqual({ date: "2026-11-16", role: "presentation" });
    expect(classifyMeetingPdf("2026-11-16 Presentación AI Funnels Weekly.PDF")).toEqual({ date: "2026-11-16", role: "presentation" });
  });
  it("minuta con cualquier texto alrededor", () => {
    expect(classifyMeetingPdf("2026-11-23 Minuta AI Funnels Weekly.pdf")).toEqual({ date: "2026-11-23", role: "minutes" });
    expect(classifyMeetingPdf("2026-11-23 AI Funnels Weekly - Minuta final.pdf")).toEqual({ date: "2026-11-23", role: "minutes" });
  });
  it("ignora los OBSOLETA", () => {
    expect(classifyMeetingPdf("OBSOLETA 2026-11-23 Agenda AI Funnels Weekly.pdf")).toBeNull();
    expect(classifyMeetingPdf("Obsoleta - 2026-11-23 Presentacion AI Funnels Weekly.pdf")).toBeNull();
  });
  it("ignora nombres que no siguen el formato", () => {
    expect(classifyMeetingPdf("Agenda AI Funnels Weekly.pdf")).toBeNull();
    expect(classifyMeetingPdf("2026-11-23 Agenda AI Funnels Weekly.docx")).toBeNull();
    expect(classifyMeetingPdf("2026-11-23 Agenda otra reunión.pdf")).toBeNull();
    expect(classifyMeetingPdf("2026-13-45 Agenda AI Funnels Weekly.pdf")).toBeNull();
  });
});
