"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-2xl border border-line bg-panel p-0 text-ink backdrop:bg-black/40 md:m-auto md:rounded-2xl ${
        wide ? "md:max-w-3xl" : "md:max-w-lg"
      }`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="min-w-0 flex-1 font-semibold">{title}</div>
            <button className="btn-ghost p-1.5" onClick={onClose} aria-label="Cerrar">
              <X className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto p-4 pb-safe">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

export function PageHeader({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: React.ReactNode }[];
}) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-soft p-1">
      {items.map((i) => (
        <button
          key={i.value}
          onClick={() => onChange(i.value)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
            value === i.value ? "bg-panel font-medium shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
        {count !== undefined && <span className="rounded-full bg-soft px-1.5 font-normal">{count}</span>}
      </h2>
      {children}
    </section>
  );
}
