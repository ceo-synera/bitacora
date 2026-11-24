"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";

/** Zona para soltar o elegir archivos. */
export function FileDrop({
  onFiles,
  accept,
  label = "Soltá archivos acá o tocá para elegir",
  busy = false,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  label?: string;
  busy?: boolean;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]);
      }}
      className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm text-muted transition ${
        over ? "border-accent bg-accent/5" : "border-line hover:border-muted"
      } ${compact ? "px-3 py-3" : "px-4 py-8"}`}
    >
      <Upload className="size-4" />
      {busy ? "Subiendo…" : label}
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles([...e.target.files]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
