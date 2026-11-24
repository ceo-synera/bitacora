"use client";

import { PageHeader } from "@/components/ui";
import { NotesList } from "@/components/notes-list";

export default function NotasPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="Notas" />
      <NotesList />
    </div>
  );
}
