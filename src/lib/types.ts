import { t } from "./i18n";
import type { Translations } from "./translation";

export type Status = "inbox" | "todo" | "doing" | "waiting" | "done";
export type Priority = "high" | "normal" | "low";

export type Project = {
  id: string;
  owner_id?: string;
  name: string;
  color: string;
  status: "active" | "archived";
  description_md: string;
  created_at: string;
};

export type Person = {
  id: string;
  owner_id?: string;
  name: string;
  email: string | null;
  team: string | null;
  role: string | null;
  phone: string | null;
  notes_md: string;
  created_at: string;
};

export type ProjectMember = {
  id: string;
  owner_id?: string;
  project_id: string;
  person_id: string;
  role: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  owner_id?: string;
  project_id: string | null;
  meeting_id: string | null;
  parent_id: string | null;
  title: string;
  notes_md: string;
  assignee_id: string | null;
  status: Status;
  priority: Priority;
  due_date: string | null; // AAAA-MM-DD
  due_time: string | null; // HH:MM[:SS]
  recurrence: string | null; // RRULE, ej. FREQ=WEEKLY;BYDAY=MO
  sort: number;
  reminded_at?: string | null;
  lang?: "es" | "en" | null;
  translations?: Translations;
  created_at: string;
  updated_at: string;
  done_at: string | null;
};

export type MeetingAttendee = {
  id: string;
  owner_id?: string;
  meeting_id: string;
  person_id: string;
  created_at: string;
};

export type Meeting = {
  id: string;
  owner_id?: string;
  project_id: string | null;
  date: string;
  title: string;
  notes_md: string;
  recording_url: string | null;
  created_at: string;
};

export type Note = {
  id: string;
  owner_id?: string;
  project_id: string | null;
  title: string;
  body_md: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: string;
  owner_id?: string;
  project_id: string | null;
  meeting_id: string | null;
  task_id: string | null;
  name: string;
  kind: "upload" | "link";
  role: "agenda" | "presentation" | "minutes" | null;
  storage_path: string | null;
  url: string | null;
  mime: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type Tables = {
  projects: Project;
  people: Person;
  tasks: Task;
  meetings: Meeting;
  notes: Note;
  files: FileRow;
  project_members: ProjectMember;
  meeting_attendees: MeetingAttendee;
};

export type TableName = keyof Tables;

// Con getters: el texto sale en el idioma de la interfaz en el momento en que se usa.
export const STATUS_LABEL: Record<Status, string> = {
  get inbox() { return t("Bandeja", "Inbox"); },
  get todo() { return t("Por hacer", "To do"); },
  get doing() { return t("En curso", "Doing"); },
  get waiting() { return t("Esperando", "Waiting"); },
  get done() { return t("Hecha", "Done"); },
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  get high() { return t("Alta", "High"); },
  get normal() { return t("Normal", "Normal"); },
  get low() { return t("Baja", "Low"); },
};
export const COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#db2777", "#7c3aed", "#475569"];
