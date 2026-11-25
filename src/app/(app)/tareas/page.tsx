"use client";

import { PageHeader } from "@/components/ui";
import { TaskViews } from "@/components/task-views";
import { t } from "@/lib/i18n";

export default function TareasPage() {
  return (
    <div>
      <PageHeader title={t("Tareas", "Tasks")} />
      <TaskViews />
    </div>
  );
}
