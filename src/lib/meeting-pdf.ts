export type MeetingPdfRole = "agenda" | "presentation" | "minutes";

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Reconoce los PDF de la reunión de los lunes por su nombre:
 *   "AAAA-MM-DD Agenda AI Funnels Weekly.pdf"
 *   "AAAA-MM-DD Presentacion AI Funnels Weekly.pdf"
 *   "... Minuta ..." (con fecha al principio)
 * Los que empiezan con "OBSOLETA" se ignoran.
 */
export function classifyMeetingPdf(fileName: string): { date: string; role: MeetingPdfRole } | null {
  const name = fileName.trim();
  if (/^obsoleta/i.test(name)) return null;
  if (!/\.pdf$/i.test(name)) return null;
  const m = name.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)\.pdf$/i);
  if (!m) return null;
  const [, date, rest] = m;
  if (Number.isNaN(Date.parse(date))) return null;
  const r = strip(rest);
  if (/^agenda ai funnels weekly$/.test(r)) return { date, role: "agenda" };
  if (/^presentacion ai funnels weekly$/.test(r)) return { date, role: "presentation" };
  if (/\bminuta\b/.test(r)) return { date, role: "minutes" };
  return null;
}

export const ROLE_LABEL: Record<MeetingPdfRole, string> = {
  agenda: "Agenda",
  presentation: "Presentación",
  minutes: "Minuta",
};
