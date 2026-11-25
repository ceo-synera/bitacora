"use client";

import { PageHeader } from "@/components/ui";
import { NotesList } from "@/components/notes-list";
import { t } from "@/lib/i18n";

export default function NotasPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader title={t("Notas", "Notes")} />
      <NotesList />
    </div>
  );
}
