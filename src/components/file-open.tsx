"use client";

import Link from "next/link";
import type { FileRow } from "@/lib/types";

/** Botón que abre el visor de un archivo dentro de la app. */
export function FileOpenButton({ file, icon, label, primary = false }: { file: FileRow; icon?: React.ReactNode; label?: string; primary?: boolean }) {
  return (
    <Link href={`/archivos/${file.id}`} className={primary ? "btn-primary" : "btn-outline"}>
      {icon}
      {label ?? file.name}
    </Link>
  );
}
