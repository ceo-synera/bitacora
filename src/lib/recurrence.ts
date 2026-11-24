import { RRule } from "rrule";
import { addDaysISO } from "./dates";

export const RECURRENCE_PRESETS: { label: string; value: string | null }[] = [
  { label: "No se repite", value: null },
  { label: "Todos los días", value: "FREQ=DAILY" },
  { label: "Días hábiles", value: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { label: "Todas las semanas", value: "FREQ=WEEKLY" },
  { label: "Cada 2 semanas", value: "FREQ=WEEKLY;INTERVAL=2" },
  { label: "Todos los meses", value: "FREQ=MONTHLY" },
];

export function recurrenceLabel(rule: string | null): string {
  if (!rule) return "No se repite";
  return RECURRENCE_PRESETS.find((p) => p.value === rule)?.label ?? rule;
}

/**
 * Próxima fecha de una tarea que se repite, estrictamente después de `from` (AAAA-MM-DD).
 * La serie arranca en `start` (la fecha de la tarea). Trabaja en días "flotantes" en UTC
 * para no depender de la zona horaria del dispositivo.
 */
export function nextOccurrence(rule: string, start: string, from: string = start): string | null {
  const [y, m, d] = start.split("-").map(Number);
  const opts = RRule.parseString(rule);
  // Si la regla es semanal sin días, toma el día de la semana de `start` (comportamiento de RRULE).
  const r = new RRule({ ...opts, dtstart: new Date(Date.UTC(y, m - 1, d, 12)) });
  const [fy, fm, fd] = (from < start ? start : from).split("-").map(Number);
  const next = r.after(new Date(Date.UTC(fy, fm - 1, fd, 23, 59)), false);
  if (!next) return null;
  return next.toISOString().slice(0, 10);
}

export { addDaysISO };
