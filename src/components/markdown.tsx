"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { t } from "@/lib/i18n";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-md text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** Markdown editable: muestra el texto formateado y pasa a editar con un toque. */
export function MarkdownField({
  value,
  onChange,
  placeholder,
  rows = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [editing, setEditing] = useState(!value);
  if (editing || !value) {
    return (
      <div>
        <textarea
          className="input font-mono text-sm"
          rows={rows}
          value={value}
          placeholder={placeholder}
          autoFocus={editing && !!value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => value && setEditing(false)}
        />
        <p className="mt-1 text-xs text-muted">{t("Markdown: **negrita**, - listas, [ ] checklist, [texto](link)", "Markdown: **bold**, - lists, [ ] checklist, [text](link)")}</p>
      </div>
    );
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => (e.target as HTMLElement).tagName !== "A" && setEditing(true)}
      onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
      className="cursor-text rounded-lg border border-transparent p-2 hover:border-line"
    >
      <Markdown>{value}</Markdown>
    </div>
  );
}
