import { t } from "./i18n";
import { RRule } from "rrule";
import { addDaysISO } from "./dates";

const preset = (es: string, en: string, value: string | null) => ({ get label() { return t(es, en); }, value });

export const RECURRENCE_PRESETS: { label: string; value: string | null }[] = [
  preset("No se repite", "Doesn't repeat", null),
  preset("Todos los días", "Every day", "FREQ=DAILY"),
  preset("Días hábiles", "Weekdays", "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"),
  preset("Todas las semanas", "Every week", "FREQ=WEEKLY"),
  preset("Cada 2 semanas", "Every 2 weeks", "FREQ=WEEKLY;INTERVAL=2"),
  preset("Todos los meses", "Every month", "FREQ=MONTHLY"),
];

export function recurrenceLabel(rule: string | null): string {
  if (!rule) return t("No se repite", "Doesn't repeat");
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
