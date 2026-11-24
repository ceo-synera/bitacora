"use client";

import { Plus, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { insert } from "@/lib/db";
import type { Task } from "@/lib/types";
import { newTask } from "./create-store";

/** Agrega una tarea en una línea, con los valores por defecto que le pases (proyecto, fecha, reunión…). */
export function QuickAdd({
  defaults = {},
  placeholder = "Nueva tarea",
  autoFocus = false,
}: {
  defaults?: Partial<Task>;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [v, setV] = useState("");
  return (
    <form
      className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 focus-within:border-accent"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.trim()) return;
        insert("tasks", { status: "todo", ...defaults, title: v.trim() });
        setV("");
      }}
    >
      <Plus className="size-4 shrink-0 text-muted" />
      <input
        className="w-full bg-transparent py-2.5 text-base outline-none md:text-sm"
        placeholder={placeholder}
        value={v}
        autoFocus={autoFocus}
        onChange={(e) => setV(e.target.value)}
      />
      <button
        type="button"
        className="-mr-1 shrink-0 rounded-md p-1.5 text-muted hover:bg-soft hover:text-ink"
        title="Con todos los detalles"
        aria-label="Crear con todos los detalles"
        onClick={() => {
          newTask({ status: "todo", ...defaults, title: v.trim() });
          setV("");
        }}
      >
        <SlidersHorizontal className="size-4" />
      </button>
    </form>
  );
}
