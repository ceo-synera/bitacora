"use client";

import { PageHeader } from "@/components/ui";
import { TaskViews } from "@/components/task-views";

export default function TareasPage() {
  return (
    <div>
      <PageHeader title="Tareas" />
      <TaskViews />
    </div>
  );
}
