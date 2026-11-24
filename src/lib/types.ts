export type Status = "inbox" | "todo" | "doing" | "waiting" | "done";
export type Priority = "high" | "normal" | "low";

export type Project = {
  id: string;
  owner_id?: string;
  name: string;
  color: string;
  status: "active" | "archived";
  created_at: string;
};

export type Person = {
  id: string;
  owner_id?: string;
  name: string;
  email: string | null;
  team: string | null;
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
  created_at: string;
  updated_at: string;
  done_at: string | null;
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
};

export type TableName = keyof Tables;

export const STATUS_LABEL: Record<Status, string> = {
  inbox: "Bandeja",
  todo: "Por hacer",
  doing: "En curso",
  waiting: "Esperando",
  done: "Hecha",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "Alta",
  normal: "Normal",
  low: "Baja",
};
export const COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#ca8a04", "#ea580c", "#db2777", "#7c3aed", "#475569"];
