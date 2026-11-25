"use client";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect } from "react";
import { persister, queryClient } from "@/lib/db";
import { Toaster } from "./toaster";
import { useLang } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const lang = useLang();
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 30, buster: "v2" }}
    >
      {/* Al cambiar de idioma se vuelve a dibujar todo con los textos nuevos. */}
      <div key={lang} className="contents">
        {children}
        <Toaster />
      </div>
    </PersistQueryClientProvider>
  );
}
