"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";
import { addLink } from "@/lib/files";
import { Dialog } from "./ui";

/** Guarda un link (Drive, Google Sheets, artefacto de Claude, lo que sea). */
export function AddLinkButton({ meta = {} }: { meta?: { project_id?: string | null; meeting_id?: string | null } }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  return (
    <>
      <button className="btn-outline" onClick={() => setOpen(true)}>
        <Link2 className="size-4" /> Link
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Guardar un link">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            let u = url.trim();
            if (!u) return;
            if (!/^https?:\/\//.test(u)) u = `https://${u}`;
            addLink(u, name.trim(), meta);
            setUrl("");
            setName("");
            setOpen(false);
          }}
        >
          <input className="input" type="url" inputMode="url" placeholder="https://docs.google.com/…" value={url} onChange={(e) => setUrl(e.target.value)} autoFocus required />
          <input className="input" placeholder="Nombre (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
          <p className="text-xs text-muted">Links de Drive, Google Sheets o artefactos de Claude se abren en una pestaña nueva; no se copia el contenido.</p>
          <button className="btn-primary w-full">Guardar</button>
        </form>
      </Dialog>
    </>
  );
}
