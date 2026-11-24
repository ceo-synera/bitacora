"use client";

import { insert, snapshot } from "./db";
import { classifyMeetingPdf, ROLE_LABEL } from "./meeting-pdf";
import { uploadFile } from "./files";
import type { Meeting } from "./types";

export const WEEKLY_TITLE = "AI Funnels Weekly";

export function culebroId(): string | null {
  return snapshot("projects").find((p) => p.name.trim().toLowerCase() === "culebro")?.id ?? null;
}

/** Busca la reunión de esa fecha (en el proyecto dado) o la crea. */
export function meetingFor(date: string, projectId: string | null = culebroId()): Meeting {
  const found = snapshot("meetings").find((m) => m.date === date && (m.project_id === projectId || !projectId));
  return found ?? insert("meetings", { date, project_id: projectId, title: WEEKLY_TITLE });
}

/**
 * Sube los PDF de los lunes: reconoce agenda, presentación y minuta por el nombre,
 * crea la reunión de esa fecha si no existe y no sube dos veces el mismo archivo.
 * Los que no reconoce se devuelven en `skipped`.
 */
export async function uploadMeetingPdfs(files: File[], forceMeeting?: Meeting) {
  const done: string[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    const info = classifyMeetingPdf(file.name);
    if (!info && !forceMeeting) {
      skipped.push(file.name);
      continue;
    }
    const meeting = forceMeeting ?? meetingFor(info!.date);
    const already = snapshot("files").some((f) => f.meeting_id === meeting.id && f.name === file.name);
    if (already) {
      skipped.push(`${file.name} (ya estaba)`);
      continue;
    }
    await uploadFile(file, { project_id: meeting.project_id, meeting_id: meeting.id, role: info?.role ?? null });
    done.push(info ? `${ROLE_LABEL[info.role]} del ${info.date}` : file.name);
  }
  return { done, skipped };
}
