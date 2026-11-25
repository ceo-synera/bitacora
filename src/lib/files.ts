"use client";

import { supabase } from "./supabase";
import { t } from "./i18n";
import { insert, remove, snapshot } from "./db";
import type { FileRow } from "./types";

const safe = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "_")
    .slice(-120) || "archivo";

export async function uploadFile(
  file: File,
  meta: { project_id?: string | null; meeting_id?: string | null; task_id?: string | null; role?: FileRow["role"] } = {},
): Promise<FileRow> {
  if (!navigator.onLine) throw new Error(t("Para subir archivos hace falta conexión.", "You need a connection to upload files."));
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error(t("Sesión vencida: volvé a entrar.", "Session expired: sign in again."));
  const id = crypto.randomUUID();
  const path = `${uid}/${meta.project_id ?? "general"}/${id}-${safe(file.name)}`;
  const { error } = await supabase.storage.from("files").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return insert("files", {
    id,
    name: file.name,
    kind: "upload",
    storage_path: path,
    mime: file.type || guessMime(file.name),
    size_bytes: file.size,
    project_id: meta.project_id ?? null,
    meeting_id: meta.meeting_id ?? null,
    task_id: meta.task_id ?? null,
    role: meta.role ?? null,
  });
}

export function addLink(url: string, name: string, meta: { project_id?: string | null; meeting_id?: string | null; task_id?: string | null } = {}) {
  return insert("files", {
    kind: "link",
    url,
    name: name || linkName(url),
    mime: null,
    project_id: meta.project_id ?? null,
    meeting_id: meta.meeting_id ?? null,
    task_id: meta.task_id ?? null,
  });
}

/** Normaliza lo que se pegue como link (le agrega https:// si falta). Devuelve null si no parece un link. */
export function normalizeUrl(raw: string): string | null {
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    return parsed.hostname.includes(".") ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export async function deleteFile(f: FileRow) {
  if (f.kind === "upload" && f.storage_path) {
    await supabase.storage.from("files").remove([f.storage_path]);
  }
  remove("files", f.id);
}

/** Link firmado (vale una hora) para abrir o previsualizar un archivo subido. */
export async function signedUrl(f: FileRow, download = false): Promise<string> {
  if (f.kind === "link") return f.url!;
  const { data, error } = await supabase.storage
    .from("files")
    .createSignedUrl(f.storage_path!, 3600, download ? { download: f.name } : undefined);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export function linkName(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("docs.google.com")) {
      if (u.pathname.includes("/spreadsheets/")) return "Google Sheets";
      if (u.pathname.includes("/document/")) return "Google Docs";
      if (u.pathname.includes("/presentation/")) return "Google Slides";
    }
    if (u.hostname.includes("drive.google.com")) return "Archivo de Drive";
    if (u.hostname.includes("claude.ai")) return "Artefacto de Claude";
    return u.hostname.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}

export function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  return (
    {
      pdf: "application/pdf",
      csv: "text/csv",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
    } as Record<string, string>
  )[ext ?? ""] ?? "application/octet-stream";
}

export type FileKind = "pdf" | "sheet" | "image" | "link" | "other";

export function fileKind(f: FileRow): FileKind {
  if (f.kind === "link") return "link";
  const n = f.name.toLowerCase();
  if (f.mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (/\.(xlsx|xls|csv)$/.test(n) || f.mime?.includes("spreadsheet") || f.mime === "text/csv") return "sheet";
  if (f.mime?.startsWith("image/")) return "image";
  return "other";
}

export function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const filesOf = (meetingId: string) => snapshot("files").filter((f) => f.meeting_id === meetingId);
