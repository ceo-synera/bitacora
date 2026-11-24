import { TZDate } from "@date-fns/tz";
import { addDays, format, parseISO, differenceInCalendarDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

export const TZ = "America/Montevideo";

/** Fecha de hoy en Uruguay, AAAA-MM-DD. */
export function today(now: Date = new Date()): string {
  return format(new TZDate(now, TZ), "yyyy-MM-dd");
}

/** Hora actual en Uruguay, HH:MM. */
export function nowTime(now: Date = new Date()): string {
  return format(new TZDate(now, TZ), "HH:mm");
}

export function addDaysISO(date: string, n: number): string {
  return format(addDays(parseISO(date), n), "yyyy-MM-dd");
}

/** Lunes de la semana que contiene `date`. */
export function mondayOf(date: string): string {
  return format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function isMonday(date: string): boolean {
  return parseISO(date).getDay() === 1;
}

/** "hoy", "mañana", "ayer", "lun 3 nov", con el año si no es el actual. */
export function humanDate(date: string, ref: string = today()): string {
  const d = differenceInCalendarDays(parseISO(date), parseISO(ref));
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d === -1) return "ayer";
  const sameYear = date.slice(0, 4) === ref.slice(0, 4);
  return format(parseISO(date), sameYear ? "EEE d MMM" : "d MMM yyyy", { locale: es });
}

/** "Martes 24 de noviembre" */
export function longDate(date: string): string {
  const s = format(parseISO(date), "EEEE d 'de' MMMM", { locale: es });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortTime(time: string | null): string {
  return time ? time.slice(0, 5) : "";
}

/** Instante UTC de una fecha y hora de Uruguay. */
export function montevideoInstant(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, 0, TZ).getTime());
}
